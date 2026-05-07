# DigitalOcean `azureSpeechProxy` — what it is, how to deploy, how to test

This document covers:

1. How the existing **Language Confidence (LC)** flow works (so you know what we're matching).
2. What `azureSpeechProxy` is and how it differs from the old version.
3. How to deploy it to DigitalOcean by **pasting one file** (no `npm install`, no adapter, no SDK).
4. How to test it from Postman in 4 steps.
5. The staged rollout — **do not** flip the frontend yet.

---

## 1. How `audio_base64` is used today (LC flow)

Every recorder in the app records audio with `MediaRecorder`, base64-encodes the bytes, and POSTs JSON to the speech proxy:

```json
{
  "audio_base64": "<base64 bytes>",
  "audio_format": "webm",
  "expected_text": "..."
}
```

Optional query: `?endpoint=https://apis.languageconfidence.ai/speech-assessment/scripted/uk` — the substring `scripted` is what tells the proxy this is a **scripted** (reading) task vs. an unscripted one.

Today this hits [`digitalocean/functions/speechProxy.js`](../digitalocean/functions/speechProxy.js) which forwards to Language Confidence and returns LC-shaped JSON. The frontend reads keys like `pronunciation`, `fluency`, `overall`, `reading`, `metadata.predicted_text` (full contract: [`docs/speech-assessment-lc-contract.md`](../docs/speech-assessment-lc-contract.md)).

The recorders are `audioRecorder.tsx`, `reading/ReadingAudioRecorder.tsx`, `speaking/SpeakingAudioRecorder.tsx`, `ielts/IELTSAudioRecorder.tsx`, plus `IELTSSpeakingTaskView.tsx` (batch evaluation) and `callPracticeAPI` in the three results pages.

---

## 2. What is `azureSpeechProxy` now

[`digitalocean/functions/azureSpeechProxy.js`](../digitalocean/functions/azureSpeechProxy.js) is now **one self-contained file**. It:

- Takes the same request shape as `speechProxy` so the frontend doesn't change.
- Calls the **Azure Speech REST API** directly using Node's built-in `fetch` (no `microsoft-cognitiveservices-speech-sdk`).
- Reads the audio bytes verbatim (no `ffmpeg-static`) and sends them to Azure with the right `Content-Type`. Supported: `webm`, `ogg`, `wav`, `mp3`.
- Maps Azure's response into LC-shaped JSON so the existing UI works unchanged.
- Has a **diagnostic mode**: `GET ?mode=info` (or `POST {"mode":"info"}`) to verify config without sending audio.

> The previous version required a separate `azureSpeechAdapter.cjs` plus `microsoft-cognitiveservices-speech-sdk` and `ffmpeg-static` from npm. Those needed `node_modules` deployed alongside, which the DigitalOcean web UI source editor does not support. That's why every request returned the gateway error `"There was an error processing your request."` — the function crashed at module load. The adapter file has been deleted.

---

## 3. Deploy by pasting one file

In the DigitalOcean dashboard → Functions → `azureSpeechProxy`:

### a) Source

Open `Source` tab. Paste the contents of [`digitalocean/functions/azureSpeechProxy.js`](../digitalocean/functions/azureSpeechProxy.js). Save.

### b) Settings → Limits

- **Timeout: 30000 ms or higher.** Default is **1 sec** which will fail every time. Azure short-audio recognition typically takes 1–3 s plus cold-start.
- Memory: 256 MB is enough; 512 MB is fine.

### c) Settings → Environment variables

You already have these (from your screenshot). Confirm:

| Name              | Value                                                                                  |
|-------------------|----------------------------------------------------------------------------------------|
| `SPEECH_KEY`      | `<your-azure-speech-key>`                                                              |
| `SPEECH_REGION`   | `eastus2`                                                                              |
| `AZURE_SPEECH_LANGUAGE` | `en-US`                                                                          |

The function also accepts the aliases `AZURE_SPEECH_KEY`/`Key` and `AZURE_SPEECH_REGION`/`AZURE_REGION`/`Region`, so the same names you've been using elsewhere will work.

> Your **Endpoint** `https://eastus2.api.cognitive.microsoft.com/` confirms the region is `eastus2`. The function builds the speech URL `https://eastus2.stt.speech.microsoft.com/...` from `SPEECH_REGION`. There is nothing else to configure.

### d) Settings → Access & Security

Web Function: **Enabled** (already is in your screenshot).

That's all. No `npm install`, no `node_modules`, no `project.yml`.

---

## 4. Test from Postman (4 ordered steps)

Import [`postman/Azure-Speech-Proxy.postman_collection.json`](Azure-Speech-Proxy.postman_collection.json).

### Collection variables

| Variable                  | Default                                                                                                | Used by |
|---------------------------|--------------------------------------------------------------------------------------------------------|---------|
| `speechProxyUrl`          | your DO `azureSpeechProxy` URL (already filled in)                                                     | all DO requests |
| `speechProxyUrlLocal`     | `http://localhost:4000/azureSpeechProxy`                                                               | local-only requests |
| `audio_base64`            | empty (set before step 3)                                                                              | steps 3–4 |
| `audio_format`            | `webm`                                                                                                 | steps 3–4 |
| `expected_text_scripted`  | `Hello world`                                                                                          | step 4 |

### Step 1 — `01 GET health (mode=info)`

Expected JSON (200):

```json
{
  "function": "azureSpeechProxy",
  "node_version": "v18.x.x",
  "platform": "linux/x64",
  "env": { "SPEECH_KEY": true, "SPEECH_REGION": "eastus2", "AZURE_SPEECH_LANGUAGE": "en-US" },
  "usage": "POST { \"audio_base64\": \"<base64>\", \"audio_format\": \"webm|ogg|wav|mp3\", \"expected_text\": \"<optional>\" }"
}
```

If you see the gateway error `{ code: ..., error: "There was an error processing your request." }` here:
- The Source tab still has old code — paste again.
- Or the **Timeout** is still 1 s — bump it to 30 s.

### Step 2 — `02 POST validation` (empty body)

Expected: HTTP **400** with `{ error: "Missing required fields: audio_base64, audio_format", hint: ... }`. This proves the handler runs.

### Step 3 — `03 POST unscripted` (real audio)

Generate base64 from a recording (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\clip.webm'))
```

Paste the output as the value of the **`audio_base64`** collection variable (one long line, no `data:` prefix). Then send. Expected: HTTP 200 with LC-shaped JSON. View the parsed JSON in **Postman Console** (`View → Show Postman Console`).

### Step 4 — `04 POST scripted` (real audio + `expected_text`)

Set `expected_text_scripted` to a passage that matches what you said (e.g. `"The quick brown fox"`). Send. The URL includes `?endpoint=...scripted/uk` so the function treats it as scripted and uses your reference text against Azure's `EnableMiscue=true` mode. The response includes `reading.accuracy` and `reading.completion`.

---

## 5. Rollout — staged, no big-bang

The frontend currently points at `speechProxy` (Language Confidence). **Don't change this yet.** Validate `azureSpeechProxy` independently first.

Recommended order:

1. **Phase A** - Pass steps 1-4 above in Postman from your machine. No frontend change.
2. **Phase B** - Set `VITE_SPEECH_PROXY_FUNCTION=azure` in `.env.local` and run the app locally. Smoke test recording → results. Compare output to LC.
3. **Phase C** - When confident, set the same env in your production build to point at the Azure URL. Keep `speechProxy` deployed so you can revert with one env change.
4. **Phase D** - Once Azure has run cleanly for a while, optionally retire LC.

If anything looks off after Phase B, revert the env var. No code changes required.

---

## Troubleshooting

| Symptom in Postman                              | Fix |
|-------------------------------------------------|-----|
| Gateway error on `01 GET health`                | Paste the latest `azureSpeechProxy.js`; bump function Timeout to 30 s. |
| `01` shows `SPEECH_KEY: false`                  | Env var not saved on the function. Re-save. |
| `01` shows `SPEECH_REGION: null`                | Set `SPEECH_REGION=eastus2`. |
| `04` returns 502 with `azure_status: 401`       | Wrong key, or key is from a different region than `SPEECH_REGION`. |
| `04` returns 502 with `azure_status: 400`       | Audio bytes don't match `audio_format`. Confirm the source file matches (e.g. WebM/Opus). |
| `04` returns 200 but `RecognitionStatus: NoMatch` | Audio is silent or too short. Try a clearer 3+ second clip. |
| **Recognition works but every score is `null`** | Run the diagnostic script — see next section. |

---

## Diagnostic — `npm run test:azure`

If recognition succeeds but pronunciation/fluency/word/phoneme scores are `null`, run this script to talk to Azure directly (no proxy in the loop) and compare four code paths:

```powershell
# Quick win: download Microsoft's known-good 16 kHz mono WAV
Invoke-WebRequest `
  -Uri https://github.com/Azure-Samples/cognitive-services-speech-sdk/raw/master/sampledata/audiofiles/whatstheweatherlike.wav `
  -OutFile sample.wav

# Run the harness against it
npm run test:azure -- sample.wav "What's the weather like"

# Then run the same against YOUR file
npm run test:azure -- path\to\your-file.wav "I like apples"
```

The script ([`scripts/azure-speech-test.js`](../scripts/azure-speech-test.js)) reads `SPEECH_KEY`/`SPEECH_REGION` from `.env`, inspects WAV headers, and runs:

1. **REST recognition only** — proves Azure is reachable and your audio decodes.
2. **REST PA with provided ReferenceText** — scripted path. Should return scores.
3. **REST two-pass** (recognize → PA with recognized text) — what the proxy does for unscripted.
4. **Speech SDK ground truth** — definitive answer: if this returns scores but REST does not, the audio format isn't matching the REST `Content-Type`.

Read the per-test output line `→ NBest[0].PronunciationAssessment:`. If it says `MISSING` for [2]/[3] but the SDK [4] returns numbers, the file is not 16 kHz mono PCM (Azure REST is strict; the SDK auto-handles more formats). Re-export the audio at 16000 Hz / mono / PCM-16 (Audacity: `File → Export → WAV`, with project rate 16 000) and re-run.

> The Speech SDK is a **devDependency** for this script only. The DigitalOcean function stays single-file REST.
