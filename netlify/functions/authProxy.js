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

  try {
    const requestBody = event.body ? JSON.parse(event.body) : {};
    
    // Target API endpoint
    const targetEndpoint = "https://api.exeleratetechnology.com/api/auth/login.php";

    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Auth proxy error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": allowedOrigin },
      body: JSON.stringify({ 
        success: false,
        message: error.message || "An error occurred during authentication"
      }),
    };
  }
};

