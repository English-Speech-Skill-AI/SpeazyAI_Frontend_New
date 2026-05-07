/**
 * Netlify Function - Speech Proxy
 * Proxies requests to the Language Confidence API.
 * Full parity with DigitalOcean speechProxy (scripted/unscripted, expected_text, etc.)
 *
 * To use Azure: deploy the dedicated `azureSpeechProxy` function and point the frontend at it
 * via VITE_SPEECH_PROXY_FUNCTION / VITE_SPEECH_PROXY_URL.
 */

exports.handler = async (event) => {
  const method = event.httpMethod || 'POST';
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigins = ['https://speazyai.netlify.app', 'http://localhost:3000', 'http://127.0.0.1:3000'];
  const isNetlifyPreview = origin.includes('.netlify.app');
  const allowedOrigin = allowedOrigins.includes(origin) || isNetlifyPreview ? origin : 'https://speazyai.netlify.app';

  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, lc-beta-features',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    // ---- 1. GET BODY (Netlify: event.body is raw string) ----
    let body = {};
    const raw = event.body ?? null;

    if (raw != null) {
      if (typeof raw === 'string' && raw.trim()) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = {};
        }
      } else if (typeof raw === 'object') {
        body = raw;
      }
    }

    // Fallback: envelope { body: "{\"audio_base64\":...}" }
    if (!body.audio_base64 && !body.audio_format && body.body) {
      try {
        const inner = typeof body.body === 'string' ? JSON.parse(body.body) : body.body;
        if (inner && (inner.audio_base64 || inner.audio_format)) {
          body = inner;
        }
      } catch (_) {}
    }

    // Strip __ow_* keys if present in body
    const stripped = {};
    for (const [k, v] of Object.entries(body)) {
      if (!k.startsWith('__ow_')) stripped[k] = v;
    }
    body = stripped;

    // ---- 2. BUILD API BODY (endpoint + expected_text for scripted) ----
    const { endpoint: _e, expected_text: expectedText, script, ...rest } = body;
    let apiBody = { ...rest };
    delete apiBody.script;

    // Netlify: query params from event.queryStringParameters
    const query = event.queryStringParameters || {};
    let targetEndpoint =
      query.endpoint ||
      body.endpoint ||
      'https://apis.languageconfidence.ai/speech-assessment/unscripted/uk';
    let isScripted = typeof targetEndpoint === 'string' && targetEndpoint.includes('speech-assessment/scripted');

    if (isScripted && expectedText != null) {
      const textForLength = String(expectedText).trim();
      if (textForLength.length > 300) {
        targetEndpoint = targetEndpoint.replace('/scripted/', '/unscripted/');
        isScripted = false;
      }
    }

    // Scripted: use the field name the API accepts (LC scripted/uk = "expected_text")
    const scriptedTextField = process.env.LC_SCRIPT_FIELD || 'expected_text';
    if (isScripted && expectedText != null && String(expectedText).trim() !== '') {
      let text = typeof expectedText === 'string' ? expectedText : String(expectedText);
      if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
        try {
          const unquoted = JSON.parse(text);
          if (typeof unquoted === 'string') text = unquoted;
        } catch (_) {}
      }
      apiBody[scriptedTextField] = text;
    }

    // For scripted, send only whitelisted fields to avoid upstream 422
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
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Missing required fields: audio_base64, audio_format',
          hint: 'Request body must be JSON with audio_base64 and audio_format. Check that the request reaches the function (e.g. size limits).',
        }),
      };
    }

    // ---- 4. API KEY ----
    const apiKey = process.env.LC_API_KEY || process.env.SPEECH_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'API key not configured' }),
      };
    }

    const beta = event.headers['lc-beta-features'] || event.headers['Lc-Beta-Features'] || 'false';

    // ---- 5. FORWARD TO LANGUAGE CONFIDENCE ----
    const resp = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'lc-beta-features': beta,
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

    if (resp.status === 400 && data?.error && !data?.hint) {
      data.hint = 'Language Confidence API rejected the request. Check audio format (e.g. webm), size, and that expected_text is valid for scripted. Set LC_SCRIPT_FIELD to override the scripted text field name.';
    }

    return {
      statusCode: resp.status,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Proxy failure',
        details: err?.message || 'Server error',
      }),
    };
  }
};
