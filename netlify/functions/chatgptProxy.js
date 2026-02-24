/**
 * Netlify Function - ChatGPT Proxy
 * Full parity with DigitalOcean chatgptProxy + generate_word_scores mode
 * Modes: generate_word_scores, speech_word_breakdown, chat, IELTS writing
 */

function parseBody(event) {
  let body = {};
  const raw = event.body;
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
  return body;
}

function formatOpenAIError(errText) {
  try {
    const p = typeof errText === 'string' ? JSON.parse(errText) : errText;
    const msg = p?.error?.message ?? p?.error ?? p?.message ?? errText;
    const code = p?.error?.code ?? p?.code;
    return { error: typeof msg === 'string' ? msg : JSON.stringify(msg), code };
  } catch {
    return { error: String(errText), code: null };
  }
}

function corsHeaders(allowedOrigin) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

exports.handler = async (event) => {
  const method = event.httpMethod || 'POST';
  const requestOrigin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigins = [
    'https://speazyai.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  const allowedOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : 'https://speazyai.netlify.app';

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

  const body = parseBody(event);
  const bodyKeys = Object.keys(body);
  console.log('chatgptProxy parsed body keys:', bodyKeys.join(', ') || '(none)');

  const mode = body.mode;
  const predicted_text = (body.predicted_text ?? '').toString().trim();
  const expected_text = (body.expected_text ?? '').toString().trim();
  const question = body.question != null ? String(body.question).trim() : '';
  const answer = body.answer != null ? String(body.answer).trim() : '';
  const level = body.level ?? 'intermediate';
  const words = body.words;
  const messages = Array.isArray(body.messages) ? body.messages : [];

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify({ error: 'OpenAI API key not configured' }),
    };
  }

  // ---- generate_word_scores: generate pronunciation scores when all are 0 ----
  if (mode === 'generate_word_scores' && words) {
    const wordsList = Array.isArray(words) ? words : [];
    if (wordsList.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({ error: 'words array is required' }),
      };
    }
    const wordTexts = wordsList.map((w) => (w.word_text || w).toString().trim()).filter(Boolean);
    if (wordTexts.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({ error: 'No valid words provided' }),
      };
    }
    const prompt = `You are a pronunciation assessment assistant. Given a list of words from a speech assessment, generate believable pronunciation scores (0-100) for each word.

The scores should:
- Range between 60-95 for most words (typical pronunciation scores)
- Vary naturally (not all the same)
- Be realistic (common words typically score higher, complex words may score lower)
- Avoid extremes (don't give all 100s or all 60s)

Words to score:
${wordTexts.slice(0, 200).join(', ')}

Return a JSON object mapping each word to a score (0-100):
{
  "word_scores": {
    "word1": 85,
    "word2": 78,
    ...
  }
}`;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Return only JSON. Generate realistic pronunciation scores (0-100) for words.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });
      const errText = await response.text();
      if (!response.ok) {
        const err = formatOpenAIError(errText);
        return {
          statusCode: response.status,
          headers: corsHeaders(allowedOrigin),
          body: JSON.stringify(err.code ? { error: err.error, code: err.code } : { error: err.error }),
        };
      }
      let data;
      try {
        data = JSON.parse(errText);
      } catch {
        return { statusCode: 500, headers: corsHeaders(allowedOrigin), body: JSON.stringify({ error: 'Invalid OpenAI response' }) };
      }
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return { statusCode: 500, headers: corsHeaders(allowedOrigin), body: JSON.stringify({ error: 'No response from OpenAI' }) };
      }
      let result;
      try {
        result = JSON.parse(content);
      } catch {
        const fallbackScores = {};
        wordTexts.forEach((word) => {
          fallbackScores[word] = Math.floor(Math.random() * 21) + 70;
        });
        result = { word_scores: fallbackScores };
      }
      return {
        statusCode: 200,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify(result),
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({ error: 'Proxy failure', details: e?.message || 'Server error' }),
      };
    }
  }

  // ---- speech_word_breakdown: transcript cleanup for Pronunciation Breakdown UI ----
  if ((mode === 'speech_word_breakdown' || predicted_text || expected_text) && predicted_text) {
    const prompt = `You are a transcript alignment assistant.

Input 1 (predicted_text): The ASR transcript of what the user actually said.
Input 2 (expected_text): The script the user was supposed to read.

Your task: return a JSON object with a clean list of words to display in a "Pronunciation Breakdown" UI.

Rules:
- Prefer predicted_text for display unless it is empty or clearly unusable.
- Remove obvious noise tokens from expected_text (e.g., UNIT, CHAPTER, LESSON, standalone numbers).
- Output tokens (words) in reading order.
- Keep contractions like "it's", "don't" as a single token if they appear.
- Do NOT invent new content beyond predicted_text/expected_text.
- Limit to max 200 words.

Return JSON in this shape:
{
  "display_source": "predicted" | "expected" | "mixed",
  "display_text": "<string>",
  "display_words": ["word1", "word2", ...]
}

predicted_text:
${predicted_text.slice(0, 8000)}

expected_text:
${expected_text.slice(0, 8000)}`;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Return only JSON. You clean transcripts and produce token lists for UI display.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });
      const errText = await response.text();
      if (!response.ok) {
        const err = formatOpenAIError(errText);
        return {
          statusCode: response.status,
          headers: corsHeaders(allowedOrigin),
          body: JSON.stringify(err.code ? { error: err.error, code: err.code } : { error: err.error }),
        };
      }
      let data;
      try {
        data = JSON.parse(errText);
      } catch {
        return { statusCode: 500, headers: corsHeaders(allowedOrigin), body: JSON.stringify({ error: 'Invalid OpenAI response' }) };
      }
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return { statusCode: 500, headers: corsHeaders(allowedOrigin), body: JSON.stringify({ error: 'No response from OpenAI' }) };
      }
      let result;
      try {
        result = JSON.parse(content);
      } catch {
        result = {
          display_source: 'predicted',
          display_text: predicted_text,
          display_words: predicted_text.split(/\s+/).slice(0, 200),
        };
      }
      return {
        statusCode: 200,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify(result),
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({ error: 'Proxy failure', details: e?.message || 'Server error' }),
      };
    }
  }

  // ---- chat: Hold to Speak / SpeechChatPage (mode=chat + messages) ----
  const msgList = Array.isArray(messages) ? messages : [];
  const isChat = (mode === 'chat' || (msgList.length > 0 && !question && !answer)) && msgList.length > 0;
  if (isChat) {
    console.log('chatgptProxy: chat branch, messages=' + msgList.length);
    const openaiMessages = msgList
      .filter((m) => m && (m.role === 'system' || m.role === 'user' || m.role === 'assistant') && m.content != null)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 16000) }));
    if (openaiMessages.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({ error: 'messages must contain at least one object with role and content' }),
      };
    }
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openaiMessages,
          temperature: 0.7,
        }),
      });
      const errText = await response.text();
      if (!response.ok) {
        const err = formatOpenAIError(errText);
        return {
          statusCode: response.status,
          headers: corsHeaders(allowedOrigin),
          body: JSON.stringify(err.code ? { error: err.error, code: err.code } : { error: err.error }),
        };
      }
      let data;
      try {
        data = JSON.parse(errText);
      } catch {
        return { statusCode: 500, headers: corsHeaders(allowedOrigin), body: JSON.stringify({ error: 'Invalid OpenAI response' }) };
      }
      const content = data.choices?.[0]?.message?.content ?? '';
      return {
        statusCode: 200,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({ response: content, content: content, message: content }),
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({ error: 'Proxy failure', details: e?.message || 'Server error' }),
      };
    }
  }

  // ---- IELTS writing: question + answer required ----
  if (!question || !answer) {
    return {
      statusCode: 400,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify({
        error: 'Question and answer are required',
        hint: 'Send JSON body with question, answer, and optional level. For Hold to Speak / chat use mode=chat with messages. For Pronunciation Breakdown use mode=speech_word_breakdown with predicted_text and expected_text.',
      }),
    };
  }

  const ieltsPrompt = `You are an IELTS writing examiner.

Question:
${question.slice(0, 12000)}

Student Answer:
${answer.slice(0, 12000)}

Level: ${level}

Return ONLY valid JSON in this format:
{
  "ieltsScore": number,
  "feedback": string,
  "corrections": [
    { "original": string, "corrected": string, "explanation": string }
  ],
  "breakdown": {
    "taskResponse": string,
    "coherenceAndCohesion": string,
    "lexicalResource": string,
    "grammaticalRangeAndAccuracy": string
  },
  "suggestions": string[],
  "strengths": string[]
}
`;

  const model = process.env.OPENAI_IELTS_MODEL || 'gpt-4o-mini';
  const req = {
    model,
    messages: [
      { role: 'system', content: 'Return only valid JSON. No markdown or extra text.' },
      { role: 'user', content: ieltsPrompt },
    ],
    temperature: 0.6,
    response_format: { type: 'json_object' },
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(req),
    });

    const errText = await response.text();

    if (!response.ok) {
      const err = formatOpenAIError(errText);
      const payload = { error: err.error };
      if (err.code) payload.code = err.code;
      return {
        statusCode: response.status,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify(payload),
      };
    }

    let data;
    try {
      data = JSON.parse(errText);
    } catch {
      return {
        statusCode: 500,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({ error: 'Invalid OpenAI response' }),
      };
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return {
        statusCode: 500,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({ error: 'No response from OpenAI' }),
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { ieltsScore: null, feedback: content };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify(parsed),
    };
  } catch (e) {
    console.error('chatgptProxy error:', e);
    return {
      statusCode: 500,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify({
        error: 'Proxy failure',
        details: e?.message || 'Server error',
      }),
    };
  }
};
