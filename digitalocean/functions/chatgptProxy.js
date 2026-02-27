// DigitalOcean Serverless Function - ChatGPT Proxy
// Works with Dashboard "Test Parameters" + real HTTP POST from frontend

const hasUseful = (o) => o && (o.question != null || o.answer != null || o.mode != null || o.predicted_text != null || o.expected_text != null || (o.messages != null && Array.isArray(o.messages)) || o.words != null);

function parseBody(event) {
  let body = {};

  const use = (val) => {
    if (val && hasUseful(val)) {
      body = val;
      return true;
    }
    return false;
  };

  const parseStr = (s) => {
    if (typeof s !== "string" || !s.trim()) return null;
    try {
      const o = JSON.parse(s);
      return hasUseful(o) ? o : (o?.body && typeof o.body === "object" && hasUseful(o.body) ? o.body : null);
    } catch {
      return null;
    }
  };

  const unwrap = (o) => {
    if (!o) return null;
    if (hasUseful(o)) return o;
    if (o?.body && typeof o.body === "object" && hasUseful(o.body)) return o.body;
    return null;
  };

  // 1. __ow_body (DO HTTP; may be base64)
  if (event?.__ow_body) {
    let s = event.__ow_body;
    if (event.__ow_isBase64Encoded && typeof s === "string") {
      try {
        s = Buffer.from(s, "base64").toString("utf8");
      } catch (_) {}
    }
    let o = null;
    if (typeof s === "string") o = parseStr(s);
    else if (typeof s === "object") o = unwrap(s) || (hasUseful(s) ? s : null);
    use(o);
  }

  // 2. event.http.body
  if (!hasUseful(body) && event?.http?.body) {
    const hb = event.http.body;
    let o = null;
    if (typeof hb === "string") o = parseStr(hb);
    else if (typeof hb === "object") o = unwrap(hb) || (hasUseful(hb) ? hb : null);
    use(o);
  }

  // 3. event.body
  if (!hasUseful(body) && event?.body) {
    const b = event.body;
    let o = null;
    if (typeof b === "string") o = parseStr(b);
    else if (typeof b === "object") o = unwrap(b) || (hasUseful(b) ? b : null);
    use(o);
  }

  // 4. Envelope event.http.body.body
  if (!hasUseful(body) && event?.http?.body?.body && typeof event.http.body.body === "object" && hasUseful(event.http.body.body)) body = event.http.body.body;

  // 5. Top-level merge (Dashboard / DO merge)
  if (!hasUseful(body) && (event?.question != null || event?.answer != null || event?.mode != null || event?.predicted_text != null || event?.expected_text != null || (event?.messages != null && Array.isArray(event.messages)))) {
    body = {
      question: event.question,
      answer: event.answer,
      level: event.level ?? "intermediate",
      mode: event.mode,
      messages: event.messages,
      words: event.words,
      predicted_text: event.predicted_text,
      expected_text: event.expected_text,
    };
  }

  // 6. Supplement from event
  if (event?.mode != null && body.mode == null) body.mode = event.mode;
  if (event?.messages != null && Array.isArray(event.messages) && !Array.isArray(body.messages)) body.messages = event.messages;
  if (event?.question != null && body.question == null) body.question = event.question;
  if (event?.answer != null && body.answer == null) body.answer = event.answer;
  if (event?.words != null && body.words == null) body.words = event.words;
  if (event?.predicted_text != null && body.predicted_text == null) body.predicted_text = event.predicted_text;
  if (event?.expected_text != null && body.expected_text == null) body.expected_text = event.expected_text;

  return body;
}

function formatOpenAIError(errText) {
  try {
    const p = typeof errText === "string" ? JSON.parse(errText) : errText;
    const msg = p?.error?.message ?? p?.error ?? p?.message ?? errText;
    const code = p?.error?.code ?? p?.code;
    return { error: typeof msg === "string" ? msg : JSON.stringify(msg), code };
  } catch {
    return { error: String(errText), code: null };
  }
}

export async function main(event) {
  const method = event?.__ow_method ?? event?.http?.method ?? event?.method ?? "POST";

  if (method === "OPTIONS") {
    return { statusCode: 204 };
  }

  const body = parseBody(event);
  const bodyKeys = Object.keys(body);
  console.log("chatgptProxy parsed body keys:", bodyKeys.join(", ") || "(none)");

  const mode = body.mode;
  const predicted_text = (body.predicted_text ?? "").toString().trim();
  const expected_text = (body.expected_text ?? "").toString().trim();
  const question = body.question != null ? String(body.question).trim() : "";
  const answer = body.answer != null ? String(body.answer).trim() : "";
  const level = body.level ?? "intermediate";
  const locale = (body.locale ?? "en").toString().toLowerCase();

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OpenAI API key not configured" }),
    };
  }

  // ---- speech_word_breakdown: transcript cleanup for Pronunciation Breakdown UI ----
  if ((mode === "speech_word_breakdown" || predicted_text || expected_text) && predicted_text) {
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
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Return only JSON. You clean transcripts and produce token lists for UI display." },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });
      const errText = await response.text();
      if (!response.ok) {
        console.error("OpenAI error (speech_word_breakdown):", errText.slice(0, 500));
        const err = formatOpenAIError(errText);
        return {
          statusCode: response.status,
          body: JSON.stringify(err.code ? { error: err.error, code: err.code } : { error: err.error }),
        };
      }
      let data;
      try {
        data = JSON.parse(errText);
      } catch {
        return { statusCode: 500, body: JSON.stringify({ error: "Invalid OpenAI response" }) };
      }
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return { statusCode: 500, body: JSON.stringify({ error: "No response from OpenAI" }) };
      }
      let result;
      try {
        result = JSON.parse(content);
      } catch {
        result = {
          display_source: "predicted",
          display_text: predicted_text,
          display_words: predicted_text.split(/\s+/).slice(0, 200),
        };
      }
      return { statusCode: 200, body: JSON.stringify(result) };
    } catch (e) {
      console.error("chatgptProxy speech_word_breakdown error:", e);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Proxy failure", details: e?.message || "Server error" }),
      };
    }
  }

  // ---- chat: Hold to Speak / SpeechChatPage (mode=chat + messages) ----
  const msgList = Array.isArray(body.messages) ? body.messages : [];
  const isChat = (mode === "chat" || (msgList.length > 0 && !question && !answer)) && msgList.length > 0;
  if (isChat) {
    console.log("chatgptProxy: chat branch, messages=" + msgList.length);
    const openaiMessages = msgList
      .filter((m) => m && (m.role === "system" || m.role === "user" || m.role === "assistant") && m.content != null)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 16000) }));
    if (openaiMessages.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "messages must contain at least one object with role and content" }),
      };
    }
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          temperature: 0.7,
        }),
      });
      const errText = await response.text();
      if (!response.ok) {
        console.error("OpenAI error (chat):", errText.slice(0, 500));
        const err = formatOpenAIError(errText);
        return {
          statusCode: response.status,
          body: JSON.stringify(err.code ? { error: err.error, code: err.code } : { error: err.error }),
        };
      }
      let data;
      try {
        data = JSON.parse(errText);
      } catch {
        return { statusCode: 500, body: JSON.stringify({ error: "Invalid OpenAI response" }) };
      }
      const content = data.choices?.[0]?.message?.content ?? "";
      return {
        statusCode: 200,
        body: JSON.stringify({ response: content, content: content, message: content }),
      };
    } catch (e) {
      console.error("chatgptProxy chat error:", e);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Proxy failure", details: e?.message || "Server error" }),
      };
    }
  }

  // ---- IELTS writing: question + answer required ----
  if (!question || !answer) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Question and answer are required",
        hint: "Send JSON body with question, answer, and optional level. For Hold to Speak / chat use mode=chat with messages. For Pronunciation Breakdown use mode=speech_word_breakdown with predicted_text and expected_text.",
      }),
    };
  }

  const langInstruction = locale === "ar"
    ? "\n\nCRITICAL: All text in your JSON response must be in Arabic (العربية). The feedback, corrections (original and corrected stay as-is from the student's text; explanation must be in Arabic), breakdown values, suggestions, and strengths must all be written in Arabic."
    : "";

  const prompt = `You are an IELTS writing examiner.

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
${langInstruction}
`;

  const model = process.env.OPENAI_IELTS_MODEL || "gpt-4o-mini";
  const req = {
    model,
    messages: [
      { role: "system", content: "Return only valid JSON. No markdown or extra text." },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    response_format: { type: "json_object" },
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(req),
    });

    const errText = await response.text();

    if (!response.ok) {
      console.error("OpenAI error:", errText.slice(0, 500));
      const err = formatOpenAIError(errText);
      const payload = { error: err.error };
      if (err.code) payload.code = err.code;
      return {
        statusCode: response.status,
        body: JSON.stringify(payload),
      };
    }

    let data;
    try {
      data = JSON.parse(errText);
    } catch {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid OpenAI response" }),
      };
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No response from OpenAI" }),
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
      body: JSON.stringify(parsed),
    };
  } catch (e) {
    console.error("chatgptProxy error:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Proxy failure",
        details: e?.message || "Server error",
      }),
    };
  }
}
