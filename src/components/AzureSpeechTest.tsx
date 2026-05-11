"use client"

// Standalone Azure Speech pronunciation-assessment test page.
// Uses microsoft-cognitiveservices-speech-sdk DIRECTLY in the browser (no proxy in the loop).
// Mirrors the official sample at:
//   https://learn.microsoft.com/en-us/azure/ai-services/speech-service/pronunciation-assessment-tool
//
// Why this exists: if this page returns real scores, Azure + your key are healthy and any
// null-score behaviour through the proxy is a proxy/audio-format issue, not Azure.
//
// Reads VITE_AZURE_SPEECH_KEY / VITE_AZURE_SPEECH_REGION from .env. Restart `npm run dev`
// after editing .env so Vite picks up the new variables.

import React, { useEffect, useMemo, useRef, useState } from "react"
import * as sdk from "microsoft-cognitiveservices-speech-sdk"
import { applyAzureSpeechAssessmentRecognitionPreferences } from "@/utils/azureSpeechRecognitionConfig"
import { PageHeader } from "./PageHeader"
import { Button } from "./ui/button"
import { Mic, Square, Upload, Loader2 } from "lucide-react"

const SAMPLE_REFERENCE =
  "Today was a beautiful day. We had a great time taking a long walk outside in the morning. The countryside was in full bloom, yet the air was crisp and cold. Towards the end of the day, clouds came in, forecasting much needed rain."

type Status = "idle" | "recording" | "processing" | "done" | "error"

type AzureWord = {
  Word: string
  PronunciationAssessment?: {
    AccuracyScore?: number
    ErrorType?: string
  }
  Phonemes?: Array<{
    Phoneme: string
    PronunciationAssessment?: { AccuracyScore?: number }
  }>
  Duration?: number
}

type AggregatedResult = {
  displayText: string
  accuracyScore: number | null
  fluencyScore: number | null
  completenessScore: number | null
  prosodyScore: number | null
  pronunciationScore: number | null
  words: AzureWord[]
  rawNbest: unknown[]
}

function avg(arr: number[]): number | null {
  if (!arr.length) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

function durationWeightedAvg(values: number[], weights: number[]): number | null {
  const totalW = weights.reduce((a, b) => a + b, 0)
  if (!totalW) return avg(values)
  let sum = 0
  for (let i = 0; i < values.length; i++) sum += (values[i] || 0) * (weights[i] || 0)
  return Math.round(sum / totalW)
}

function colorForScore(score: number | null | undefined): string {
  if (score == null) return "#9CA3AF"
  if (score >= 80) return "#16A34A"
  if (score >= 60) return "#F59E0B"
  return "#DC2626"
}

function colorForErrorType(t: string | undefined): string {
  switch (t) {
    case "Mispronunciation":
      return "#DC2626"
    case "Omission":
      return "#9CA3AF"
    case "Insertion":
      return "#7C3AED"
    case "UnexpectedBreak":
    case "MissingBreak":
    case "Monotone":
      return "#F59E0B"
    default:
      return "#1E3A8A"
  }
}

export function AzureSpeechTest() {
  const KEY = import.meta.env.VITE_AZURE_SPEECH_KEY as string | undefined
  const REGION = import.meta.env.VITE_AZURE_SPEECH_REGION as string | undefined
  const LANG = (import.meta.env.VITE_AZURE_SPEECH_LANGUAGE as string | undefined) || "en-US"

  const [referenceText, setReferenceText] = useState(SAMPLE_REFERENCE)
  const [enableMiscue, setEnableMiscue] = useState(true)
  const [enableProsody, setEnableProsody] = useState(true)
  const [status, setStatus] = useState<Status>("idle")
  const [statusMsg, setStatusMsg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AggregatedResult | null>(null)
  const [partialText, setPartialText] = useState<string>("")
  const [showRawJson, setShowRawJson] = useState(false)

  const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null)
  const recognitionsRef = useRef<any[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const configReady = useMemo(() => Boolean(KEY && REGION), [KEY, REGION])

  useEffect(() => {
    return () => {
      try {
        recognizerRef.current?.close()
      } catch {
        /* noop */
      }
    }
  }, [])

  function buildRecognizer(audioConfig: sdk.AudioConfig): sdk.SpeechRecognizer {
    const speechConfig = sdk.SpeechConfig.fromSubscription(KEY!, REGION!)
    speechConfig.speechRecognitionLanguage = LANG
    applyAzureSpeechAssessmentRecognitionPreferences(speechConfig)

    const paConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      enableMiscue,
    )
    paConfig.enableProsodyAssessment = enableProsody

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
    paConfig.applyTo(recognizer)
    return recognizer
  }

  function aggregate(): void {
    const all = recognitionsRef.current
    if (!all.length) {
      setError("No speech recognized. Try again with clearer audio.")
      setStatus("error")
      return
    }

    const accuracyScores: number[] = []
    const fluencyScores: number[] = []
    const completenessScores: number[] = []
    const prosodyScores: number[] = []
    const durations: number[] = []
    const words: AzureWord[] = []
    const displayParts: string[] = []
    const rawNbest: unknown[] = []

    for (const json of all) {
      const nb = json?.NBest?.[0]
      if (!nb) continue
      rawNbest.push(nb)
      if (nb.Display) displayParts.push(nb.Display)
      const pa = nb.PronunciationAssessment || {}
      if (pa.AccuracyScore != null) accuracyScores.push(pa.AccuracyScore)
      if (pa.FluencyScore != null) fluencyScores.push(pa.FluencyScore)
      if (pa.CompletenessScore != null) completenessScores.push(pa.CompletenessScore)
      if (pa.ProsodyScore != null) prosodyScores.push(pa.ProsodyScore)

      const wordList: AzureWord[] = nb.Words || []
      words.push(...wordList)
      const phraseDuration = wordList.reduce((s, w) => s + (w.Duration || 0), 0)
      durations.push(phraseDuration)
    }

    const accuracyScore = avg(accuracyScores)
    const fluencyScore = durationWeightedAvg(fluencyScores, durations)
    const completenessScore = avg(completenessScores)
    const prosodyScore = avg(prosodyScores)

    const valuesForPron = [accuracyScore ?? 0, fluencyScore ?? 0, completenessScore ?? 0]
    if (prosodyScore != null && enableProsody) valuesForPron.push(prosodyScore)
    const sorted = [...valuesForPron].sort((a, b) => a - b)
    const pronunciationScore = sorted.length === 4
      ? Math.round(sorted[0] * 0.4 + sorted[1] * 0.2 + sorted[2] * 0.2 + sorted[3] * 0.2)
      : sorted.length === 3
      ? Math.round(sorted[0] * 0.4 + sorted[1] * 0.3 + sorted[2] * 0.3)
      : avg(sorted) ?? 0

    setResult({
      displayText: displayParts.join(" "),
      accuracyScore,
      fluencyScore,
      completenessScore,
      prosodyScore,
      pronunciationScore,
      words,
      rawNbest,
    })
    setStatus("done")
    setStatusMsg("")
  }

  function attachHandlers(recognizer: sdk.SpeechRecognizer): void {
    recognizer.recognizing = (_s, e) => {
      setPartialText(e.result.text || "")
    }
    recognizer.recognized = (_s, e) => {
      if (e.result.reason !== sdk.ResultReason.RecognizedSpeech) return
      const raw = e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult)
      if (!raw) return
      try {
        recognitionsRef.current.push(JSON.parse(raw))
      } catch {
        /* ignore unparseable */
      }
    }
    recognizer.canceled = (_s, e) => {
      if (e.reason === sdk.CancellationReason.Error) {
        setError(`${sdk.CancellationErrorCode[e.errorCode]}: ${e.errorDetails}`)
        setStatus("error")
      }
      try {
        recognizer.stopContinuousRecognitionAsync()
      } catch {
        /* noop */
      }
    }
    recognizer.sessionStopped = () => {
      try {
        recognizer.stopContinuousRecognitionAsync()
      } catch {
        /* noop */
      }
      try {
        recognizer.close()
      } catch {
        /* noop */
      }
      setPartialText("")
      aggregate()
    }
  }

  function reset(): void {
    setError(null)
    setResult(null)
    setPartialText("")
    recognitionsRef.current = []
  }

  function startMic(): void {
    if (!configReady) {
      setError("VITE_AZURE_SPEECH_KEY / VITE_AZURE_SPEECH_REGION are not set. Add them to .env and restart `npm run dev`.")
      setStatus("error")
      return
    }
    if (!referenceText.trim()) {
      setError("Reference text is required for pronunciation assessment.")
      setStatus("error")
      return
    }
    reset()
    setStatus("recording")
    setStatusMsg("Listening… speak the reference text now.")
    try {
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput()
      const recognizer = buildRecognizer(audioConfig)
      recognizerRef.current = recognizer
      attachHandlers(recognizer)
      recognizer.startContinuousRecognitionAsync(
        () => {
          /* started */
        },
        (err) => {
          setError(String(err))
          setStatus("error")
        },
      )
    } catch (err: any) {
      setError(err?.message || String(err))
      setStatus("error")
    }
  }

  function stopMic(): void {
    setStatus("processing")
    setStatusMsg("Scoring with Azure…")
    try {
      recognizerRef.current?.stopContinuousRecognitionAsync()
    } catch (err: any) {
      setError(err?.message || String(err))
      setStatus("error")
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    if (!configReady) {
      setError("VITE_AZURE_SPEECH_KEY / VITE_AZURE_SPEECH_REGION are not set. Add them to .env and restart `npm run dev`.")
      setStatus("error")
      return
    }
    if (!referenceText.trim()) {
      setError("Reference text is required for pronunciation assessment.")
      setStatus("error")
      return
    }
    if (!/\.wav$/i.test(file.name)) {
      setError("The SDK file input expects a .wav file (16 kHz mono PCM works best). Use the mic option for other formats.")
      setStatus("error")
      return
    }

    reset()
    setStatus("processing")
    setStatusMsg(`Scoring ${file.name}…`)
    try {
      const audioConfig = sdk.AudioConfig.fromWavFileInput(file)
      const recognizer = buildRecognizer(audioConfig)
      recognizerRef.current = recognizer
      attachHandlers(recognizer)
      recognizer.startContinuousRecognitionAsync()
    } catch (err: any) {
      setError(err?.message || String(err))
      setStatus("error")
    } finally {
      e.target.value = "" // allow re-selecting same file
    }
  }

  // -------- styles ------------------------------------------------------
  const labelStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "#1E3A8A", marginBottom: 6 }
  const cardStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: 24,
  }
  const scoreCardStyle = (score: number | null | undefined): React.CSSProperties => ({
    flex: 1,
    minWidth: 120,
    padding: "16px 20px",
    borderRadius: 16,
    background: "#F3F4F6",
    borderLeft: `6px solid ${colorForScore(score)}`,
  })

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "relative", overflowX: "hidden", width: "100%" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: -10, backgroundColor: "#1E3A8A" }} />
      <PageHeader />

      <div style={{ flex: 1, overflowY: "auto" }} className="[&::-webkit-scrollbar]:hidden">
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 16px", paddingBottom: 96 }}>
          <h1 style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>Azure Speech — Pronunciation Assessment Test</h1>
          <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: 24, fontSize: 14 }}>
            Direct browser-side Speech SDK call. Bypasses the proxy. Reads <code>VITE_AZURE_SPEECH_KEY</code>, <code>VITE_AZURE_SPEECH_REGION</code>, <code>VITE_AZURE_SPEECH_LANGUAGE</code> from <code>.env</code>.
          </p>

          {!configReady && (
            <div style={{ ...cardStyle, borderLeft: "6px solid #DC2626" }}>
              <h3 style={{ color: "#DC2626", margin: 0 }}>Missing configuration</h3>
              <p style={{ color: "#1E3A8A", marginTop: 8 }}>
                Add the following to <code>.env</code> and restart <code>npm run dev</code>:
              </p>
              <pre style={{ background: "#F3F4F6", padding: 12, borderRadius: 8, fontSize: 13 }}>
{`VITE_AZURE_SPEECH_KEY=<your key>
VITE_AZURE_SPEECH_REGION=eastus2
VITE_AZURE_SPEECH_LANGUAGE=en-US`}
              </pre>
            </div>
          )}

          <div style={cardStyle}>
            <div style={labelStyle}>Reference text</div>
            <textarea
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical",
                color: "#1E3A8A",
              }}
              placeholder="Type the script you want the speaker to read…"
            />
            <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#1E3A8A", fontSize: 13 }}>
                <input type="checkbox" checked={enableMiscue} onChange={(e) => setEnableMiscue(e.target.checked)} />
                Enable miscue (omission / insertion / mispronunciation)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#1E3A8A", fontSize: 13 }}>
                <input type="checkbox" checked={enableProsody} onChange={(e) => setEnableProsody(e.target.checked)} />
                Enable prosody assessment
              </label>
            </div>
          </div>

          <div style={{ ...cardStyle, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            {status === "recording" ? (
              <Button onClick={stopMic} style={{ background: "#DC2626", color: "white" }}>
                <Square style={{ width: 16, height: 16, marginRight: 8 }} />
                Stop &amp; assess
              </Button>
            ) : (
              <Button onClick={startMic} disabled={!configReady || status === "processing"} style={{ background: "#3B82F6", color: "white" }}>
                <Mic style={{ width: 16, height: 16, marginRight: 8 }} />
                Record from microphone
              </Button>
            )}

            <Button onClick={() => fileInputRef.current?.click()} disabled={!configReady || status === "recording" || status === "processing"} style={{ background: "#246BCF", color: "white" }}>
              <Upload style={{ width: 16, height: 16, marginRight: 8 }} />
              Upload .wav
            </Button>
            <input ref={fileInputRef} type="file" accept=".wav,audio/wav" style={{ display: "none" }} onChange={handleFileChange} />

            {(status === "recording" || status === "processing") && (
              <span style={{ color: "#1E3A8A", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {status === "processing" && <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />}
                {statusMsg}
              </span>
            )}

            {partialText && (
              <span style={{ color: "#9CA3AF", fontStyle: "italic", flexBasis: "100%", marginTop: 6 }}>
                Hearing: "{partialText}"
              </span>
            )}
          </div>

          {error && (
            <div style={{ ...cardStyle, borderLeft: "6px solid #DC2626", color: "#1E3A8A" }}>
              <strong style={{ color: "#DC2626" }}>Error:</strong> {error}
            </div>
          )}

          {result && (
            <>
              <div style={cardStyle}>
                <div style={{ ...labelStyle, marginBottom: 12 }}>Recognized text</div>
                <div style={{ color: "#1E3A8A", fontSize: 16 }}>{result.displayText || "(none)"}</div>
              </div>

              <div style={cardStyle}>
                <div style={{ ...labelStyle, marginBottom: 12 }}>Scores (0 – 100)</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={scoreCardStyle(result.pronunciationScore)}>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>Pronunciation</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: colorForScore(result.pronunciationScore) }}>{result.pronunciationScore ?? "—"}</div>
                  </div>
                  <div style={scoreCardStyle(result.accuracyScore)}>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>Accuracy</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: colorForScore(result.accuracyScore) }}>{result.accuracyScore ?? "—"}</div>
                  </div>
                  <div style={scoreCardStyle(result.fluencyScore)}>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>Fluency</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: colorForScore(result.fluencyScore) }}>{result.fluencyScore ?? "—"}</div>
                  </div>
                  <div style={scoreCardStyle(result.completenessScore)}>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>Completeness</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: colorForScore(result.completenessScore) }}>{result.completenessScore ?? "—"}</div>
                  </div>
                  {enableProsody && (
                    <div style={scoreCardStyle(result.prosodyScore)}>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>Prosody</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: colorForScore(result.prosodyScore) }}>{result.prosodyScore ?? "—"}</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ ...labelStyle, marginBottom: 12 }}>Word breakdown</div>
                {result.words.length === 0 ? (
                  <div style={{ color: "#9CA3AF" }}>(no words returned)</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {result.words.map((w, i) => {
                      const score = w.PronunciationAssessment?.AccuracyScore ?? null
                      const errType = w.PronunciationAssessment?.ErrorType
                      return (
                        <span
                          key={i}
                          title={`${errType || "None"} • score ${score ?? "—"}`}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            background: "#F3F4F6",
                            color: colorForErrorType(errType),
                            border: `1px solid ${colorForScore(score)}`,
                            fontSize: 14,
                          }}
                        >
                          {w.Word}
                          <small style={{ marginLeft: 6, color: "#6B7280" }}>{score != null ? Math.round(score) : "—"}</small>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={cardStyle}>
                <button
                  onClick={() => setShowRawJson((v) => !v)}
                  style={{ background: "transparent", border: "none", color: "#3B82F6", cursor: "pointer", padding: 0, fontSize: 14 }}
                >
                  {showRawJson ? "Hide raw NBest JSON" : "Show raw NBest JSON"}
                </button>
                {showRawJson && (
                  <pre style={{ background: "#F3F4F6", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", marginTop: 12 }}>
                    {JSON.stringify(result.rawNbest, null, 2)}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
