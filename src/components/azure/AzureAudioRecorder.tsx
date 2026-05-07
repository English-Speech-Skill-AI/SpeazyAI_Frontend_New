"use client"

// Azure-direct recorder. Drop-in replacement for `AudioRecorder` (same props/callback shape),
// but runs the Microsoft Speech SDK in the browser to get pronunciation assessment scores
// rather than POSTing base64 audio to a server proxy.
//
// Why: the Azure REST short-audio endpoint cannot score unscripted/free-form audio reliably and
// Microsoft documents this limitation. The browser SDK supports both scripted and unscripted PA,
// handles audio decoding internally, and returns the rich (prosody / syllable / phoneme / break /
// monotone) data Azure produces. We map it back into the existing LC-shaped JSON contract so the
// existing result page continues to work.
//
// Notes
//   - Reads VITE_AZURE_SPEECH_KEY / VITE_AZURE_SPEECH_REGION / VITE_AZURE_SPEECH_LANGUAGE from .env.
//     Restart `npm run dev` after editing them.
//   - Uses the same getUserMedia() stream for both the SDK (via PushAudioInputStream) and a
//     MediaRecorder so we can keep the recording playable in the result page without a second
//     mic prompt.

import React, { useEffect, useRef, useState } from "react"
import * as sdk from "microsoft-cognitiveservices-speech-sdk"
import { Mic, Square, Play, Pause, RotateCcw } from "lucide-react"
import { Button } from "../ui/button"
import { RecordingWaveform } from "../recordingWaveform"
import { LoadingAssessment } from "../loadingAssessment"

type AzureWord = {
  Word: string
  Offset?: number
  Duration?: number
  PronunciationAssessment?: {
    AccuracyScore?: number
    ErrorType?: string
    Feedback?: any
  }
  Syllables?: Array<{
    Syllable: string
    Grapheme?: string
    Offset?: number
    Duration?: number
    PronunciationAssessment?: { AccuracyScore?: number }
  }>
  Phonemes?: Array<{
    Phoneme: string
    Offset?: number
    Duration?: number
    PronunciationAssessment?: { AccuracyScore?: number }
  }>
}

interface AzureAudioRecorderProps {
  expectedText?: string
  lessonColor?: string
  /** Kept for prop compatibility with `AudioRecorder`. Ignored — Azure path. */
  endpoint?: string
  onApiResponse?: ((data: { apiResponse: any; audioUrl: string | null }) => void) | null
}

const RECOGNITION_CONFIG = {
  enableMiscue: true,
  enableProsody: true,
  language: (import.meta.env.VITE_AZURE_SPEECH_LANGUAGE as string | undefined) || "en-US",
}

// ---------- helpers -------------------------------------------------------

function avg(values: number[]): number | null {
  if (!values.length) return null
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

function durationWeightedAvg(values: number[], weights: number[]): number | null {
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  if (!totalWeight) return avg(values)
  let sum = 0
  for (let i = 0; i < values.length; i++) sum += (values[i] || 0) * (weights[i] || 0)
  return Math.round(sum / totalWeight)
}

function mapWord(w: AzureWord) {
  const pa = w.PronunciationAssessment || {}
  const phonemes = (w.Phonemes || []).map((p) => ({
    ipa_label: p.Phoneme || "",
    phoneme: p.Phoneme || "",
    phoneme_score: p.PronunciationAssessment?.AccuracyScore ?? null,
    offset: p.Offset ?? null,
    duration: p.Duration ?? null,
  }))
  const syllables = (w.Syllables || []).map((s) => ({
    syllable: s.Syllable || "",
    grapheme: s.Grapheme || "",
    score: s.PronunciationAssessment?.AccuracyScore ?? null,
    offset: s.Offset ?? null,
    duration: s.Duration ?? null,
  }))
  return {
    word_text: w.Word || "",
    word_score: pa.AccuracyScore ?? 0,
    error_type: pa.ErrorType ?? "None",
    feedback: pa.Feedback ?? null,
    syllables,
    phonemes,
  }
}

function mapToLcShape(input: {
  recognitions: any[]
  expectedText: string
  durationMs: number
}) {
  const { recognitions, expectedText } = input

  const words: ReturnType<typeof mapWord>[] = []
  const accuracyScores: number[] = []
  const fluencyScores: number[] = []
  const completenessScores: number[] = []
  const prosodyScores: number[] = []
  const phraseDurations: number[] = []
  const displayParts: string[] = []

  for (const json of recognitions) {
    const nb = json?.NBest?.[0]
    if (!nb) continue
    if (nb.Display) displayParts.push(nb.Display)
    const pa = nb.PronunciationAssessment || {}
    if (pa.AccuracyScore != null) accuracyScores.push(pa.AccuracyScore)
    if (pa.FluencyScore != null) fluencyScores.push(pa.FluencyScore)
    if (pa.CompletenessScore != null) completenessScores.push(pa.CompletenessScore)
    if (pa.ProsodyScore != null) prosodyScores.push(pa.ProsodyScore)
    const wordList: AzureWord[] = nb.Words || []
    words.push(...wordList.map(mapWord))
    phraseDurations.push(wordList.reduce((s, w) => s + (w.Duration || 0), 0))
  }

  const accuracy = avg(accuracyScores)
  const fluency = durationWeightedAvg(fluencyScores, phraseDurations)
  const completeness = avg(completenessScores)
  const prosody = avg(prosodyScores)

  const valuesForPron = [accuracy ?? 0, fluency ?? 0, completeness ?? 0]
  if (prosody != null) valuesForPron.push(prosody)
  const sorted = [...valuesForPron].sort((a, b) => a - b)
  const pronunciationScore =
    sorted.length === 4
      ? Math.round(sorted[0] * 0.4 + sorted[1] * 0.2 + sorted[2] * 0.2 + sorted[3] * 0.2)
      : sorted.length === 3
      ? Math.round(sorted[0] * 0.4 + sorted[1] * 0.3 + sorted[2] * 0.3)
      : avg(sorted) ?? 0

  const predictedText = displayParts.join(" ").trim()
  const isScripted = !!expectedText

  // Reading metrics for the scripted (passage reading) flow
  const totalWordsRead = words.length
  const speedWpm =
    input.durationMs > 0 ? +((totalWordsRead / (input.durationMs / 60000)) || 0).toFixed(1) : null

  const out: any = {
    pronunciation: {
      overall_score: pronunciationScore,
      prosody_score: prosody,
      accuracy_score: accuracy,
      completeness_score: completeness,
      ...(isScripted && expectedText ? { expected_text: expectedText } : {}),
      words,
    },
    fluency: {
      overall_score: fluency,
      metrics: {
        speech_rate: speedWpm,
        pauses: null,
        filler_words: null,
      },
      feedback: {},
    },
    // IELTS / CEFR predictions are populated asynchronously by the result page via ChatGPT,
    // since Azure does not return them.
    overall: {
      overall_score: pronunciationScore,
      english_proficiency_scores: {
        mock_ielts: { prediction: null },
        mock_cefr: { prediction: null },
        mock_pte: { prediction: null },
      },
    },
    warnings: [],
    metadata: {
      provider: "azure",
      recognition_status: recognitions.length ? "Success" : "NoMatch",
      predicted_text: predictedText,
      content_relevance: 0,
      ...(isScripted && expectedText ? { reference_text: expectedText } : {}),
    },
    pronunciation_score: pronunciationScore,
    fluency_score: fluency,
    overall_score: pronunciationScore,
  }

  if (isScripted) {
    out.reading = {
      accuracy: accuracy != null ? accuracy / 100 : null,
      completion: completeness != null ? completeness / 100 : null,
      accuracy_score: accuracy,
      completeness_score: completeness,
      speed_wpm: speedWpm,
      words_read: totalWordsRead,
    }
  }

  return out
}

function getGradientStyle(lessonColor: string) {
  if (!lessonColor.includes("from-")) return { background: lessonColor }
  const map: Record<string, string> = {
    "from-blue-500 to-cyan-400": "linear-gradient(to right, #3B82F6, #22D3EE)",
    "from-blue-700 to-blue-500": "linear-gradient(to right, #1D4ED8, #3B82F6)",
    "from-cyan-400 to-blue-500": "linear-gradient(to right, #22D3EE, #3B82F6)",
    "from-indigo-500 to-purple-500": "linear-gradient(to right, #6366F1, #A855F7)",
    "from-pink-500 to-rose-500": "linear-gradient(to right, #EC4899, #F43F5E)",
    "from-amber-500 to-red-500": "linear-gradient(to right, #F59E0B, #EF4444)",
    "from-emerald-500 to-emerald-600": "linear-gradient(to right, #10B981, #059669)",
    "from-purple-500 to-pink-500": "linear-gradient(to right, #A855F7, #EC4899)",
  }
  return { background: map[lessonColor] || "linear-gradient(to right, #3B82F6, #22D3EE)" }
}

function formatTime(seconds: number): string {
  if (!seconds && seconds !== 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

// ---------- component -----------------------------------------------------

export function AzureAudioRecorder({
  expectedText = "",
  lessonColor = "from-blue-500 to-cyan-400",
  onApiResponse = null,
}: AzureAudioRecorderProps) {
  const KEY = import.meta.env.VITE_AZURE_SPEECH_KEY as string | undefined
  const REGION = import.meta.env.VITE_AZURE_SPEECH_REGION as string | undefined

  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognitionsRef = useRef<any[]>([])
  const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordedDataUrlRef = useRef<string | null>(null)
  const recordingStartRef = useRef<number>(0)

  // The MediaRecorder stop and the SDK sessionStopped are independent; we wait for both
  // and then emit a single onApiResponse so the consumer can navigate immediately.
  const recordingFinishedRef = useRef<{
    audio?: { url: string; dataUrl: string }
    sessionEnded?: boolean
    durationMs?: number
  }>({})

  useEffect(() => {
    if (!isRecording) return
    timerIntervalRef.current = setInterval(() => setRecordingTime((t) => t + 10), 10)
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [isRecording])

  useEffect(() => () => cleanup(), [])

  function cleanup() {
    try {
      mediaRecorderRef.current?.state !== "inactive" && mediaRecorderRef.current?.stop()
    } catch {
      /* noop */
    }
    try {
      recognizerRef.current?.close()
    } catch {
      /* noop */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioContextRef.current?.close().catch(() => {})
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
  }

  async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
  }

  function maybeEmit() {
    const r = recordingFinishedRef.current
    if (!r.audio || !r.sessionEnded) return
    const lcShaped = mapToLcShape({
      recognitions: recognitionsRef.current,
      expectedText,
      durationMs: r.durationMs ?? 0,
    })
    setAudioUrl(r.audio.url)
    recordedDataUrlRef.current = r.audio.dataUrl
    setIsLoading(false)
    if (onApiResponse) {
      onApiResponse({ apiResponse: lcShaped, audioUrl: r.audio.dataUrl })
    }
  }

  function buildSdkPipeline(stream: MediaStream): sdk.SpeechRecognizer {
    if (!KEY || !REGION) throw new Error("Azure credentials not configured (VITE_AZURE_SPEECH_KEY / VITE_AZURE_SPEECH_REGION).")

    const speechConfig = sdk.SpeechConfig.fromSubscription(KEY, REGION)
    speechConfig.speechRecognitionLanguage = RECOGNITION_CONFIG.language

    // Push raw 16-bit PCM 16 kHz into the SDK; we resample from the user's mic ourselves.
    const pushStream = sdk.AudioInputStream.createPushStream(
      sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1),
    )
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)

    const ac = audioContextRef.current!
    const source = ac.createMediaStreamSource(stream)
    const targetRate = 16000
    const inputRate = ac.sampleRate
    const ratio = inputRate / targetRate
    const bufferSize = 4096
    const processor = ac.createScriptProcessor(bufferSize, 1, 1)
    // ScriptProcessor needs a downstream connection to fire onaudioprocess. We pipe through
    // a muted GainNode so the user doesn't hear their own voice on speakers.
    const muted = ac.createGain()
    muted.gain.value = 0
    source.connect(processor)
    processor.connect(muted)
    muted.connect(ac.destination)

    let streamClosed = false
    processor.onaudioprocess = (e) => {
      if (streamClosed) return
      const input = e.inputBuffer.getChannelData(0)
      const outLen = Math.floor(input.length / ratio)
      const out = new Int16Array(outLen)
      for (let i = 0; i < outLen; i++) {
        const sample = input[Math.floor(i * ratio)]
        const s = Math.max(-1, Math.min(1, sample))
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      try {
        pushStream.write(out.buffer)
      } catch {
        streamClosed = true
      }
    }
    ;(processor as any).__close = () => {
      streamClosed = true
      try { pushStream.close() } catch { /* noop */ }
      try { processor.disconnect() } catch { /* noop */ }
      try { muted.disconnect() } catch { /* noop */ }
      try { source.disconnect() } catch { /* noop */ }
    }

    const paConfig = new sdk.PronunciationAssessmentConfig(
      expectedText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      RECOGNITION_CONFIG.enableMiscue && !!expectedText,
    )
    paConfig.enableProsodyAssessment = RECOGNITION_CONFIG.enableProsody

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
    paConfig.applyTo(recognizer)

    recognizer.recognized = (_s, e) => {
      if (e.result.reason !== sdk.ResultReason.RecognizedSpeech) return
      const raw = e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult)
      if (!raw) return
      try {
        recognitionsRef.current.push(JSON.parse(raw))
      } catch {
        /* ignore */
      }
    }
    recognizer.canceled = (_s, e) => {
      if (e.reason === sdk.CancellationReason.Error) {
        setError(`${sdk.CancellationErrorCode[e.errorCode]}: ${e.errorDetails || "Azure cancelled."}`)
      }
      try {
        recognizer.stopContinuousRecognitionAsync()
      } catch {
        /* noop */
      }
    }
    recognizer.sessionStopped = () => {
      try {
        ;(processor as any).__close?.()
      } catch {
        /* noop */
      }
      recordingFinishedRef.current.sessionEnded = true
      maybeEmit()
    }

    return recognizer
  }

  const startRecording = async () => {
    if (!KEY || !REGION) {
      setError("Azure credentials missing. Set VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION in .env, then restart `npm run dev`.")
      return
    }
    setError(null)
    recognitionsRef.current = []
    recordingFinishedRef.current = {}
    setAudioUrl(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Audio context for waveform analyser AND for the SDK resampler
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      audioContext.createMediaStreamSource(stream).connect(analyser)

      // MediaRecorder for the playback URL stored alongside the result
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : ""
      audioChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = async () => {
        const durationMs = Date.now() - recordingStartRef.current
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" })
        const url = URL.createObjectURL(blob)
        const dataUrl = await blobToDataUrl(blob)
        recordingFinishedRef.current.audio = { url, dataUrl }
        recordingFinishedRef.current.durationMs = durationMs
        maybeEmit()
      }

      // SDK pipeline (resamples mic → 16 kHz mono PCM and pushes to Azure)
      const recognizer = buildSdkPipeline(stream)
      recognizerRef.current = recognizer

      recognizer.startContinuousRecognitionAsync(
        () => {
          recordingStartRef.current = Date.now()
          mediaRecorder.start(250)
          setIsRecording(true)
          setRecordingTime(0)
        },
        (err) => {
          setError(String(err))
          cleanup()
        },
      )
    } catch (err: any) {
      setError(err?.message || String(err))
      cleanup()
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
    setIsLoading(true)
    try {
      mediaRecorderRef.current?.state !== "inactive" && mediaRecorderRef.current?.stop()
    } catch {
      /* noop */
    }
    try {
      recognizerRef.current?.stopContinuousRecognitionAsync()
    } catch {
      /* noop */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  // ---------- audio element wiring (playback) ----------------------------

  const togglePlayback = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }
  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) setCurrentTime(audioRef.current.currentTime)
  }
  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (!audio) return
    const d = audio.duration
    if (Number.isFinite(d) && d > 0) {
      setDuration(d)
      return
    }
    // Chromium reports Infinity for WebM blobs from MediaRecorder; force the browser to
    // compute the real duration by seeking far beyond the end.
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
        audio.currentTime = 0
        audio.removeEventListener("durationchange", onDurationChange)
      }
    }
    audio.addEventListener("durationchange", onDurationChange)
    try { audio.currentTime = Number.MAX_SAFE_INTEGER } catch { /* noop */ }
  }
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => setCurrentTime(parseFloat(e.target.value))
  const handleSeekStart = () => setIsDragging(true)
  const handleSeekEnd = () => {
    if (audioRef.current) audioRef.current.currentTime = currentTime
    setIsDragging(false)
  }

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    a.addEventListener("ended", onEnded)
    return () => {
      a.removeEventListener("ended", onEnded)
    }
  }, [audioUrl])

  const isTailwind = lessonColor.includes("from-")
  const themeColor = isTailwind ? "#2563eb" : (lessonColor.match(/#[0-9a-fA-F]{6}/) || ["#2563eb"])[0]
  const gradientStyle = getGradientStyle(lessonColor)

  return (
    <div className="w-full space-y-6">
      {error && (
        <div style={{ padding: 12, borderRadius: 12, background: "#fee2e2", border: "2px solid #fca5a5", color: "#991b1b" }}>
          {error}
        </div>
      )}

      {!isRecording && !audioUrl && !isLoading && (
        <button
          onClick={startRecording}
          style={{
            ...gradientStyle,
            color: "#FFFFFF",
            borderRadius: "9999px",
            paddingLeft: "2rem",
            paddingRight: "2rem",
            paddingTop: "1.5rem",
            paddingBottom: "1.5rem",
            fontSize: "1.125rem",
            fontWeight: 600,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease-in-out",
            width: "100%",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <Mic style={{ width: 24, height: 24 }} />
          Start Recording
        </button>
      )}

      {isRecording && (
        <div className="flex flex-col items-center space-y-6 p-8 rounded-2xl shadow-lg" style={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}>
          <RecordingWaveform analyser={analyserRef.current} isRecording={isRecording} recordingTime={recordingTime} />
          <Button size="lg" onClick={stopRecording} className="text-white rounded-full px-8 shadow-lg flex items-center gap-2 mt-4" style={{ backgroundColor: "#DC2626" }}>
            <Square className="w-5 h-5" />
            Stop &amp; assess
          </Button>
        </div>
      )}

      {isLoading && <LoadingAssessment />}

      {audioUrl && !isRecording && !isLoading && (
        <div className="w-full animate-in fade-in zoom-in duration-300 flex flex-col gap-4">
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause()
                  audioRef.current.currentTime = 0
                }
                setAudioUrl(null)
                startRecording()
              }}
              style={{
                borderColor: themeColor,
                color: themeColor,
                backgroundColor: "white",
                borderRadius: "9999px",
                paddingLeft: "1.5rem",
                paddingRight: "1.5rem",
                height: "2.5rem",
                fontWeight: 600,
                borderWidth: "2px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <RotateCcw size={16} />
              Record Again
            </Button>
          </div>

          <div style={{ padding: "1.25rem", borderRadius: "1rem", backgroundColor: "white", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                onClick={togglePlayback}
                style={{
                  flexShrink: 0,
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "9999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  ...gradientStyle,
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 4 }} />}
              </button>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.25rem" }}>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekStart}
                  onTouchStart={handleSeekStart}
                  onMouseUp={handleSeekEnd}
                  onTouchEnd={handleSeekEnd}
                  style={{
                    width: "100%",
                    height: "0.375rem",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    backgroundColor: "#f3f4f6",
                    accentColor: themeColor,
                    outline: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 500, color: "#9ca3af" }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              style={{ display: "none" }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
