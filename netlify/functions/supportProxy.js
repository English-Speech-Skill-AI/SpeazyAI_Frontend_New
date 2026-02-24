/**
 * Netlify Function - Support Ticket Proxy
 * Accepts JSON body with payload + base64 attachments.
 * Creates Jira Bug, uploads attachments, returns issue key.
 * Jira credentials from env: JIRA_EMAIL, JIRA_API_TOKEN, JIRA_DOMAIN, JIRA_PROJECT_KEY
 * Uses https module (no fetch) for Node 14/16 compatibility.
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

const SENSITIVE_HEADERS = [
  'authorization', 'cookie', 'x-api-key', 'bearer', 'token', 'set-cookie',
];

function sanitizeHar(harJson) {
  try {
    const har = typeof harJson === 'string' ? JSON.parse(harJson) : harJson;
    if (!har.log?.entries) return har;
    for (const entry of har.log.entries) {
      if (entry.request?.headers) {
        entry.request.headers = entry.request.headers.filter((h) => {
          const name = (h.name || '').toLowerCase();
          return !SENSITIVE_HEADERS.some((s) => name.includes(s));
        });
      }
      if (entry.response?.headers) {
        entry.response.headers = entry.response.headers.filter((h) => {
          const name = (h.name || '').toLowerCase();
          return !SENSITIVE_HEADERS.some((s) => name.includes(s));
        });
      }
      if (entry.request?.cookies) entry.request.cookies = [];
    }
    return har;
  } catch (e) {
    return harJson;
  }
}

async function createJiraBug(payload) {
  const {
    projectKey = process.env.JIRA_PROJECT_KEY || 'SUP',
    summary,
    description,
    attachments = [],
  } = payload;

  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;
  const jiraDomain = process.env.JIRA_DOMAIN;

  if (!jiraEmail || !jiraApiToken || !jiraDomain) {
    throw new Error('Jira not configured (JIRA_EMAIL, JIRA_API_TOKEN, JIRA_DOMAIN)');
  }

  const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
  const baseUrl = `https://${jiraDomain}/rest/api/3`;
  const createBody = JSON.stringify({
    fields: {
      project: { key: projectKey },
      summary,
      description: {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
      },
      issuetype: { name: 'Bug' },
    },
  });

  const createRes = await httpsRequest(`${baseUrl}/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(createBody, 'utf8'),
    },
    body: createBody,
  });

  if (createRes.statusCode < 200 || createRes.statusCode >= 300) {
    throw new Error(`Jira create failed: ${createRes.statusCode} - ${createRes.body}`);
  }

  const created = JSON.parse(createRes.body);
  const issueKey = created.key;

  for (const att of attachments) {
    try {
      const buf = Buffer.from(att.data, 'base64');
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
      const mimetype = att.mimetype || 'application/octet-stream';
      const bodyParts = [
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="file"; filename="${(att.name || 'file').replace(/"/g, '\\"')}"\r\n`,
        `Content-Type: ${mimetype}\r\n\r\n`,
      ];
      const bodyBuffer = Buffer.concat([
        Buffer.from(bodyParts.join(''), 'utf8'),
        buf,
        Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
      ]);

      const attRes = await httpsRequest(`${baseUrl}/issue/${issueKey}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'X-Atlassian-Token': 'no-check',
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length.toString(),
        },
        body: bodyBuffer,
      });

      if (attRes.statusCode < 200 || attRes.statusCode >= 300) {
        console.warn('Attachment failed:', att.name, attRes.body);
      }
    } catch (attErr) {
      console.warn('Attachment error:', att.name, attErr);
    }
  }

  return issueKey;
}

function escapeHtml(str) {
  if (str == null || typeof str !== 'string') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSupportEmailHtml({ issueKey, summary, description, userEmail, environment, errors }) {
  const e = escapeHtml;
  const jiraDomain = process.env.JIRA_DOMAIN || '';
  const jiraLink = jiraDomain && issueKey ? `https://${e(jiraDomain)}/browse/${e(issueKey)}` : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Support ticket: ${e(issueKey)}</title></head>
<body style="font-family: -apple-system, sans-serif; line-height: 1.5; color: #1e293b; max-width: 640px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">New support ticket created</h1>
  <p><strong>Jira ticket:</strong> ${e(issueKey)}</p>
  <p><strong>Summary:</strong> ${e(summary)}</p>
  ${userEmail ? `<p><strong>User email:</strong> ${e(userEmail)}</p>` : ''}
  ${jiraLink ? `<p><a href="${jiraLink}">Open in Jira →</a></p>` : ''}
  <h2 style="font-size: 1rem;">Steps to reproduce / description</h2>
  <pre style="background: #f8fafc; padding: 12px; border-radius: 6px; white-space: pre-wrap;">${e(description || '(none)')}</pre>
  ${environment ? `<h2 style="font-size: 1rem;">Browser / environment</h2><pre style="background: #f8fafc; padding: 12px; white-space: pre-wrap;">${e(environment)}</pre>` : ''}
  ${errors ? `<h2 style="font-size: 1rem;">Auto-captured errors</h2><pre style="background: #fef2f2; padding: 12px; white-space: pre-wrap;">${e(errors)}</pre>` : ''}
</body>
</html>`.trim();
}

function getNotifyEmails() {
  const raw = String(process.env.SUPPORT_NOTIFY_EMAILS || '').trim();
  if (!raw) return [];
  return raw
    .split(/[\s,;]+/)
    .map((e) => String(e).trim().toLowerCase())
    .filter((e) => e && e.includes('@') && e.length > 5);
}

async function sendSupportEmail({ issueKey, summary, description, userEmail, environment, errors }) {
  const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
  const fromEmail = (process.env.SUPPORT_EMAIL || 'support@exeleratetechnology.com').trim();
  const toEmails = getNotifyEmails();
  if (!apiKey) {
    console.warn('[supportProxy] SENDGRID_API_KEY not set; skipping support email');
    return;
  }
  if (toEmails.length === 0) {
    console.warn('[supportProxy] SUPPORT_NOTIFY_EMAILS empty or invalid (use comma-separated emails); skipping');
    return;
  }
  const html = buildSupportEmailHtml({ issueKey, summary, description, userEmail, environment, errors });
  const subject = `[Support] ${issueKey} - ${String(summary).slice(0, 60)}`;
  const payload = JSON.stringify({
    personalizations: [{ to: toEmails.map((email) => ({ email })) }],
    from: { email: fromEmail, name: 'Support' },
    subject,
    content: [{ type: 'text/html', value: html }],
  });
  try {
    const res = await httpsRequest('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload, 'utf8'),
      },
      body: payload,
    });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('[supportProxy] Support email sent to', toEmails.length, 'recipient(s)');
    } else {
      console.error('[supportProxy] SendGrid failed:', res.statusCode, res.body || '');
    }
  } catch (err) {
    console.error('[supportProxy] SendGrid error:', err.message || err);
  }
}

exports.handler = async (event) => {
  const method = event.httpMethod || 'POST';
  const requestOrigin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigins = [
    'https://speazyai.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  const isNetlifyPreview = requestOrigin.includes('.netlify.app');
  const allowedOrigin = allowedOrigins.includes(requestOrigin) || isNetlifyPreview ? requestOrigin : 'https://speazyai.netlify.app';

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    let body = {};
    const rawBody = event.body;
    if (rawBody !== undefined && rawBody !== null) {
      body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    }

    const payload = body.payload ?? (body.issueType ? body : null);
    const screenshots = body.screenshots ?? [];
    const screenRecording = body.screenRecording ?? null;
    const harFile = body.harFile ?? null;

    if (!payload) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
        },
        body: JSON.stringify({ success: false, error: 'Missing payload' }),
      };
    }

    const {
      issueType,
      pageUrl,
      whatTryingToDo,
      whatActuallyHappened,
      errorMessage,
      userEmail,
      chatTranscript,
      technicalInfoText,
      capturedErrorsText,
    } = payload;

    if (!issueType || !pageUrl || !whatTryingToDo || !whatActuallyHappened) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
        },
        body: JSON.stringify({ success: false, error: 'Missing required fields' }),
      };
    }

    const summary = `[Support] ${issueType} - ${String(pageUrl).slice(0, 60)}`;
    const descriptionParts = [
      '## Chat Transcript',
      chatTranscript || '(none)',
      '',
      '## Steps to Reproduce',
      `1. User was trying to: ${whatTryingToDo}`,
      `2. What happened: ${whatActuallyHappened}`,
      errorMessage ? `3. Error message: ${errorMessage}` : '',
      '',
      technicalInfoText || '',
      '',
      capturedErrorsText ? '## Auto-Captured Errors' : '',
      capturedErrorsText || '',
    ];
    const description = descriptionParts.filter(Boolean).join('\n');

    const attachments = [];
    for (const s of screenshots) {
      if (s?.data) attachments.push({ name: s.name || 'screenshot.png', data: s.data, mimetype: s.mimetype || 'image/png' });
    }
    if (screenRecording?.data) {
      attachments.push({
        name: screenRecording.name || 'recording.webm',
        data: screenRecording.data,
        mimetype: screenRecording.mimetype || 'video/webm',
      });
    }
    if (harFile?.data) {
      const harContent = Buffer.from(harFile.data, 'base64').toString('utf8');
      const sanitized = sanitizeHar(harContent);
      attachments.push({
        name: (harFile.name || 'network.har').replace(/\.har$/i, '-sanitized.har'),
        data: Buffer.from(JSON.stringify(sanitized)).toString('base64'),
        mimetype: 'application/json',
      });
    }

    const issueKey = await createJiraBug({ summary, description, attachments });

    await sendSupportEmail({
      issueKey,
      summary,
      description,
      userEmail: userEmail || undefined,
      environment: technicalInfoText || undefined,
      errors: capturedErrorsText || undefined,
    }).catch((err) => console.error('[supportProxy] Email error:', err.message));

    const jiraUrl = `https://${process.env.JIRA_DOMAIN}/browse/${issueKey}`;
    console.log(`[Support] Created ${issueKey} for ${userEmail || 'anonymous'}. ${jiraUrl}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
      },
      body: JSON.stringify({ success: true, issueKey }),
    };
  } catch (err) {
    console.error('Support proxy error:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
      },
      body: JSON.stringify({
        success: false,
        error: err.message || 'Failed to create support ticket',
      }),
    };
  }
};
