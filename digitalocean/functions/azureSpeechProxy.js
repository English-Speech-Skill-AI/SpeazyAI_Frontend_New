// =====================================================================
//  DigitalOcean Functions — Azure Speech pronunciation assessment proxy
//  Single file, NO external npm dependencies (uses built-in `fetch` + `Buffer`).
//  Paste this whole file into the DO Functions source editor and save.
// =====================================================================
//
//  ENV VARS (DO Functions → Settings → Environment):
//    SPEECH_KEY              Azure key (aliases: AZURE_SPEECH_KEY, Key)
//    SPEECH_REGION           Azure region short name, e.g. "eastus2"
//                            (aliases: AZURE_SPEECH_REGION, AZURE_REGION, Region)
//    AZURE_SPEECH_LANGUAGE   optional, e.g. "en-US" (default "en-US")
//
//  FUNCTION LIMITS:
//    Timeout:  ≥ 30 seconds  (DO default of 1s will fail every time)
//    Memory:   ≥ 256 MB
//
//  REQUEST shape (same as the existing speechProxy):
//    POST /azureSpeechProxy
//      Body: { audio_base64, audio_format, expected_text? }
//      audio_format ∈ { "webm", "ogg", "wav", "mp3" }   (Chrome records "webm")
//      Optional query ?endpoint=...speech-assessment/scripted/uk
//        ↳ the substring "scripted" is the only thing the function looks at,
//          to know it should treat expected_text as the reference passage.
//
//  HEALTH CHECK (no audio, no Azure call):
//    GET  /azureSpeechProxy?mode=info
//    POST /azureSpeechProxy { "mode": "info" }
// =====================================================================

const SHORT_AUDIO_PATH = "/speech/recognition/conversation/cognitiveservices/v1";

const FORMAT_TO_CONTENT_TYPE = {
  webm: "audio/webm; codecs=opus",
  ogg: "audio/ogg; codecs=opus",
  wav: "audio/wav; codecs=audio/pcm; samplerate=16000",
  mp3: "audio/mpeg",
};

function getKey() {
  return String(
    process.env.SPEECH_KEY ||
      process.env.AZURE_SPEECH_KEY ||
      process.env.Key ||
      ""
  ).trim();
}

function getRegion() {
  return String(
    process.env.SPEECH_REGION ||
      process.env.AZURE_SPEECH_REGION ||
      process.env.AZURE_REGION ||
      process.env.Region ||
      ""
  ).trim();
}

function getLanguage() {
  return String(process.env.AZURE_SPEECH_LANGUAGE || "en-US").trim();
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function readQuery(event) {
  let q = event?.__ow_query ?? event?.http?.query ?? event?.query ?? {};
  if (typeof q === "string") {
    const out = {};
    for (const part of q.split("&")) {
      const i = part.indexOf("=");
      const k =
        i >= 0
          ? decodeURIComponent(part.slice(0, i).replace(/\+/g, " "))
          : decodeURIComponent(part.replace(/\+/g, " "));
      const v =
        i >= 0
          ? decodeURIComponent((part.slice(i + 1) || "").replace(/\+/g, " "))
          : "";
      if (k) out[k] = v;
    }
    q = out;
  }
  return q || {};
}

function readBody(event) {
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

  // DO sometimes flattens body into top-level event keys
  if (
    !body.audio_base64 &&
    !body.audio_format &&
    (event.audio_base64 || event.audio_format)
  ) {
    body = {
      audio_base64: event.audio_base64,
      audio_format: event.audio_format,
      ...(event.expected_text != null && { expected_text: event.expected_text }),
      ...(event.endpoint != null && { endpoint: event.endpoint }),
      ...(event.mode != null && { mode: event.mode }),
    };
  }

  // Envelope { body: "{...}" }
  if (!body.audio_base64 && !body.audio_format && body.body) {
    try {
      const inner = typeof body.body === "string" ? JSON.parse(body.body) : body.body;
      if (inner && (inner.audio_base64 || inner.audio_format || inner.mode)) {
        body = inner;
      }
    } catch (_) {}
  }

  // Strip OpenWhisk meta-keys
  const stripped = {};
  for (const [k, v] of Object.entries(body)) {
    if (!k.startsWith("__ow_")) stripped[k] = v;
  }
  return stripped;
}

function envInfo() {
  return {
    SPEECH_KEY: !!getKey(),
    SPEECH_REGION: getRegion() || null,
    AZURE_SPEECH_LANGUAGE: getLanguage(),
  };
}

function buildPronunciationHeader(referenceText) {
  // Azure REST API short-audio Pronunciation Assessment ALWAYS requires ReferenceText.
  // Empty string is treated as "no scoring" — caller must provide actual text.
  return Buffer.from(
    JSON.stringify({
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive",
      EnableMiscue: "True",
    }),
    "utf8"
  ).toString("base64");
}

async function postToAzure({ audio, contentType, key, region, language, paHeader }) {
  const url =
    `https://${region}.stt.speech.microsoft.com${SHORT_AUDIO_PATH}` +
    `?language=${encodeURIComponent(language)}&format=detailed`;

  const headers = {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": contentType,
    Accept: "application/json",
  };
  if (paHeader) headers["Pronunciation-Assessment"] = paHeader;

  const resp = await fetch(url, { method: "POST", headers, body: audio });
  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: resp.status, json };
}

// Two-pass: REST API can only score against a known reference text.
// - SCRIPTED (caller has expected_text): single call with that as ReferenceText.
// - UNSCRIPTED (no expected_text): recognize first, then re-send same audio
//   with the recognized DisplayText as ReferenceText so Azure scores it.
async function callAzure({ audioBase64, audioFormat, referenceText, key, region, language }) {
  const fmt = String(audioFormat || "webm").toLowerCase();
  const contentType = FORMAT_TO_CONTENT_TYPE[fmt];
  if (!contentType) {
    throw new Error(
      `Unsupported audio_format "${fmt}". Supported: ${Object.keys(FORMAT_TO_CONTENT_TYPE).join(", ")}.`
    );
  }
  const audio = Buffer.from(audioBase64, "base64");
  if (!audio.length) throw new Error("audio_base64 decoded to 0 bytes");

  if (referenceText && referenceText.trim()) {
    return postToAzure({
      audio,
      contentType,
      key,
      region,
      language,
      paHeader: buildPronunciationHeader(referenceText.trim()),
    });
  }

  // Unscripted — pass 1: recognition only.
  const recog = await postToAzure({ audio, contentType, key, region, language });
  if (recog.status >= 400) return recog;

  const displayText = recog.json?.DisplayText || recog.json?.displayText || "";
  const cleaned = String(displayText).replace(/[.!?]+$/g, "").trim();
  if (!cleaned) return recog; // nothing recognized — return as-is, scores stay null.

  // Pass 2: same audio + recognized text as reference for scoring.
  const scored = await postToAzure({
    audio,
    contentType,
    key,
    region,
    language,
    paHeader: buildPronunciationHeader(cleaned),
  });
  if (scored.status >= 400) return recog; // fall back to recognition result if PA pass errors.

  // Keep the original DisplayText (Azure usually returns same text again, but be safe).
  if (scored.json && !scored.json.DisplayText && displayText) {
    scored.json.DisplayText = displayText;
  }
  return scored;
}

function mapAzureToLcShape(azure, { isScripted, expectedText, audioFormat }) {
  const recStatus = azure?.RecognitionStatus || azure?.recognitionStatus || "Unknown";
  const displayText = azure?.DisplayText || azure?.displayText || "";
  const nbest = azure?.NBest?.[0] || azure?.nbest?.[0] || {};
  const pa = nbest.PronunciationAssessment || nbest.pronunciationAssessment || {};
  const wordsRaw = nbest.Words || nbest.words || [];

  const accuracy = pa.AccuracyScore ?? null;
  const fluencyScore = pa.FluencyScore ?? null;
  const completeness = pa.CompletenessScore ?? null;
  const pron = pa.PronScore ?? null;
  const overall = pron ?? accuracy ?? null;

  const words = wordsRaw.map((w) => {
    const wpa = w.PronunciationAssessment || w.pronunciationAssessment || {};
    const phonemes = (w.Phonemes || w.phonemes || []).map((p) => {
      const ppa = p.PronunciationAssessment || p.pronunciationAssessment || {};
      return {
        phoneme: p.Phoneme || p.phoneme || "",
        phoneme_score: ppa.AccuracyScore ?? null,
      };
    });
    return {
      word_text: w.Word || w.word || "",
      word_score: wpa.AccuracyScore ?? null,
      error_type: wpa.ErrorType ?? "None",
      phonemes,
    };
  });

  const out = {
    pronunciation: {
      overall_score: pron,
      ...(isScripted && expectedText ? { expected_text: expectedText } : {}),
      words,
    },
    fluency: {
      overall_score: fluencyScore,
      metrics: {
        speech_rate: null,
        pauses: null,
        filler_words: null,
      },
      feedback: {},
    },
    overall: {
      overall_score: overall,
      english_proficiency_scores: {
        mock_ielts: { prediction: null },
        mock_cefr: { prediction: null },
        mock_pte: { prediction: null },
      },
    },
    warnings: [],
    metadata: {
      provider: "azure",
      recognition_status: recStatus,
      predicted_text: displayText,
      content_relevance: 0,
      audio_format: audioFormat,
      ...(isScripted && expectedText ? { reference_text: expectedText } : {}),
    },
    // Flat aliases used by IELTS evaluation fallback path
    pronunciation_score: pron,
    fluency_score: fluencyScore,
    overall_score: overall,
  };

  if (isScripted) {
    out.reading = {
      accuracy: accuracy != null ? accuracy / 100 : null,
      completion: completeness != null ? completeness / 100 : null,
      accuracy_score: accuracy,
      completeness_score: completeness,
    };
  }

  return out;
}

export async function main(event) {
  const method = event?.__ow_method || event?.http?.method || event?.method || "POST";
  if (method === "OPTIONS") return { statusCode: 204 };

  try {
    const query = readQuery(event);
    const body = readBody(event);

    // -- Diagnostic mode -------------------------------------------------
    if (method === "GET" || query.mode === "info" || body.mode === "info") {
      return jsonResponse(200, {
        function: "azureSpeechProxy",
        node_version: process.version,
        platform: `${process.platform}/${process.arch}`,
        env: envInfo(),
        usage:
          'POST { "audio_base64": "<base64>", "audio_format": "webm|ogg|wav|mp3", "expected_text": "<optional>" }',
      });
    }

    // -- Validate config -------------------------------------------------
    const key = getKey();
    const region = getRegion();
    const language = getLanguage();

    if (!key || !region) {
      return jsonResponse(500, {
        error: "Missing Azure config",
        details:
          "Set SPEECH_KEY and SPEECH_REGION (e.g. 'eastus2') as environment variables on the function.",
        env: envInfo(),
      });
    }

    // -- Validate request -----------------------------------------------
    if (!body.audio_base64 || !body.audio_format) {
      return jsonResponse(400, {
        error: "Missing required fields: audio_base64, audio_format",
        hint:
          'POST JSON: { "audio_base64": "<base64 bytes>", "audio_format": "webm|ogg|wav|mp3", "expected_text": "<optional>" }',
      });
    }

    // -- Scripted vs unscripted detection (matches existing speechProxy) -
    const targetEndpoint =
      query.endpoint || body.endpoint || event.endpoint || "";
    let isScripted =
      typeof targetEndpoint === "string" &&
      targetEndpoint.includes("speech-assessment/scripted");

    let referenceText = "";
    if (isScripted && body.expected_text != null) {
      let text = String(body.expected_text);
      if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
        try {
          const unquoted = JSON.parse(text);
          if (typeof unquoted === "string") text = unquoted;
        } catch (_) {}
      }
      // Auto-fallback to unscripted for very long passages
      if (text.trim().length > 300) isScripted = false;
      else referenceText = text;
    }

    // -- Call Azure -----------------------------------------------------
    const { status, json: azureJson } = await callAzure({
      audioBase64: body.audio_base64,
      audioFormat: body.audio_format,
      referenceText,
      key,
      region,
      language,
    });

    if (status >= 400) {
      console.error("[azureSpeechProxy] Azure error", status, JSON.stringify(azureJson).slice(0, 800));
      return jsonResponse(502, {
        error: "Azure Speech REST returned " + status,
        azure_status: status,
        azure_response: azureJson,
        hint:
          status === 401
            ? "Auth failed. Check SPEECH_KEY and that SPEECH_REGION matches the key's region."
            : status === 400
            ? "Bad request. Often this is the audio format (Content-Type) not matching the bytes."
            : undefined,
      });
    }

    const lcShaped = mapAzureToLcShape(azureJson, {
      isScripted,
      expectedText: referenceText,
      audioFormat: body.audio_format,
    });

    const verbose =
      String(process.env.AZURE_SPEECH_PROXY_VERBOSE_LOGGING ?? "true").toLowerCase() !== "false";
    if (verbose) {
      console.log(
        "[azureSpeechProxy] LC-shaped response:\n" + JSON.stringify(lcShaped, null, 2)
      );
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lcShaped),
    };
  } catch (err) {
    console.error("[azureSpeechProxy] error:", err?.message || err);
    return jsonResponse(500, {
      error: "Azure speech proxy failure",
      details: err?.message || String(err),
    });
  }
}
