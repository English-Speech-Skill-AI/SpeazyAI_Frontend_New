// DigitalOcean API Server - Express.js version
// This is an alternative to serverless functions - use this as a Web Service component
// Run command: node digitalocean/api-server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleSupportTicketJson } from './supportRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - update with your domain
const allowedOrigins = [
  process.env.ALLOWED_ORIGIN || 'https://exeleratetechnology.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now, restrict in production
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Support ticket endpoint - JSON body (same format as DO function) for local/dev
app.post('/api/support-ticket', express.json({ limit: '30mb' }), async (req, res) => {
  if (req.body?.payload) {
    return handleSupportTicketJson(req, res);
  }
  res.status(400).json({ success: false, error: 'Expected JSON body with payload' });
});

// Speech Proxy Route
app.post('/api/speech-proxy', async (req, res) => {
  try {
    const incoming = req.body || {};
    const { endpoint: _ignored, expected_text: expectedText, ...apiBody } = incoming;

    let targetEndpoint =
      req.query.endpoint ||
      incoming.endpoint ||
      "https://apis.languageconfidence.ai/speech-assessment/unscripted/uk";
    let isScripted = typeof targetEndpoint === "string" && targetEndpoint.includes("speech-assessment/scripted");

    // Rule: only switch from scripted -> unscripted when expected_text is > 300 chars
    if (isScripted && expectedText != null) {
      const textForLength = String(expectedText).trim();
      if (textForLength.length > 300) {
        targetEndpoint = targetEndpoint.replace("/scripted/", "/unscripted/");
        isScripted = false;
      }
    }

    // For scripted, include expected_text in body; for unscripted, omit it
    if (isScripted && expectedText != null && String(expectedText).trim() !== "") {
      apiBody.expected_text = expectedText;
    }

    if (!apiBody.audio_base64 || !apiBody.audio_format) {
      return res.status(400).json({
        error: "Missing required fields: audio_base64, audio_format",
      });
    }

    const apiKey = process.env.LC_API_KEY || process.env.SPEECH_API_KEY;
    
    if (!apiKey) {
      console.error("API key not found in environment variables");
      return res.status(500).json({ error: "API key not configured" });
    }

    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        "lc-beta-features": req.headers["lc-beta-features"] || "false",
      },
      body: JSON.stringify(apiBody),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Speech proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ChatGPT Proxy Route
app.post('/api/chatgpt-proxy', async (req, res) => {
  try {
    const { mode, predicted_text, expected_text, question, answer, level, words, messages } = req.body;

    // Generate word scores mode
    if (mode === "generate_word_scores" && words) {
      const wordsList = Array.isArray(words) ? words : [];
      
      if (wordsList.length === 0) {
        return res.status(400).json({ error: "words array is required" });
      }

      const wordTexts = wordsList.map((w) => (w.word_text || w).toString().trim()).filter(Boolean);
      
      if (wordTexts.length === 0) {
        return res.status(400).json({ error: "No valid words provided" });
      }

      const prompt = `You are a pronunciation assessment assistant. Given a list of words from a speech assessment, generate believable pronunciation scores (0-100) for each word. 

The scores should:
- Range between 60-95 for most words (typical pronunciation scores)
- Vary naturally (not all the same)
- Be realistic (common words typically score higher, complex words may score lower)
- Avoid extremes (don't give all 100s or all 60s)

Words to score:
${wordTexts.slice(0, 200).join(", ")}

Return a JSON object mapping each word to a score (0-100):
{
  "word_scores": {
    "word1": 85,
    "word2": 78,
    ...
  }
}`;

      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

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
              content: "Return only JSON. Generate realistic pronunciation scores (0-100) for words.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API Error:", errorText);
        return res.status(response.status).json({ error: `OpenAI API error: ${errorText}` });
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from OpenAI" });
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

      return res.json(result);
    }

    // Chat mode
    if (mode === "chat" && messages) {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API Error:", errorText);
        return res.status(response.status).json({ error: `OpenAI API error: ${errorText}` });
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from OpenAI" });
      }

      return res.json({ response: content });
    }

    // Speech word breakdown mode
    if (mode === "speech_word_breakdown" || predicted_text || expected_text) {
      const predicted = (predicted_text || "").toString().trim();
      const expected = (expected_text || "").toString().trim();

      if (!predicted) {
        return res.status(400).json({ error: "predicted_text is required" });
      }

      const prompt = `You are a transcript alignment assistant.

Input 1 (predicted_text): The ASR transcript of what the user actually said.
Input 2 (expected_text): The script the user was supposed to read. This can include noise like headings (UNIT/CHAPTER), page numbers, standalone question numbers, etc.

Your task: return a JSON object with a clean list of words to display in a "Pronunciation Breakdown" UI.

Rules:
- Prefer predicted_text for display unless it is empty or clearly unusable.
- Remove obvious noise tokens from expected_text (e.g., UNIT, CHAPTER, LESSON, standalone numbers like 7, 12, 13, etc).
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
${predicted.slice(0, 8000)}

expected_text:
${expected.slice(0, 8000)}`;

      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Return only JSON. You clean transcripts and produce token lists for UI display.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API Error:", errorText);
        return res.status(response.status).json({ error: `OpenAI API error: ${errorText}` });
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from OpenAI" });
      }

      let result;
      try {
        result = JSON.parse(content);
      } catch {
        result = {
          display_source: "predicted",
          display_text: predicted,
          display_words: predicted.split(/\s+/).slice(0, 200),
        };
      }

      return res.json(result);
    }

    // IELTS assessment mode
    if (!question || !answer) {
      return res.status(400).json({ error: "Question and answer are required" });
    }

    const escapedAnswer = answer.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const prompt = `You are an IELTS writing examiner. Please assess the following writing task according to IELTS Writing Task 2 standards.

Question/Prompt: ${question}

Student's Answer: ${answer}

Level: ${level}

Please provide:
1. An overall IELTS band score (0-9 scale)
2. Detailed feedback on:
   - Task Response (how well the answer addresses the question)
   - Coherence and Cohesion (organization and linking)
   - Lexical Resource (vocabulary range and accuracy)
   - Grammatical Range and Accuracy
3. Specific corrections - identify exact phrases/sentences from the student's answer that need improvement
4. Strengths of the writing

IMPORTANT: In the "corrections" array, identify specific text from the student's answer that needs improvement. Each correction should have:
- "original": the exact text from the student's answer (must match exactly)
- "corrected": the improved version
- "explanation": why this change improves the writing

Format your response as JSON with the following structure:
{
  "ieltsScore": <number>,
  "feedback": "<overall feedback text>",
  "originalText": "${answer.replace(/"/g, '\\"').replace(/\n/g, '\\n')}",
  "corrections": [
    {
      "original": "<exact text from student's answer that needs improvement>",
      "corrected": "<improved version>",
      "explanation": "<why this change is better>"
    }
  ],
  "breakdown": {
    "taskResponse": "<feedback>",
    "coherenceAndCohesion": "<feedback>",
    "lexicalResource": "<feedback>",
    "grammaticalRangeAndAccuracy": "<feedback>"
  },
  "suggestions": ["<suggestion1>", "<suggestion2>", ...],
  "strengths": ["<strength1>", "<strength2>", ...]
}

Be encouraging but honest. Adjust your expectations based on the level (beginner, intermediate, advanced). Find at least 2-5 specific corrections if there are errors.`;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert IELTS writing examiner. Provide detailed, constructive feedback in JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API Error:", errorText);
      return res.status(response.status).json({ error: `OpenAI API error: ${errorText}` });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "No response from OpenAI" });
    }

    let assessmentResult;
    try {
      assessmentResult = JSON.parse(content);
    } catch (parseError) {
      assessmentResult = {
        ieltsScore: null,
        feedback: content,
        response: content,
      };
    }

    return res.json(assessmentResult);
  } catch (error) {
    console.error("ChatGPT proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Auth Proxy Route
app.post('/api/auth-proxy', async (req, res) => {
  try {
    const requestBody = req.body || {};
    const targetEndpoint = "https://api.intelliviq.com/api/auth/login.php";

    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Auth proxy error:", error);
    res.status(500).json({ 
      success: false,
      message: error.message || "An error occurred during authentication"
    });
  }
});

// PDF Proxy Route
app.get('/api/pdf-proxy', async (req, res) => {
  try {
    const pdfUrl = req.query.url;

    if (!pdfUrl) {
      return res.status(400).json({ error: "PDF URL is required" });
    }

    const response = await fetch(pdfUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch PDF: ${response.statusText}` 
      });
    }

    const pdfBuffer = await response.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(Buffer.from(pdfBase64, "base64"));
  } catch (error) {
    console.error("PDF Proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PDF Extract Proxy Route
app.post('/api/pdf-extract-proxy', async (req, res) => {
  try {
    const { pdf_base64, extracted_text, prompt } = req.body;

    if (extracted_text) {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
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
        return res.json({ text: extracted_text });
      }

      const data = await response.json();
      const processedText = data.choices?.[0]?.message?.content || extracted_text;

      return res.json({ text: processedText });
    }

    return res.status(400).json({ 
      error: "Please extract PDF text client-side first, then send extracted_text for processing" 
    });
  } catch (error) {
    console.error("PDF Extract Proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`DigitalOcean API Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
