exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigins = ['https://speazyai.netlify.app', 'http://localhost:3000', 'http://127.0.0.1:3000'];
  const isNetlifyPreview = origin.includes('.netlify.app');
  const allowedOrigin = allowedOrigins.includes(origin) || isNetlifyPreview ? origin : 'https://speazyai.netlify.app';

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  try {
    // Get PDF URL from query parameter
    const pdfUrl = event.queryStringParameters?.url;

    if (!pdfUrl) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
        },
        body: JSON.stringify({ error: "PDF URL is required" }),
      };
    }

    // Fetch the PDF from the source
    const response = await fetch(pdfUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
        },
        body: JSON.stringify({ error: `Failed to fetch PDF: ${response.statusText}` }),
      };
    }

    // Get the PDF as array buffer
    const pdfBuffer = await response.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // Return the PDF with proper headers
    // Note: isBase64Encoded tells Netlify to decode the base64 before sending
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=3600",
      },
      body: pdfBase64,
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("PDF Proxy error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

