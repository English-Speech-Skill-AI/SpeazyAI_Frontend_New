// DigitalOcean Serverless Function - PDF Extract Proxy
// POST { extracted_text, prompt } → process with ChatGPT → return { text }
// POST { pdf_page_image } → single page image (base64/data URL) → Vision API → return { text }
// POST { pdf_page_images } → array of page images → Vision API (legacy, may hit 413)
//
// CORS: Do NOT set Access-Control-* headers here. DigitalOcean platform adds them.
// If we add them too, the response gets multiple values and the browser blocks.

function parseBody(event) {
  let body = {};

  const raw = event?.__ow_body ?? event?.http?.body ?? event?.body ?? null;
  if (raw != null) {
    let str = raw;
    if (event?.__ow_isBase64Encoded && typeof raw === "string") {
      try {
        str = Buffer.from(raw, "base64").toString("utf8");
      } catch {
        str = raw;
      }
    }
    if (typeof str === "string" && str.trim()) {
      try {
        body = JSON.parse(str);
      } catch (e) {
        console.error("pdfExtractProxy JSON parse error:", e?.message, "| raw length:", typeof str === "string" ? str.length : 0);
        body = {};
      }
    } else if (typeof str === "object") {
      body = str;
    }
  }

  // Fallback: DO may merge body params as top-level event keys
  if (!body.extracted_text && !body.pdf_page_image && (event?.extracted_text != null || event?.pdf_page_image != null)) {
    body = {
      ...body,
      extracted_text: body.extracted_text ?? event.extracted_text,
      prompt: body.prompt ?? event.prompt,
      pdf_base64: body.pdf_base64 ?? event.pdf_base64,
      pdf_page_image: body.pdf_page_image ?? event.pdf_page_image,
      pdf_page_images: body.pdf_page_images ?? event.pdf_page_images,
    };
  }

  // Fallback: nested event.http.body when it's an object
  if (event?.http?.body && typeof event.http.body === "object") {
    const hb = event.http.body;
    if (!body.extracted_text && hb.extracted_text) body.extracted_text = hb.extracted_text;
    if (!body.pdf_page_image && hb.pdf_page_image) body.pdf_page_image = hb.pdf_page_image;
    if (!body.pdf_page_images && hb.pdf_page_images) body.pdf_page_images = hb.pdf_page_images;
    if (!body.prompt && hb.prompt) body.prompt = hb.prompt;
  }

  // Fallback: envelope { body: "{\"pdf_page_image\":...}" }
  if (!body.pdf_page_image && !body.extracted_text && body.body) {
    try {
      const inner = typeof body.body === "string" ? JSON.parse(body.body) : body.body;
      if (inner && (inner.pdf_page_image || inner.extracted_text)) {
        body = { ...body, ...inner };
      }
    } catch (_) {}
  }

  // Fallback: event itself may have body params at top level (DO App Platform)
  if (!body.pdf_page_image && event?.pdf_page_image) body.pdf_page_image = event.pdf_page_image;
  if (!body.extracted_text && event?.extracted_text) body.extracted_text = event.extracted_text;

  return body;
}

export async function main(event) {
  const method = event?.__ow_method ?? event?.http?.method ?? event?.method ?? "POST";

  if (method === "OPTIONS") {
    return { statusCode: 204 };
  }

  try {
    const body = parseBody(event);
    const { extracted_text, prompt, pdf_base64, pdf_page_image, pdf_page_images } = body;

    // Debug: log what we received (without sensitive data)
    const hasImage = !!(pdf_page_image || (pdf_page_images && pdf_page_images.length > 0));
    const hasText = !!(extracted_text && extracted_text.length > 0);
    if (!hasImage && !hasText) {
      console.log("pdfExtractProxy: body keys:", Object.keys(body).join(", "), "| raw __ow_body type:", typeof event?.__ow_body, "| http.body type:", typeof event?.http?.body);
    }

    if (extracted_text) {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "OpenAI API key not configured" }),
        };
      }

      const defaultPrompt = `Please extract only the main content text from the following PDF text. Exclude chapter titles, unit titles, headers, page numbers, image captions, and any other structural elements. Only return the paragraph content (the actual story text or body content). Do not include titles like "Unit 1", "Chapter X", or section headers. Return only the paragraph text without any commentary:\n\n`;
      const processingPrompt = (prompt && String(prompt).trim()) || defaultPrompt + extracted_text.substring(0, 100000);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that extracts main content text from PDF files. Extract only paragraph content, excluding chapter titles, unit titles, headers, page numbers, image captions, and structural elements. Return only the story or body text without any titles or headers.",
            },
            { role: "user", content: processingPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("pdfExtractProxy OpenAI error:", errText.slice(0, 500));
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: extracted_text }),
        };
      }

      const data = await response.json();
      const processedText = data.choices?.[0]?.message?.content || extracted_text;

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: processedText }),
      };
    }

    // Single page image (stays under 1 MB limit)
    if (pdf_page_image && typeof pdf_page_image === "string") {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "OpenAI API key not configured" }),
        };
      }
      const dataUrl = pdf_page_image.startsWith("data:") ? pdf_page_image : `data:image/jpeg;base64,${pdf_page_image}`;
      const visionPrompt = "Extract all text from this image. Return only the extracted text, preserving the original structure and order. Do not add any commentary or explanation.";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: visionPrompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error("pdfExtractProxy Vision error:", errText.slice(0, 300));
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "" }),
        };
      }
      const data = await response.json();
      const pageText = data.choices?.[0]?.message?.content?.trim() || "";
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pageText }),
      };
    }

    // Legacy: multiple page images (may hit 413 for large PDFs)
    if (pdf_page_images && Array.isArray(pdf_page_images) && pdf_page_images.length > 0) {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "OpenAI API key not configured" }),
        };
      }

      const visionPrompt = "Extract all text from this image. Return only the extracted text, preserving the original structure and order. Do not add any commentary or explanation.";
      const allTexts = [];

      for (let i = 0; i < pdf_page_images.length; i++) {
        const imgBase64 = pdf_page_images[i];
        const dataUrl = typeof imgBase64 === "string" && imgBase64.startsWith("data:")
          ? imgBase64
          : `data:image/png;base64,${imgBase64}`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: visionPrompt },
                  {
                    type: "image_url",
                    image_url: { url: dataUrl },
                  },
                ],
              },
            ],
            max_tokens: 4000,
            temperature: 0,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("pdfExtractProxy Vision error:", errText.slice(0, 300));
          continue;
        }

        const data = await response.json();
        const pageText = data.choices?.[0]?.message?.content?.trim() || "";
        if (pageText) allTexts.push(pageText);
      }

      const combinedText = allTexts.join("\n\n").trim();
      if (!combinedText) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "", error: "Could not extract text from PDF images" }),
        };
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combinedText }),
      };
    }

    if (pdf_base64) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Please send extracted_text or pdf_page_image for processing",
        }),
      };
    }

    const bodyKeys = Object.keys(body);
    console.error("pdfExtractProxy: missing extracted_text/pdf_page_image. Body keys:", bodyKeys.join(", "), "| __ow_body:", typeof event?.__ow_body, "| http.body:", typeof event?.http?.body);
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "extracted_text or pdf_page_image is required",
        hint: "POST JSON body with { extracted_text: string } or { pdf_page_image: string }.",
        debug: bodyKeys.length ? { received_keys: bodyKeys } : { raw_body_type: typeof event?.__ow_body || typeof event?.http?.body },
      }),
    };
  } catch (err) {
    console.error("pdfExtractProxy error:", err);
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
