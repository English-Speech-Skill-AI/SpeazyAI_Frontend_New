/**
 * Netlify Function - Auth Proxy
 * Proxies authentication requests to the backend API.
 * Uses native https module (no fetch) for Node 14/16/18 compatibility.
 */

const https = require('https');

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ statusCode: res.statusCode, body });
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigins = [
    'https://speazyai.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  const isNetlifyPreview = origin.includes('.netlify.app');
  const allowedOrigin = allowedOrigins.includes(origin) || isNetlifyPreview
    ? origin
    : 'https://speazyai.netlify.app';

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    let requestBody = {};
    if (event.body && typeof event.body === 'string' && event.body.trim()) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (parseErr) {
        console.error('Auth proxy: invalid request body', parseErr.message);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: 'Invalid request body' }),
        };
      }
    }

    const targetEndpoint = 'https://api.intelliviq.com/api/auth/login.php';
    const bodyStr = JSON.stringify(requestBody);

    const res = await httpsRequest(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr, 'utf8'),
      },
      body: bodyStr,
    });

    let data;
    try {
      data = res.body && res.body.trim() ? JSON.parse(res.body) : {};
    } catch {
      console.error('Auth proxy: upstream returned non-JSON', res.statusCode, res.body?.slice(0, 200));
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Authentication service returned invalid response',
        }),
      };
    }

    return {
      statusCode: res.statusCode,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Auth proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: error.message || 'An error occurred during authentication',
      }),
    };
  }
};
