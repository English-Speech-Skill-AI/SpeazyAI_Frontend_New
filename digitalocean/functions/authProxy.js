// DigitalOcean Serverless Function - Auth Proxy
// This function proxies authentication requests to your backend API

export async function main(event) {
  // DigitalOcean Functions event structure
  const method = event.http?.method || event.method || 'POST';
  const headers = event.http?.headers || event.headers || {};
  const body = event.http?.body ? (typeof event.http.body === 'string' ? JSON.parse(event.http.body) : event.http.body) : (event.body || {});
  
  // CORS: Determine allowed origin (single value only)
  const requestOrigin = headers.origin || headers.Origin || "";
  const productionOrigin = process.env.ALLOWED_ORIGIN || "https://exeleratetechnology.com";
  
  // Check if origin is allowed
  let allowedOrigin = productionOrigin; // Default to production
  
  if (requestOrigin) {
    // Allow localhost for development
    if (requestOrigin === "http://localhost:3000" || requestOrigin === "http://127.0.0.1:3000") {
      allowedOrigin = requestOrigin;
    }
    // Allow DigitalOcean App Platform URLs (*.ondigitalocean.app)
    else if (requestOrigin.includes(".ondigitalocean.app")) {
      allowedOrigin = requestOrigin;
    }
    // Allow exact production domain match
    else if (requestOrigin === productionOrigin) {
      allowedOrigin = requestOrigin;
    }
  }
  
  // NEVER return "*" - always return a specific origin

  // Handle CORS preflight
  if (method === "OPTIONS") {
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
    const requestBody = body || {};
    
    // Target API endpoint
    const targetEndpoint = "https://api.intelliviq.com/api/auth/login.php";

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
}
