exports.handler = async (event) => {
  // Allow requests from Netlify deployment (including preview URLs) and localhost
  const origin = event.headers.origin || event.headers.Origin || "";
  const allowedOrigins = [
    "https://speazyai.netlify.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  const isNetlifyPreview = origin.includes(".netlify.app");
  const allowedOrigin = allowedOrigins.includes(origin) || isNetlifyPreview
    ? origin
    : "https://speazyai.netlify.app";

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

  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    let requestBody = {};
    if (event.body && typeof event.body === "string" && event.body.trim()) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (parseErr) {
        console.error("Auth proxy: invalid request body", parseErr.message);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: "Invalid request body" }),
        };
      }
    }
    const targetEndpoint = "https://api.exeleratetechnology.com/api/auth/login.php";

    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // Upstream returned non-JSON (e.g. HTML error page)
      console.error("Auth proxy: upstream returned non-JSON", response.status, text?.slice(0, 200));
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Authentication service returned invalid response",
        }),
      };
    }

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Auth proxy error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: error.message || "An error occurred during authentication",
      }),
    };
  }
};

