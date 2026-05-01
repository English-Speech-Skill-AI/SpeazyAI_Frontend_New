exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigins = ['https://speazyai.netlify.app', 'https://englishskill.intelliviq.com', 'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];
  const isNetlifyPreview = origin.includes('.netlify.app') || origin.includes('intelliviq.com');
  const allowedOrigin = allowedOrigins.includes(origin) || isNetlifyPreview ? origin : 'https://englishskill.intelliviq.com';

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { pdf_base64, extracted_text, prompt, pdf_page_image } = body;

    // Single page image (stays under 1 MB limit)
    if (pdf_page_image && typeof pdf_page_image === "string") {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return {
          statusCode: 500,
          headers: { "Access-Control-Allow-Origin": allowedOrigin, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "OpenAI API key not configured" }),
        };
      }
      const dataUrl = pdf_page_image.startsWith("data:") ? pdf_page_image : `data:image/jpeg;base64,${pdf_page_image}`;
      const visionPrompt = "Extract all text from this image. Return only the extracted text, preserving the original structure and order. Do not add any commentary or explanation.";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiApiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: [{ type: "text", text: visionPrompt }, { type: "image_url", image_url: { url: dataUrl } }] }],
          max_tokens: 4000,
          temperature: 0,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error("Vision error:", errText.slice(0, 300));
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": allowedOrigin, "Content-Type": "application/json" },
          body: JSON.stringify({ text: "" }),
        };
      }
      const data = await response.json();
      const pageText = data.choices?.[0]?.message?.content?.trim() || "";
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": allowedOrigin, "Content-Type": "application/json" },
        body: JSON.stringify({ text: pageText }),
      };
    }

    // If we have extracted_text, process it with ChatGPT
    if (extracted_text) {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return {
          statusCode: 500,
          headers: {
            "Access-Control-Allow-Origin": allowedOrigin,
          },
          body: JSON.stringify({ error: "OpenAI API key not configured" }),
        };
      }

      const processingPrompt = prompt || 
        `Please extract only the main content text from the following PDF text. Exclude chapter titles, unit titles, headers, page numbers, image captions, and any other structural elements. Only return the paragraph content (the actual story text or body content). Do not include titles like "Unit 1", "Chapter X", or section headers. Return only the paragraph text without any commentary:\n\n${extracted_text.substring(0, 100000)}`;

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
            {
              role: "user",
              content: processingPrompt,
            },
          ],
          max_tokens: 4000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API Error:", errorText);
        // Return the raw extracted text if ChatGPT processing fails
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ text: extracted_text }),
        };
      }

      const data = await response.json();
      const processedText = data.choices?.[0]?.message?.content || extracted_text;

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ text: processedText }),
      };
    }

    // When pdf_page_images is provided (image-based PDF), use ChatGPT Vision to extract text
    const pdf_page_images = body.pdf_page_images;
    if (pdf_page_images && Array.isArray(pdf_page_images) && pdf_page_images.length > 0) {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return {
          statusCode: 500,
          headers: { "Access-Control-Allow-Origin": allowedOrigin },
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
          console.error("Vision error:", errText.slice(0, 300));
          continue;
        }

        const data = await response.json();
        const pageText = data.choices?.[0]?.message?.content?.trim() || "";
        if (pageText) allTexts.push(pageText);
      }

      const combinedText = allTexts.join("\n\n").trim();
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({
          text: combinedText,
          ...(combinedText ? {} : { error: "Could not extract text from PDF images" }),
        }),
      };
    }

    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": allowedOrigin },
      body: JSON.stringify({ 
        error: "Please send extracted_text or pdf_page_images for processing" 
      }),
    };
  } catch (error) {
    console.error("PDF Extract Proxy error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

