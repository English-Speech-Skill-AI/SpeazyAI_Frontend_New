// DigitalOcean Serverless Function - PDF Proxy
// GET ?url=... - Proxies PDF fetches to avoid CORS
// POST (multipart/form-data) - Proxies PDF uploads to api.intelliviq.com/upload-pdf
//
// CORS: Do NOT set Access-Control-* headers here. DigitalOcean platform adds them.
// If we add them too, the response gets multiple values (e.g. "*, https://...") and the browser blocks.

function parseQuery(q) {
  if (q == null) return {};
  if (typeof q === "object" && !Array.isArray(q)) return q;
  const str = typeof q === "string" ? q : String(q);
  const out = {};
  for (const part of str.split("&")) {
    const i = part.indexOf("=");
    const k = i >= 0 ? decodeURIComponent(part.slice(0, i).replace(/\+/g, " ")) : decodeURIComponent(part.replace(/\+/g, " "));
    const v = i >= 0 ? decodeURIComponent((part.slice(i + 1) || "").replace(/\+/g, " ")) : "";
    if (k) out[k] = v;
  }
  return out;
}

export async function main(event) {
  const method = event?.__ow_method ?? event?.http?.method ?? event?.method ?? "GET";

  if (method === "OPTIONS") {
    return { statusCode: 204 };
  }

  try {
    // ---- POST: Upload PDF (forward to api.intelliviq.com/upload-pdf) ----
    if (method === "POST") {
      let rawBody = event?.__ow_body ?? event?.http?.body ?? event?.body ?? null;
      if (rawBody == null) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: false, error: "Missing request body" }),
        };
      }

      let bodyBuffer;
      if (event?.__ow_isBase64Encoded && typeof rawBody === "string") {
        bodyBuffer = Buffer.from(rawBody, "base64");
      } else if (typeof rawBody === "string") {
        bodyBuffer = Buffer.from(rawBody, "utf8");
      } else if (Buffer.isBuffer(rawBody)) {
        bodyBuffer = rawBody;
      } else {
        bodyBuffer = Buffer.from(JSON.stringify(rawBody), "utf8");
      }

      const contentType = (event?.__ow_headers || event?.http?.headers || event?.headers || {})["content-type"] ||
        (event?.__ow_headers || event?.http?.headers || event?.headers || {})["Content-Type"] ||
        "multipart/form-data";

      const response = await fetch("https://api.intelliviq.com/upload-pdf", {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          "Content-Length": bodyBuffer.length.toString(),
        },
        body: bodyBuffer,
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseData = { raw: responseText };
      }

      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: typeof responseData === "object" ? JSON.stringify(responseData) : responseText,
      };
    }

    // ---- GET: Fetch PDF by URL ----
    const query = parseQuery(event?.__ow_query ?? event?.http?.query ?? event?.query);
    let pdfUrl = query.url ?? query.URL ?? event?.url ?? event?.URL;
    if (!pdfUrl && event?.http?.url) {
      try {
        const u = new URL(event.http.url);
        pdfUrl = u.searchParams.get("url") ?? u.searchParams.get("URL");
      } catch (_) {}
    }

    if (!pdfUrl || typeof pdfUrl !== "string" || !pdfUrl.trim()) {
      const keys = Object.keys(event || {}).filter((k) => !k.startsWith("__ow") || k === "__ow_query");
      const qs = typeof event?.__ow_query === "string" ? event.__ow_query.slice(0, 200) : String(event?.__ow_query ?? "");
      console.error("pdfProxy: missing url. Query keys:", Object.keys(query).join(", "), "| event.url:", !!event?.url, "| __ow_query snippet:", qs || "(none)", "| event keys:", keys.join(", "));
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "PDF URL is required",
          hint: "Use GET ?url=<encoded-pdf-url>. Check function logs for received query.",
        }),
      };
    }

    const url = pdfUrl.trim();
    console.log("pdfProxy: fetching", url.slice(0, 80) + (url.length > 80 ? "..." : ""));

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; pdfProxy/1.0)" },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `Failed to fetch PDF: ${response.status} ${response.statusText}`,
        }),
      };
    }

    const pdfBuffer = await response.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=3600",
      },
      body: pdfBase64,
      binary: true,
    };
  } catch (err) {
    console.error("pdfProxy error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Proxy failure",
        details: err?.message || "Server error",
      }),
    };
  }
}
