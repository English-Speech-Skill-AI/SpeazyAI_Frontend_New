// Local speech proxy.
//   POST /speechProxy        -> Language Confidence (matches the production speechProxy DO function).
//   POST /azureSpeechProxy   -> Azure Speech REST API (matches the new azureSpeechProxy DO function).
//                              No SDK / ffmpeg dependency; pure REST.
//   GET  /azureSpeechProxy?mode=info -> diagnostic.
//
// Run:  npm run proxy:speech
// Env:  LC_API_KEY                                       (for /speechProxy)
//       SPEECH_KEY  / SPEECH_REGION  / AZURE_SPEECH_LANGUAGE  (for /azureSpeechProxy)
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ---------- Language Confidence proxy ---------------------------------------
app.post("/speechProxy", async (req, res) => {
  try {
    const { endpoint: _e, expected_text: expectedText, script, ...rest } = req.body;
    let apiBody = { ...rest };
    delete apiBody.script;

    let targetEndpoint =
      req.query.endpoint ||
      _e ||
      "https://apis.languageconfidence.ai/speech-assessment/unscripted/uk";

    let isScripted =
      typeof targetEndpoint === "string" &&
      targetEndpoint.includes("speech-assessment/scripted");

    if (isScripted && expectedText != null) {
      const textForLength = String(expectedText).trim();
      if (textForLength.length > 300) {
        targetEndpoint = targetEndpoint.replace("/scripted/", "/unscripted/");
        isScripted = false;
      }
    }

    const scriptedTextField = process.env.LC_SCRIPT_FIELD || "expected_text";
    if (isScripted && expectedText != null && String(expectedText).trim() !== "") {
      let text = typeof expectedText === "string" ? expectedText : String(expectedText);
      if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
        try {
          const unquoted = JSON.parse(text);
          if (typeof unquoted === "string") text = unquoted;
        } catch (_) {}
      }
      apiBody[scriptedTextField] = text;
    }

    if (isScripted) {
      apiBody = {
        audio_base64: apiBody.audio_base64,
        audio_format: apiBody.audio_format,
        ...(apiBody[scriptedTextField] != null && { [scriptedTextField]: apiBody[scriptedTextField] }),
      };
    }

    if (!apiBody.audio_base64 || !apiBody.audio_format) {
      res.set("Access-Control-Allow-Origin", "*");
      return res.status(400).json({
        error: "Missing required fields: audio_base64, audio_format",
      });
    }

    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.LC_API_KEY,
        "lc-beta-features": req.headers["lc-beta-features"] || "false",
      },
      body: JSON.stringify(apiBody),
    });

    const data = await response.json();
    res.set("Access-Control-Allow-Origin", "*");
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Proxy Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Azure Speech REST proxy ----------------------------------------
const FORMAT_TO_CONTENT_TYPE = {
  webm: "audio/webm; codecs=opus",
  ogg: "audio/ogg; codecs=opus",
  wav: "audio/wav; codecs=audio/pcm; samplerate=16000",
  mp3: "audio/mpeg",
};

function azureKey() {
  return String(
    process.env.SPEECH_KEY || process.env.AZURE_SPEECH_KEY || process.env.Key || ""
  ).trim();
}
function azureRegion() {
  return String(
    process.env.SPEECH_REGION ||
      process.env.AZURE_SPEECH_REGION ||
      process.env.AZURE_REGION ||
      process.env.Region ||
      ""
  ).trim();
}
function azureLanguage() {
  return String(process.env.AZURE_SPEECH_LANGUAGE || "en-US").trim();
}

function buildPronunciationHeader(referenceText) {
  return Buffer.from(
    JSON.stringify({
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive",
      EnableMiscue: "True",
    }),
    "utf8"
  ).toString("base64");
}

async function postToAzure({ audio, contentType, key, region, language, paHeader }) {
  const url =
    `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` +
    `?language=${encodeURIComponent(language)}&format=detailed`;
  const headers = {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": contentType,
    Accept: "application/json",
  };
  if (paHeader) headers["Pronunciation-Assessment"] = paHeader;

  const resp = await fetch(url, { method: "POST", headers, body: audio });
  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: resp.status, json };
}

// Two-pass for unscripted (REST API only scores against a known reference text).
async function callAzureSpeech({ audio, contentType, referenceText, key, region, language }) {
  if (referenceText && referenceText.trim()) {
    return postToAzure({
      audio,
      contentType,
      key,
      region,
      language,
      paHeader: buildPronunciationHeader(referenceText.trim()),
    });
  }
  const recog = await postToAzure({ audio, contentType, key, region, language });
  if (recog.status >= 400) return recog;
  const displayText = recog.json?.DisplayText || "";
  const cleaned = String(displayText).replace(/[.!?]+$/g, "").trim();
  if (!cleaned) return recog;
  const scored = await postToAzure({
    audio,
    contentType,
    key,
    region,
    language,
    paHeader: buildPronunciationHeader(cleaned),
  });
  if (scored.status >= 400) return recog;
  if (scored.json && !scored.json.DisplayText && displayText) {
    scored.json.DisplayText = displayText;
  }
  return scored;
}

function mapAzureToLcShape(azure, { isScripted, expectedText, audioFormat }) {
  const recStatus = azure?.RecognitionStatus || "Unknown";
  const displayText = azure?.DisplayText || "";
  const nbest = azure?.NBest?.[0] || {};
  const pa = nbest.PronunciationAssessment || {};
  const wordsRaw = nbest.Words || [];

  const accuracy = pa.AccuracyScore ?? null;
  const fluencyScore = pa.FluencyScore ?? null;
  const completeness = pa.CompletenessScore ?? null;
  const pron = pa.PronScore ?? null;
  const overall = pron ?? accuracy ?? null;

  const words = wordsRaw.map((w) => {
    const wpa = w.PronunciationAssessment || {};
    const phonemes = (w.Phonemes || []).map((p) => {
      const ppa = p.PronunciationAssessment || {};
      return { phoneme: p.Phoneme || "", phoneme_score: ppa.AccuracyScore ?? null };
    });
    return {
      word_text: w.Word || "",
      word_score: wpa.AccuracyScore ?? null,
      error_type: wpa.ErrorType ?? "None",
      phonemes,
    };
  });

  const out = {
    pronunciation: {
      overall_score: pron,
      ...(isScripted && expectedText ? { expected_text: expectedText } : {}),
      words,
    },
    fluency: {
      overall_score: fluencyScore,
      metrics: { speech_rate: null, pauses: null, filler_words: null },
      feedback: {},
    },
    overall: {
      overall_score: overall,
      english_proficiency_scores: {
        mock_ielts: { prediction: null },
        mock_cefr: { prediction: null },
        mock_pte: { prediction: null },
      },
    },
    warnings: [],
    metadata: {
      provider: "azure",
      recognition_status: recStatus,
      predicted_text: displayText,
      content_relevance: 0,
      audio_format: audioFormat,
      ...(isScripted && expectedText ? { reference_text: expectedText } : {}),
    },
    pronunciation_score: pron,
    fluency_score: fluencyScore,
    overall_score: overall,
  };

  if (isScripted) {
    out.reading = {
      accuracy: accuracy != null ? accuracy / 100 : null,
      completion: completeness != null ? completeness / 100 : null,
      accuracy_score: accuracy,
      completeness_score: completeness,
    };
  }

  return out;
}

app.get("/azureSpeechProxy", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.json({
    function: "azureSpeechProxy (local)",
    node_version: process.version,
    env: {
      SPEECH_KEY: !!azureKey(),
      SPEECH_REGION: azureRegion() || null,
      AZURE_SPEECH_LANGUAGE: azureLanguage(),
    },
    usage: 'POST { "audio_base64": "<base64>", "audio_format": "webm|ogg|wav|mp3", "expected_text": "<optional>" }',
  });
});

app.post("/azureSpeechProxy", async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  try {
    const { endpoint: _e, expected_text: expectedText, mode, ...rest } = req.body || {};

    if (mode === "info") {
      return res.json({
        function: "azureSpeechProxy (local)",
        env: { SPEECH_KEY: !!azureKey(), SPEECH_REGION: azureRegion() || null },
      });
    }

    const key = azureKey();
    const region = azureRegion();
    const language = azureLanguage();
    if (!key || !region) {
      return res.status(500).json({
        error: "Missing Azure config",
        details: "Set SPEECH_KEY and SPEECH_REGION in .env",
      });
    }

    const audioBase64 = rest.audio_base64;
    const audioFormat = String(rest.audio_format || "").toLowerCase();
    if (!audioBase64 || !audioFormat) {
      return res.status(400).json({ error: "Missing required fields: audio_base64, audio_format" });
    }
    const contentType = FORMAT_TO_CONTENT_TYPE[audioFormat];
    if (!contentType) {
      return res.status(400).json({
        error: `Unsupported audio_format "${audioFormat}"`,
        supported: Object.keys(FORMAT_TO_CONTENT_TYPE),
      });
    }

    const targetEndpoint = req.query.endpoint || _e || "";
    let isScripted =
      typeof targetEndpoint === "string" && targetEndpoint.includes("speech-assessment/scripted");

    let referenceText = "";
    if (isScripted && expectedText != null) {
      let text = String(expectedText);
      if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
        try {
          const unquoted = JSON.parse(text);
          if (typeof unquoted === "string") text = unquoted;
        } catch (_) {}
      }
      if (text.trim().length > 300) isScripted = false;
      else referenceText = text;
    }

    const audio = Buffer.from(audioBase64, "base64");
    const { status, json: azureJson } = await callAzureSpeech({
      audio,
      contentType,
      referenceText,
      key,
      region,
      language,
    });

    if (status >= 400) {
      console.error("[azureSpeechProxy local] Azure", status, JSON.stringify(azureJson).slice(0, 800));
      return res.status(502).json({
        error: "Azure Speech REST returned " + status,
        azure_status: status,
        azure_response: azureJson,
      });
    }

    const lcShaped = mapAzureToLcShape(azureJson, {
      isScripted,
      expectedText: referenceText,
      audioFormat,
    });

    console.log("[azureSpeechProxy local] LC-shaped Azure JSON response:\n" + JSON.stringify(lcShaped, null, 2));
    return res.json(lcShaped);
  } catch (err) {
    console.error("Azure Speech Proxy Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(
    `Speech Proxy on http://localhost:${PORT}\n  POST /speechProxy        Language Confidence\n  POST /azureSpeechProxy   Azure (REST)\n  GET  /azureSpeechProxy?mode=info`
  )
);
