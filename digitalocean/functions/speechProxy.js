// DigitalOcean Serverless Function - Speech Proxy
// Proxies requests to the Language Confidence API.
// To use Azure instead, point the frontend at the dedicated `azureSpeechProxy` function;
// that switch is configured via env (see VITE_SPEECH_PROXY_FUNCTION / VITE_SPEECH_PROXY_URL).

function parseDoQuery(event) {
  let query = event?.__ow_query ?? event?.http?.query ?? event?.query ?? {};
  if (typeof query === "string") {
    const q = {};
    for (const p of query.split("&")) {
      const i = p.indexOf("=");
      const k = i >= 0 ? decodeURIComponent(p.slice(0, i).replace(/\+/g, " ")) : decodeURIComponent(p.replace(/\+/g, " "));
      const v = i >= 0 ? decodeURIComponent((p.slice(i + 1) || "").replace(/\+/g, " ")) : "";
      if (k) q[k] = v;
    }
    query = q;
  }
  return query || {};
}

function speechProxyInfoBody() {
  const key = String(process.env.LC_API_KEY || process.env.SPEECH_API_KEY || "").trim();
  return JSON.stringify({
    function: "speechProxy",
    lcApiKeyConfigured: Boolean(key),
    hint: "If the client sees { code, error: \"There was an error processing your request.\" }, that is the DigitalOcean gateway (crash, cold-start, timeout, or memory). Raise function timeout (≥30s), memory (≥256MB), then check Activations/Logs.",
  });
}

export async function main(event) {
  const method = event?.__ow_method || event?.http?.method || event?.method || "POST";

  if (method === "OPTIONS") {
    return { statusCode: 204 };
  }

  const inHeaders = event?.__ow_headers || event?.http?.headers || event?.headers || {};

  try {
    const query = parseDoQuery(event);

    // No audio — confirms the function loads (contrast with DO gateway JSON on crash/timeout).
    if (method === "GET" && (query.mode === "info" || query.health === "1")) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: speechProxyInfoBody(),
      };
    }

    // ---- 1. GET BODY (handle all DO/OpenWhisk variants) ----
    let body = {};
    let raw = event?.__ow_body ?? event?.http?.body ?? event?.body ?? null;

    if (raw != null) {
      if (event?.__ow_isBase64Encoded && typeof raw === "string") {
        try {
          raw = Buffer.from(raw, "base64").toString("utf8");
        } catch {
          raw = null;
        }
      }
      if (typeof raw === "string" && raw.trim()) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = {};
        }
      } else if (typeof raw === "object") {
        body = raw;
      }
    }

    // Fallback: DO sometimes merges body params as top-level event keys
    if (!body.audio_base64 && !body.audio_format && (event.audio_base64 || event.audio_format)) {
      body = {
        audio_base64: event.audio_base64,
        audio_format: event.audio_format,
        ...(event.expected_text != null && { expected_text: event.expected_text }),
      };
    }

    // Fallback: nested http.body when it's an object with audio fields
    if (!body.audio_base64 && !body.audio_format && event?.http?.body && typeof event.http.body === "object") {
      if (event.http.body.audio_base64 || event.http.body.audio_format) {
        body = { ...event.http.body };
      }
    }

    // Fallback: envelope { body: "{\"audio_base64\":...}" }
    if (!body.audio_base64 && !body.audio_format && body.body) {
      try {
        const inner = typeof body.body === "string" ? JSON.parse(body.body) : body.body;
        if (inner && (inner.audio_base64 || inner.audio_format)) {
          body = inner;
        }
      } catch (_) {}
    }

    // Strip __ow_* keys if present in body
    const stripped = {};
    for (const [k, v] of Object.entries(body)) {
      if (!k.startsWith("__ow_")) stripped[k] = v;
    }
    body = stripped;

    if (body.mode === "info") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: speechProxyInfoBody(),
      };
    }

    // ---- 2. BUILD API BODY (endpoint + expected_text for scripted) ----
    const { endpoint: _e, expected_text: expectedText, script, ...rest } = body;
    let apiBody = { ...rest };
    delete apiBody.script;

    // Endpoint can be in query (URL), in body, or at top-level event (DO may merge params)
    let targetEndpoint =
      query.endpoint ||
      body.endpoint ||
      event.endpoint ||
      "https://apis.languageconfidence.ai/speech-assessment/unscripted/uk";
    let isScripted = typeof targetEndpoint === "string" && targetEndpoint.includes("speech-assessment/scripted");

    // Rule: only switch from scripted -> unscripted when expected_text is > 300 chars
    if (isScripted && expectedText != null) {
      const textForLength = String(expectedText).trim();
      if (textForLength.length > 300) {
        targetEndpoint = targetEndpoint.replace("/scripted/", "/unscripted/");
        isScripted = false;
      }
    }

    // Scripted: use the field name the API accepts (LC scripted/uk = "expected_text"; set LC_SCRIPT_FIELD to override)
    const scriptedTextField = process.env.LC_SCRIPT_FIELD || "expected_text";
    if (isScripted && expectedText != null && String(expectedText).trim() !== "") {
      let text = typeof expectedText === "string" ? expectedText : String(expectedText);
      if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
        try {
          const unquoted = JSON.parse(text);
          if (typeof unquoted === "string") text = unquoted;
        } catch (_) {}
      }
      apiBody[scriptedTextField] = text;
    }

    // For scripted, send only whitelisted fields to avoid upstream 422 "Extra inputs are not permitted"
    if (isScripted) {
      apiBody = {
        audio_base64: apiBody.audio_base64,
        audio_format: apiBody.audio_format,
        ...(apiBody[scriptedTextField] != null && { [scriptedTextField]: apiBody[scriptedTextField] }),
      };
    }

    // ---- 3. VALIDATE ----
    if (!apiBody.audio_base64 || !apiBody.audio_format) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing required fields: audio_base64, audio_format",
          hint: "Request body must be JSON with audio_base64 and audio_format. Check that the request reaches the function (e.g. size limits).",
        }),
      };
    }

    // ---- 4. API KEY ----
    const apiKey = process.env.LC_API_KEY || process.env.SPEECH_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key not configured" }),
      };
    }

    const beta = inHeaders["lc-beta-features"] || inHeaders["Lc-Beta-Features"] || "false";

    // ---- 5. FORWARD TO LANGUAGE CONFIDENCE ----
    const resp = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        "lc-beta-features": beta,
      },
      body: JSON.stringify(apiBody),
    });

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    // If upstream 400, add a hint so we can distinguish from our validation 400
    if (resp.status === 400 && data?.error && !data?.hint) {
      data.hint = "Language Confidence API rejected the request. Check audio format (e.g. webm), size, and that expected_text is valid for scripted. Set LC_SCRIPT_FIELD to override the scripted text field name.";
    }

    // Return body as JSON string so the client always gets { statusCode, body: "..." } and can JSON.parse(body) for full assessment (reading, metadata, etc.) regardless of platform serialization
    return {
      statusCode: resp.status,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Proxy failure",
        details: err?.message || "Server error",
      }),
    };
  }
}
