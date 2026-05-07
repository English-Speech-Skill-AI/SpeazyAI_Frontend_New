// =====================================================================
//  scripts/azure-speech-test.js
//
//  Standalone Azure Speech pronunciation assessment debug harness.
//  Bypasses the proxy completely. Exercises four code paths so we can
//  pinpoint exactly which combination produces real scores against your
//  audio + your Azure resource:
//
//    [1] REST  — recognition only (no Pronunciation-Assessment header)
//    [2] REST  — single call WITH ReferenceText (scripted PA)
//    [3] REST  — two-pass: recognize first, then PA with recognized text
//    [4] SDK   — official Speech SDK pronunciation assessment (ground truth)
//
//  Usage:
//      node scripts/azure-speech-test.js <audio_file> [reference_text]
//
//  Examples:
//      node scripts/azure-speech-test.js sample.wav "I like apples"
//      node scripts/azure-speech-test.js sample.webm
//
//  Reads SPEECH_KEY / SPEECH_REGION / AZURE_SPEECH_LANGUAGE from .env.
// =====================================================================

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import sdk from "microsoft-cognitiveservices-speech-sdk";

dotenv.config();

const KEY = (process.env.SPEECH_KEY || process.env.AZURE_SPEECH_KEY || "").trim();
const REGION = (process.env.SPEECH_REGION || process.env.AZURE_SPEECH_REGION || "").trim();
const LANG = (process.env.AZURE_SPEECH_LANGUAGE || "en-US").trim();

const audioPath = process.argv[2];
const referenceTextArg = process.argv[3] || "";

const RULER = "═".repeat(72);

function header(title) {
  console.log("\n" + RULER);
  console.log(" " + title);
  console.log(RULER);
}

function fail(msg) {
  console.error("\n[ERROR] " + msg);
  process.exit(1);
}

if (!KEY) fail("SPEECH_KEY is empty. Set it in .env (no spaces around =).");
if (!REGION) fail("SPEECH_REGION is empty. Set it in .env (e.g. eastus2).");
if (!audioPath) fail("Usage: node scripts/azure-speech-test.js <audio_file> [reference_text]");
if (!fs.existsSync(audioPath)) fail(`File not found: ${audioPath}`);

const audio = fs.readFileSync(audioPath);
const ext = path.extname(audioPath).slice(1).toLowerCase();
const FORMAT_TO_CONTENT_TYPE = {
  wav: "audio/wav; codecs=audio/pcm; samplerate=16000",
  webm: "audio/webm; codecs=opus",
  ogg: "audio/ogg; codecs=opus",
  mp3: "audio/mpeg",
};
const contentType = FORMAT_TO_CONTENT_TYPE[ext];
if (!contentType) {
  fail(`Unsupported file extension ".${ext}". Supported: ${Object.keys(FORMAT_TO_CONTENT_TYPE).join(", ")}`);
}

// ---------- WAV inspection ------------------------------------------------
function inspectWav(buf) {
  if (buf.length < 44) return { ok: false, reason: "shorter than 44 bytes" };
  if (buf.toString("utf8", 0, 4) !== "RIFF") return { ok: false, reason: 'missing "RIFF"' };
  if (buf.toString("utf8", 8, 12) !== "WAVE") return { ok: false, reason: 'missing "WAVE"' };
  const formatCode = buf.readUInt16LE(20);
  const channels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);
  return {
    ok: true,
    formatCode,
    formatName: formatCode === 1 ? "PCM" : `code ${formatCode}`,
    channels,
    sampleRate,
    bitsPerSample,
    fileSize: buf.length,
    durationSec: ((buf.length - 44) / (sampleRate * channels * (bitsPerSample / 8))).toFixed(2),
  };
}

header("ENV / FILE");
console.log({
  region: REGION,
  language: LANG,
  audioPath,
  audioFormat: ext,
  contentType,
  fileSizeBytes: audio.length,
  keyPrefix: KEY.slice(0, 4) + "…" + KEY.slice(-4),
});

if (ext === "wav") {
  const info = inspectWav(audio);
  console.log("WAV header:", info);
  if (info.ok) {
    if (info.formatCode !== 1) console.warn("  ⚠ Not PCM. Azure expects PCM.");
    if (info.channels !== 1) console.warn(`  ⚠ Channels=${info.channels}. Azure expects mono.`);
    if (info.sampleRate !== 16000) console.warn(`  ⚠ Sample rate=${info.sampleRate}. Azure expects 16000 Hz.`);
    if (info.bitsPerSample !== 16) console.warn(`  ⚠ Bits/sample=${info.bitsPerSample}. Azure expects 16-bit.`);
  }
}

// ---------- REST helpers --------------------------------------------------
function buildPaHeader(referenceText) {
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

async function callRest({ withPaText, label }) {
  const url =
    `https://${REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` +
    `?language=${encodeURIComponent(LANG)}&format=detailed`;

  const headers = {
    Accept: "application/json;text/xml",
    "Content-Type": contentType,
    "Ocp-Apim-Subscription-Key": KEY,
  };
  if (withPaText != null) {
    headers["Pronunciation-Assessment"] = buildPaHeader(withPaText);
    console.log(`PA config: { ReferenceText: ${JSON.stringify(withPaText)}, GradingSystem: HundredMark, Granularity: Phoneme, Dimension: Comprehensive, EnableMiscue: True }`);
  } else {
    console.log("PA config: <none — recognition only>");
  }
  console.log(`POST ${url}`);

  const t0 = Date.now();
  const resp = await fetch(url, { method: "POST", headers, body: audio });
  const text = await resp.text();
  const elapsed = Date.now() - t0;
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  console.log(`HTTP ${resp.status}  (${elapsed} ms)`);

  // Extract the bits we care about
  const nbest0 = json.NBest?.[0] || {};
  const pa = nbest0.PronunciationAssessment;
  const wordScores = (nbest0.Words || []).map((w) => ({
    word: w.Word,
    AccuracyScore: w.PronunciationAssessment?.AccuracyScore ?? null,
    ErrorType: w.PronunciationAssessment?.ErrorType ?? null,
  }));

  console.log("→ RecognitionStatus:", json.RecognitionStatus);
  console.log("→ DisplayText:", json.DisplayText);
  console.log("→ NBest[0].PronunciationAssessment:", pa || "MISSING");
  console.log("→ Per-word scores:", wordScores.length ? wordScores : "MISSING");

  if (resp.status >= 400 || !pa) {
    console.log("\n  Full Azure response (first 1500 chars):");
    console.log("  " + JSON.stringify(json, null, 2).slice(0, 1500).replace(/\n/g, "\n  "));
  }

  return { status: resp.status, json, label };
}

// ---------- SDK ground truth ---------------------------------------------
async function callSdk({ referenceText }) {
  if (ext !== "wav") {
    console.log(`Skipping SDK test — needs WAV. Your file is .${ext}.`);
    return;
  }
  return new Promise((resolve) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(KEY, REGION);
    speechConfig.speechRecognitionLanguage = LANG;

    const audioConfig = sdk.AudioConfig.fromWavFileInput(audio);

    const paConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true
    );
    paConfig.enableProsodyAssessment = false;

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    paConfig.applyTo(recognizer);

    console.log(
      `SDK config: ReferenceText=${JSON.stringify(referenceText || "")}  ` +
        `GradingSystem=HundredMark  Granularity=Phoneme  EnableMiscue=true`
    );
    const t0 = Date.now();
    recognizer.recognizeOnceAsync(
      (result) => {
        const elapsed = Date.now() - t0;
        console.log(`SDK done in ${elapsed} ms — reason: ${sdk.ResultReason[result.reason]}`);
        if (result.reason !== sdk.ResultReason.RecognizedSpeech) {
          console.log("  text:", result.text);
          console.log("  errorDetails:", result.errorDetails);
          recognizer.close();
          return resolve();
        }
        const paResult = sdk.PronunciationAssessmentResult.fromResult(result);
        console.log("→ DisplayText:", result.text);
        console.log("→ AccuracyScore:", paResult.accuracyScore);
        console.log("→ FluencyScore:", paResult.fluencyScore);
        console.log("→ CompletenessScore:", paResult.completenessScore);
        console.log("→ PronunciationScore:", paResult.pronunciationScore);
        const detailedJson = JSON.parse(
          result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult) || "{}"
        );
        const words = (detailedJson.NBest?.[0]?.Words || []).map((w) => ({
          word: w.Word,
          AccuracyScore: w.PronunciationAssessment?.AccuracyScore ?? null,
          ErrorType: w.PronunciationAssessment?.ErrorType ?? null,
        }));
        console.log("→ Per-word:", words);
        recognizer.close();
        resolve();
      },
      (err) => {
        console.log("SDK error:", err);
        recognizer.close();
        resolve();
      }
    );
  });
}

// ---------- Run all tests -------------------------------------------------
(async () => {
  // Test 1
  header("[1] REST  recognition only (no PA header)");
  const t1 = await callRest({ withPaText: null });
  const recognized = t1.json?.DisplayText
    ? String(t1.json.DisplayText).replace(/[.!?]+$/g, "").trim()
    : "";

  // Test 2
  if (referenceTextArg.trim()) {
    header(`[2] REST  PA with provided ReferenceText = "${referenceTextArg}"`);
    await callRest({ withPaText: referenceTextArg.trim() });
  } else {
    header("[2] REST  PA — SKIPPED (no reference_text argument)");
    console.log("Re-run with reference text to exercise this path:");
    console.log(`  node scripts/azure-speech-test.js ${audioPath} "I like apples"`);
  }

  // Test 3
  if (recognized) {
    header(`[3] REST  two-pass: PA using recognized text "${recognized}"`);
    await callRest({ withPaText: recognized });
  } else {
    header("[3] REST  two-pass — SKIPPED (Test 1 returned no DisplayText)");
  }

  // Test 4
  header("[4] SDK   ground truth (Speech SDK)");
  const sdkRef = referenceTextArg.trim() || recognized || "";
  await callSdk({ referenceText: sdkRef });

  console.log("\n" + RULER);
  console.log(" Done. Compare which paths returned real scores.");
  console.log(RULER);
})().catch((e) => {
  console.error("Unhandled:", e);
  process.exit(1);
});
