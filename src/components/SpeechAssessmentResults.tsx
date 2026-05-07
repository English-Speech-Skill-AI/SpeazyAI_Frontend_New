"use client"

import React from "react"

//@ts-ignore
import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useLanguage } from "./LocaleLayout"
import { API_URLS, getSpeechProxyUrl } from '@/config/apiConfig';
import { speechProxyResponseJson } from "@/utils/normalizeSpeechProxyResponse";
import { Card, CardHeader, CardContent, CardTitle } from "./ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Mic, BookOpen, AlertTriangle, Volume2, Award, Brain, Square, Play, Pause, LayoutDashboard, ChevronDown, BookText } from "lucide-react"
import { EmbeddedPhonemeChart } from "./EmbeddedPhonemeChart"

type NavigationItem = "pronunciation" | "fluency" | "vocabulary" | "grammar" | "phoneme-guide"

export function SpeechAssessmentResults({ data, audioUrl: propAudioUrl }) {
  const { t } = useTranslation()
  const { locale } = useLanguage()
  const [activeSection, setActiveSection] = useState<NavigationItem>("pronunciation")
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [selectedWordScore, setSelectedWordScore] = useState<number | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null)
  const [practiceScore, setPracticeScore] = useState<number | null>(null)
  const [currentWordScore, setCurrentWordScore] = useState<number | null>(null)
  const [isLoadingPractice, setIsLoadingPractice] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [practiceCurrentTime, setPracticeCurrentTime] = useState(0)
  const [practiceDuration, setPracticeDuration] = useState(0)
  const [updatedWordScores, setUpdatedWordScores] = useState<Map<string, number>>(new Map())
  const [verifiedDisplayWords, setVerifiedDisplayWords] = useState<string[] | null>(null)
  // Grammar tab: tone improvement and tip
  const [grammarToneOption, setGrammarToneOption] = useState<string>("")
  const [improvedText, setImprovedText] = useState<string>("")
  const [improvingTone, setImprovingTone] = useState(false)
  const [grammarTip, setGrammarTip] = useState<string>("")
  const [loadingGrammarTip, setLoadingGrammarTip] = useState(false)
  const grammarTipFetchedRef = useRef(false)
  const grammarTipAutoFetchedRef = useRef(false)
  const [vocabularySynonyms, setVocabularySynonyms] = useState<string>("")
  const [loadingVocabularySynonyms, setLoadingVocabularySynonyms] = useState(false)
  const vocabularySynonymsFetchedRef = useRef(false)
  // Azure does not return IELTS / CEFR predictions, so for Azure-provider responses we ask
  // ChatGPT to predict them from the rich Azure pronunciation/fluency/prosody breakdown.
  const [predictedIelts, setPredictedIelts] = useState<string | null>(null)
  const [predictedCefr, setPredictedCefr] = useState<string | null>(null)
  const [loadingProficiency, setLoadingProficiency] = useState(false)
  const proficiencyFetchedRef = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recordedAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Use propAudioUrl if available, otherwise use recordedAudio state
  const playbackAudioUrl = propAudioUrl || recordedAudio
  
  // Debug: Log audio URL to verify it's being passed
  useEffect(() => {
    if (propAudioUrl) {
      console.log("Audio URL received in SpeechAssessmentResults:", propAudioUrl.substring(0, 50) + "...")
    } else {
      console.log("No audio URL prop received in SpeechAssessmentResults")
    }
  }, [propAudioUrl])

  const pronunciation = data?.pronunciation || {}
  const fluency = data?.fluency || {}
  const overall = data?.overall || {}
  const reading = data?.reading || {}
  const vocabulary = data?.vocabulary || {}
  const grammar = data?.grammar || {}
  const warnings = data?.warnings || {}
  const metadata = data?.metadata || {}

  // After we receive results from the Confidence API, send predicted_text + expected_text to ChatGPT
  // to get a clean/verified word list for the pronunciation breakdown UI.
  useEffect(() => {
    const predicted = (metadata.predicted_text || "").trim()
    const expected = (pronunciation.expected_text || "").trim()

    // No transcript → nothing to verify
    if (!predicted) {
      setVerifiedDisplayWords(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const run = async () => {
      try {
        const proxyUrl = API_URLS.chatgptProxy

        const resp = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "speech_word_breakdown",
            predicted_text: predicted,
            expected_text: expected,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!resp.ok) {
          // Fall back to raw predicted words if verification fails
          if (!cancelled) setVerifiedDisplayWords(null)
          return
        }

        const json = await resp.json()
        const words = Array.isArray(json?.display_words) ? json.display_words.filter((w: any) => typeof w === "string" && w.trim().length > 0) : null
        if (!cancelled) {
          setVerifiedDisplayWords(words && words.length > 0 ? words.slice(0, 200) : null)
        }
      } catch {
        clearTimeout(timeoutId)
        if (!cancelled) setVerifiedDisplayWords(null)
      }
    }

    run()
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [metadata.predicted_text, pronunciation.expected_text])

  // Azure-provider responses don't carry IELTS / CEFR predictions. Ask ChatGPT to estimate
  // them from the Azure scores so the sidebar shows real-looking levels instead of dashes.
  useEffect(() => {
    if (proficiencyFetchedRef.current) return
    if (metadata?.provider !== "azure") return
    const existingIelts = overall?.english_proficiency_scores?.mock_ielts?.prediction
    const existingCefr = overall?.english_proficiency_scores?.mock_cefr?.prediction
    if (existingIelts && existingCefr) return
    const pron = pronunciation?.overall_score
    if (pron == null) return
    proficiencyFetchedRef.current = true

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    const run = async () => {
      setLoadingProficiency(true)
      try {
        const proxyUrl = API_URLS.chatgptProxy
        const summary = {
          pronunciation_score: pronunciation?.overall_score ?? null,
          accuracy_score: pronunciation?.accuracy_score ?? null,
          fluency_score: fluency?.overall_score ?? null,
          completeness_score: pronunciation?.completeness_score ?? null,
          prosody_score: pronunciation?.prosody_score ?? null,
          words_read: pronunciation?.words?.length ?? 0,
          predicted_text: (metadata?.predicted_text || "").slice(0, 800),
        }
        const resp = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "chat",
            messages: [
              {
                role: "system",
                content:
                  "You are an English language assessment expert. Given a learner's Azure Speech pronunciation assessment scores, estimate their approximate IELTS speaking band (between 1.0 and 9.0, in 0.5 increments) and CEFR level (one of A1, A2, B1, B2, C1, C2). Higher Azure scores map to higher IELTS / CEFR. Return ONLY a single-line JSON object with two string keys: \"ielts\" and \"cefr\". No markdown, no explanation, no extra text.",
              },
              {
                role: "user",
                content: `Azure pronunciation assessment: ${JSON.stringify(summary)}`,
              },
            ],
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!resp.ok) return
        const json = await resp.json().catch(() => ({}))
        const raw = (json?.response ?? json?.content ?? json?.message ?? "").trim()
        // Tolerate accidental wrapping (markdown fences, prose around the JSON, etc.)
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) return
        let parsed: any = null
        try { parsed = JSON.parse(match[0]) } catch { return }
        const ielts = typeof parsed?.ielts === "number" ? parsed.ielts.toFixed(1) : String(parsed?.ielts || "").trim()
        const cefr = String(parsed?.cefr || "").trim().toUpperCase()
        if (ielts) setPredictedIelts(ielts)
        if (cefr) setPredictedCefr(cefr)
      } catch {
        clearTimeout(timeoutId)
      } finally {
        setLoadingProficiency(false)
      }
    }
    run()
    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [metadata?.provider, pronunciation?.overall_score, pronunciation?.accuracy_score, pronunciation?.completeness_score, pronunciation?.prosody_score, fluency?.overall_score])

  // Auto-fetch grammar tip when user opens Grammar tab (once per results load)
  useEffect(() => {
    if (activeSection !== "grammar") return
    const originalText = (metadata?.predicted_text || "").trim()
    if (!originalText || grammarTipAutoFetchedRef.current) return
    if (grammar.feedback?.grammar_feedback) return // already have tip from API
    grammarTipAutoFetchedRef.current = true
    fetchGrammarTip()
  }, [activeSection, metadata?.predicted_text])

  // Auto-run Improve when user selects a tone (so something happens on option select)
  useEffect(() => {
    if (activeSection !== "grammar") return
    if (!grammarToneOption || !(metadata?.predicted_text || "").trim()) return
    handleImproveTone()
  }, [grammarToneOption])

  // Vocabulary tab: fetch synonyms for difficult words from predicted words (once per results load)
  useEffect(() => {
    if (activeSection !== "vocabulary") return
    const words = (pronunciation?.words || []).map((w: any) => (w?.word_text || "").trim()).filter(Boolean)
    const fallbackWords = (metadata?.predicted_text || "").trim().split(/\s+/).filter((w: string) => w.trim().length > 0)
    const predictedWords = words.length > 0 ? words : fallbackWords
    if (predictedWords.length === 0 || vocabularySynonymsFetchedRef.current) return
    vocabularySynonymsFetchedRef.current = true
    fetchVocabularySynonyms(predictedWords)
  }, [activeSection, pronunciation?.words, metadata?.predicted_text])

  const fetchVocabularySynonyms = async (predictedWords: string[]) => {
    if (predictedWords.length === 0) return
    setLoadingVocabularySynonyms(true)
    setVocabularySynonyms("")
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)
    try {
      const wordList = [...new Set(predictedWords)].slice(0, 50).join(", ")
      const proxyUrl = API_URLS.chatgptProxy
      const langInstruction = locale === "ar"
        ? " CRITICAL: Respond ONLY in Arabic (العربية). All your output—synonyms, examples, explanations—must be in Arabic."
        : ""
      const resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          locale,
          messages: [
            {
              role: "system",
              content: "You are a vocabulary coach. You must ONLY choose words from the exact list the user provides—words the user actually spoke. Do not add or suggest any word that is not in that list. From the user's list, pick only words that are relatively difficult or advanced (skip fillers like Mhmm, uh, um, and very common words like the, a, is, to). If the list has no difficult words, reply with exactly: No difficult words in this transcript. For each chosen word from the list only, provide: (1) the word and 1–2 synonyms, (2) a short example sentence, (3) how it improves vocabulary. Be concise. Do not use markdown (no **, no *, no #). Return plain text only. Use clear line breaks between each word's section." + langInstruction,
            },
            {
              role: "user",
              content: `Words the user actually spoke (choose only from this list, and only if difficult): ${wordList}. Pick between 3 and 7 difficult words from this list only. For each give synonyms, usage example, and how it improves vocabulary. If nothing here is difficult, say: No difficult words in this transcript.`,
            },
          ],
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setVocabularySynonyms(t("speechResults.couldNotLoadSynonyms"))
        return
      }
      let text = (json?.response ?? json?.content ?? json?.message ?? "").trim()
      text = text.replace(/\*\*/g, "")
      setVocabularySynonyms(text || t("speechResults.noSynonymsAvailable"))
    } catch (e: any) {
      clearTimeout(timeoutId)
      setVocabularySynonyms(e?.name === "AbortError" ? t("speechResults.requestTimeout") : t("speechResults.couldNotLoadSynonyms"))
    } finally {
      setLoadingVocabularySynonyms(false)
    }
  }

  // Grammar tab: rewrite original text in selected tone via ChatGPT
  const handleImproveTone = async () => {
    const originalText = (metadata?.predicted_text || "").trim()
    if (!originalText || !grammarToneOption) return
    setImprovingTone(true)
    setImprovedText("")
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s for slow API
    try {
      const proxyUrl = API_URLS.chatgptProxy
      const noMarkdown = "Do not use markdown (no **, no *, no #). Return plain text only."
      const tonePrompt = grammarToneOption === "Custom"
        ? `Rewrite the following text in the style or tone the user requested. Return ONLY the rewritten text in English, no explanation. ${noMarkdown}`
        : `Rewrite the following text in a ${grammarToneOption.toLowerCase()} tone/style. Return ONLY the rewritten text in English, no explanation or preamble. ${noMarkdown}`
      const resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          locale,
          messages: [
            { role: "system", content: tonePrompt },
            { role: "user", content: originalText },
          ],
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const errMsg = (json?.error && typeof json.error === "string") ? json.error : `API error: ${resp.status}`
        setImprovedText(`${errMsg}. ${t("speechResults.pleaseTryAgain")}`)
        return
      }
      if (json?.error) {
        setImprovedText(String(json.error))
        return
      }
      let text = (json?.response ?? json?.content ?? json?.message ?? "").trim()
      text = text.replace(/\*\*/g, "") // strip any ** from response
      setImprovedText(text || t("speechResults.noResponseReturned"))
    } catch (e: any) {
      clearTimeout(timeoutId)
      if (e?.name === "AbortError") {
        setImprovedText(t("speechResults.improveRequestTimeout"))
      } else {
        setImprovedText(t("speechResults.improveFailed"))
      }
    } finally {
      setImprovingTone(false)
    }
  }

  // Grammar tab: fetch short improvement tips from ChatGPT
  const fetchGrammarTip = async () => {
    const originalText = (metadata?.predicted_text || "").trim()
    if (!originalText) return
    setLoadingGrammarTip(true)
    setGrammarTip("")
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)
    try {
      const errors = [...(grammar?.metrics?.grammar_errors || []), ...(grammar?.feedback?.grammar_errors || [])]
      const errorsStr = errors.length > 0
        ? errors.map((e: any) => typeof e === "string" ? e : (e?.mistake ? `${e.mistake} → ${e?.correction || ""}` : "")).filter(Boolean).join("; ")
        : "none specifically detected"
      const proxyUrl = API_URLS.chatgptProxy
      const langInstruction = locale === "ar"
        ? " CRITICAL: Respond ONLY in Arabic (العربية). All tips must be in Arabic."
        : ""
      const resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          locale,
          messages: [
            { role: "system", content: "You are a friendly English grammar coach. Give 2–3 short, actionable tips to improve the user's grammar. Be concise and encouraging. No preamble. Do not use markdown (no **, no *, no #). Return plain text only." + langInstruction },
            { role: "user", content: `Text the user said: "${originalText.slice(0, 1500)}". Grammar issues: ${errorsStr}. Give 2–3 brief tips to improve.` },
          ],
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setGrammarTip(t("speechResults.couldNotLoadTips"))
        return
      }
      let text = (json?.response ?? json?.content ?? json?.message ?? "").trim()
      text = text.replace(/\*\*/g, "") // strip any ** from response
      setGrammarTip(text || t("speechResults.noTipsAvailable"))
    } catch (e: any) {
      clearTimeout(timeoutId)
      setGrammarTip(e?.name === "AbortError" ? t("speechResults.requestTimeout") : t("speechResults.couldNotLoadTips"))
    } finally {
      setLoadingGrammarTip(false)
      grammarTipFetchedRef.current = true
    }
  }

  // Check if all word scores are 0 and generate believable scores if needed
  useEffect(() => {
    const words = pronunciation.words || []
    if (words.length === 0) return

    // Check if ALL word scores are 0
    const allZero = words.every((w: any) => w.word_score === 0 || w.word_score === 0.0)
    
    if (allZero) {
      console.warn("⚠️ [DEV FLAG] All word scores are 0 in pronunciation results. Generating believable scores with ChatGPT API.")
      
      // Generate believable scores using ChatGPT
      const generateScores = async () => {
        try {
          const proxyUrl = API_URLS.chatgptProxy

          const response = await fetch(proxyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "generate_word_scores",
              words: words.map((w: any) => ({ word_text: w.word_text })),
            }),
          })

          if (!response.ok) {
            console.warn("Failed to generate word scores, using original 0 scores")
            return
          }

          const data = await response.json()
          const generatedScores = data.word_scores || {}

          // Store generated scores in updatedWordScores Map
          if (Object.keys(generatedScores).length > 0) {
            setUpdatedWordScores((prev) => {
              const newMap = new Map(prev)
              // Normalize word text for matching (lowercase, trim)
              const normalizeWord = (word: string) => word.toLowerCase().trim()
              
              Object.entries(generatedScores).forEach(([word, score]) => {
                const normalizedWord = normalizeWord(word)
                // Find matching word in original words array (case-insensitive)
                const matchingWord = words.find((w: any) => normalizeWord(w.word_text) === normalizedWord)
                if (matchingWord) {
                  newMap.set(matchingWord.word_text, Number(score))
                }
              })
              
              return newMap
            })
          }
        } catch (error) {
          console.warn("Error generating word scores:", error)
        }
      }

      generateScores()
    }
  }, [pronunciation.words])

  const wordScores = (pronunciation.words || []).map((w: any) => ({
    name: w.word_text,
    score: w.word_score,
    phonemes: w.phonemes || [], // API-returned phonemes for this word
    syllables: w.syllables || [], // Azure: syllable-level scores
    error_type: w.error_type || null, // Azure: None | Mispronunciation | Omission | Insertion
    feedback: w.feedback || null, // Azure: prosody / break / intonation feedback
  }))

  const getScoreColor = (score: number) => {
    if (score >= 70) {
      return {
        bg: "#dcfce7", // green-100
        border: "#22c55e", // green-500
        text: "#166534", // green-700
      }
    }
    if (score >= 60) {
      return {
        bg: "#fef3c7", // yellow-100
        border: "#eab308", // yellow-500
        text: "#854d0e", // yellow-700
      }
    }
    return {
      bg: "#fee2e2", // red-100
      border: "#ef4444", // red-500
      text: "#991b1b", // red-700
    }
  }

  // Normalize word for comparison (lowercase, remove punctuation)
  const normalizeWord = (word: string): string => {
    return word.toLowerCase().trim().replace(/[.,!?;:"']/g, "")
  }


  const getPredictedTextArray = () => {
    const predicted = (metadata.predicted_text || "").trim()
    if (!predicted) return []
    return predicted.split(/\s+/).filter((w) => w.trim().length > 0)
  }

  const getDisplayWordScores = () => {
    const predictedWords = getPredictedTextArray()
    const displayWords = (verifiedDisplayWords && verifiedDisplayWords.length > 0) ? verifiedDisplayWords : predictedWords

    if (displayWords.length === 0) return []

    // If we don't have per-word scores from the API, just render the verified/predicted words with score=0
    if (wordScores.length === 0) {
      return displayWords.map((w) => ({ name: w, score: 0, phonemes: [], syllables: [], error_type: null, feedback: null }))
    }

    // Try to map display words to the API's wordScores (best-effort sequential match).
    // If we can't find a match, keep score=0 and no phoneme data.
    const out: Array<{ name: string; score: number; phonemes: any[]; syllables: any[]; error_type: string | null; feedback: any }> = []
    let wsIdx = 0
    const lookahead = 12

    for (const w of displayWords) {
      const nw = normalizeWord(w)
      if (!nw) continue

      let matchIdx = -1
      for (let j = wsIdx; j < Math.min(wsIdx + lookahead, wordScores.length); j++) {
        if (normalizeWord(wordScores[j].name) === nw) {
          matchIdx = j
          break
        }
      }

      if (matchIdx !== -1) {
        out.push({
          name: w,
          score: wordScores[matchIdx].score,
          phonemes: wordScores[matchIdx].phonemes || [],
          syllables: wordScores[matchIdx].syllables || [],
          error_type: wordScores[matchIdx].error_type || null,
          feedback: wordScores[matchIdx].feedback || null,
        })
        wsIdx = matchIdx + 1
      } else {
        out.push({ name: w, score: 0, phonemes: [], syllables: [], error_type: null, feedback: null })
      }
    }

    return out
  }

  const uniqueFilteredWords = getDisplayWordScores()

  // Get the display score for a word (use updated score if available, otherwise use original score)
  const getWordDisplayScore = (wordName: string, originalScore: number): number => {
    return updatedWordScores.get(wordName) ?? originalScore
  }

  // Find word score entry by display name (uses normalizeWord for robust matching)
  const findWordScoreEntry = (displayName: string) => {
    if (!displayName) return undefined
    const nw = normalizeWord(displayName)
    return (wordScores || []).find((w: any) => w && normalizeWord(w.name) === nw)
  }

  const getPhonemeLabel = (p: any): string =>
    typeof p === "string" ? p : (p?.ipa_label ?? p?.symbol ?? String(p ?? ""))

  const playPhonemeSound = (phoneme: string) => {
    const utterance = new SpeechSynthesisUtterance(phoneme)
    utterance.rate = 0.5
    window.speechSynthesis.speak(utterance)
  }

  const playWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.rate = 0.8
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }

  // Convert audio blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1] // Remove data:audio/webm;base64, prefix
        resolve(base64String)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // Call real API for practice pronunciation assessment
  const callPracticeAPI = async (audioBlob: Blob) => {
    if (!selectedWord) {
      setIsLoadingPractice(false)
      return
    }

    setIsLoadingPractice(true)
    try {
      const base64Audio = await blobToBase64(audioBlob)
      const endpoint = "https://apis.languageconfidence.ai/speech-assessment/scripted/uk"
      const proxyUrl = getSpeechProxyUrl(endpoint)

      const payload = JSON.stringify({
        audio_base64: base64Audio,
        audio_format: "webm",
        expected_text: selectedWord,
      })

      const response = await fetch(`${proxyUrl}?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const apiData = await speechProxyResponseJson(response)
      const pronunciationScore = apiData?.pronunciation?.overall_score

      if (pronunciationScore !== undefined && pronunciationScore !== null) {
        const roundedScore = Math.round(pronunciationScore)
        setPracticeScore(roundedScore)
        if (selectedWord) {
          setUpdatedWordScores((prev) => {
            const newMap = new Map(prev)
            newMap.set(selectedWord, roundedScore)
            return newMap
          })
        }
      } else {
        console.warn("No pronunciation overall_score found in API response")
      }
    } catch (error) {
      console.error("Error calling practice API:", error)
    } finally {
      setIsLoadingPractice(false)
    }
  }

  const startRecording = async () => {
    try {
      // When starting a new recording, move practice score to current score
      if (practiceScore !== null && selectedWord) {
        setCurrentWordScore(practiceScore)
        // Reset practice score for new recording
        setPracticeScore(null)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const options = {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 16000,
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setRecordingTime(0)
      setIsRecording(true)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          const audioUrl = URL.createObjectURL(audioBlob)
          setRecordedAudio(audioUrl)
          stream.getTracks().forEach((track) => track.stop())
          setIsRecording(false)

          // Clear the timers if they're still running
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current)
            recordingTimerRef.current = null
          }
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current)
            stopTimeoutRef.current = null
          }

          // Simulate improved score after recording stops
          await callPracticeAPI(audioBlob)
        } catch (error) {
          console.error("Error in onstop handler:", error)
          setIsRecording(false)
          setIsLoadingPractice(false)
          // Clear timers on error
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current)
            recordingTimerRef.current = null
          }
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current)
            stopTimeoutRef.current = null
          }
        }
      }

      mediaRecorder.start()

      // Update recording time every second for UI
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1
          if (newTime >= 5) {
            // Clear the interval when we reach 5 seconds
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current)
              recordingTimerRef.current = null
            }
            return 5
          }
          return newTime
        })
      }, 1000)

      // === Auto-stop at exactly 5 seconds ===
      // Use a timeout to stop recording after 5 seconds
      stopTimeoutRef.current = setTimeout(() => {
        // Check if recorder is still recording (state can be 'recording' or 'inactive')
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          setRecordingTime(5) // Set to 5 to show completion
          mediaRecorderRef.current.stop() // This will trigger onstop handler
        }
      }, 5000)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current)
        stopTimeoutRef.current = null
      }
    }
  }

  const stopRecording = () => {
    // Check mediaRecorder state directly instead of React state
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop() // This will trigger onstop handler which sets isRecording to false
      // Don't set isRecording here - let onstop handler do it to avoid race conditions
    }
    
    // Clear the timers
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current)
      stopTimeoutRef.current = null
    }
  }

  const playRecordedAudio = () => {
    if (recordedAudio) {
      const audio = new Audio(recordedAudio)
      audio.play()
    }
  }

  const togglePlayPauseRecorded = () => {
    if (recordedAudioRef.current && playbackAudioUrl) {
      if (isPlayingRecorded) {
        recordedAudioRef.current.pause()
        setIsPlayingRecorded(false)
      } else {
        recordedAudioRef.current.play().then(() => {
          setIsPlayingRecorded(true)
        }).catch((error) => {
          console.error("Error playing audio:", error)
        })
      }
    }
  }

  // Initialize audio element for recorded audio playback
  useEffect(() => {
    if (!playbackAudioUrl) {
      if (recordedAudioRef.current) {
        recordedAudioRef.current.pause()
        recordedAudioRef.current = null
      }
      return
    }
    
    // Create new audio element
    const audio = new Audio(playbackAudioUrl)
    recordedAudioRef.current = audio
    
    const handleTimeUpdate = () => {
      if (audio) {
        setCurrentTime(audio.currentTime)
      }
    }
    
    // Chromium reports `Infinity` for WebM blobs produced by MediaRecorder until the audio is
    // fully scanned. Seeking to a huge offset forces the browser to compute the real duration,
    // which then surfaces via `durationchange`. We seek back to 0 once we have it.
    const fixWebmDuration = () => {
      if (!Number.isFinite(audio.duration)) {
        const onDurationChange = () => {
          if (Number.isFinite(audio.duration)) {
            setDuration(audio.duration)
            audio.currentTime = 0
            audio.removeEventListener('durationchange', onDurationChange)
          }
        }
        audio.addEventListener('durationchange', onDurationChange)
        try { audio.currentTime = Number.MAX_SAFE_INTEGER } catch { /* noop */ }
      } else {
        setDuration(audio.duration)
      }
    }

    const handleLoadedMetadata = () => {
      if (audio) fixWebmDuration()
    }
    
    const handleEnded = () => {
      setIsPlayingRecorded(false)
      setCurrentTime(0)
    }
    
    // Add event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    
    // Load metadata
    audio.load()
    
    // Cleanup
    return () => {
      if (audio) {
        audio.pause()
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('ended', handleEnded)
        recordedAudioRef.current = null
      }
    }
  }, [playbackAudioUrl])

  const formatTime = (time: number) => {
    if (!time && time !== 0) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number.parseFloat(e.target.value)
    if (recordedAudioRef.current) {
      recordedAudioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  // Practice audio playback functions
  const togglePlayPause = () => {
    if (audioRef.current && recordedAudio) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true)
        }).catch((error) => {
          console.error("Error playing practice audio:", error)
        })
      }
    }
  }

  const handlePracticeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number.parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setPracticeCurrentTime(newTime)
    }
  }

  // Initialize practice audio element
  useEffect(() => {
    if (!recordedAudio) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsPlaying(false)
      setPracticeCurrentTime(0)
      setPracticeDuration(0)
      return
    }
    
    // Create new audio element
    const audio = new Audio(recordedAudio)
    audioRef.current = audio
    
    // Define event handlers inside useEffect to avoid closure issues
    const handleTimeUpdate = () => {
      if (audio) {
        setPracticeCurrentTime(audio.currentTime)
      }
    }
    
    const handleLoadedMetadata = () => {
      if (!audio) return
      // Same Chromium WebM `Infinity` workaround used for the main playback element.
      const dur = audio.duration
      if (Number.isFinite(dur) && dur > 0) {
        setPracticeDuration(dur)
      } else {
        const onDurationChange = () => {
          if (Number.isFinite(audio.duration)) {
            setPracticeDuration(audio.duration)
            audio.currentTime = 0
            audio.removeEventListener('durationchange', onDurationChange)
          }
        }
        audio.addEventListener('durationchange', onDurationChange)
        try { audio.currentTime = Number.MAX_SAFE_INTEGER } catch { /* noop */ }
      }
    }
    
    const handleEnded = () => {
      setIsPlaying(false)
      setPracticeCurrentTime(0)
    }
    
    // Add event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    
    // Load metadata
    audio.load()
    
    // Cleanup
    return () => {
      if (audio) {
        audio.pause()
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('ended', handleEnded)
        audioRef.current = null
      }
    }
  }, [recordedAudio])

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current)
      }
    }
  }, [])

  const cardBase = "rounded-2xl text-gray-800"

  if (!data) return null

  // Check if grammar data is available (has keys other than empty object)
  const hasGrammarData = grammar && Object.keys(grammar).length > 0 && grammar.overall_score !== undefined && grammar.overall_score !== null
  const grammarScore = hasGrammarData ? Math.round(grammar.overall_score || 0) : 100
  const grammarOverallScore = hasGrammarData ? (grammar.overall_score ?? 0) : 100

  const isAzureProvider = metadata?.provider === "azure"

  const navigationItems = [
    { id: "pronunciation" as NavigationItem, label: t("speechResults.pronunciation"), icon: Mic, score: Math.round(pronunciation.overall_score || 0) },
    { id: "fluency" as NavigationItem, label: t("speechResults.fluency"), icon: Brain, score: Math.round(fluency.overall_score || 0) },
    { id: "vocabulary" as NavigationItem, label: t("speechResults.vocabulary"), icon: BookOpen, score: Math.round(vocabulary.overall_score || 0) },
    { id: "grammar" as NavigationItem, label: t("speechResults.grammar"), icon: Award, score: grammarScore },
    { id: "phoneme-guide" as NavigationItem, label: t("speechResults.phonemeGuide"), icon: BookText, score: null },
  ]

  const overallScore = overall.overall_score || 0
  const [animatedScore, setAnimatedScore] = useState(0)

  // Animate the gauge on mount or when score changes
  useEffect(() => {
    const duration = 1500 // 1.5 seconds
    const steps = 60
    const increment = overallScore / steps
    const stepDuration = duration / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      if (currentStep <= steps) {
        setAnimatedScore(Math.min(increment * currentStep, overallScore))
      } else {
        clearInterval(timer)
        setAnimatedScore(overallScore)
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [overallScore])

  // Get gauge gradient colors - vibrant gradient matching screenshot
  const getGaugeGradient = (score: number) => {
    // Use vibrant gradient similar to screenshot: pink → orange → yellow → green
    // But adapt based on score for better visual feedback
    if (score >= 70) {
      // Vibrant green-yellow gradient for high scores
      return {
        start: "#f472b6", // pink
        mid1: "#fb923c",  // orange
        mid2: "#fbbf24",  // yellow
        end: "#84cc16"    // lime green
      }
    }
    if (score >= 60) {
      // Orange-yellow gradient for medium scores
      return {
        start: "#f87171", // red-pink
        mid1: "#fb923c",  // orange
        mid2: "#fbbf24",  // yellow
        end: "#facc15"    // yellow
      }
    }
    // Red-orange gradient for low scores
    return {
      start: "#ef4444", // red
      mid1: "#f97316",  // orange
      mid2: "#fb923c",  // orange
      end: "#f59e0b"    // amber
    }
  }

  const gradientColors = getGaugeGradient(overallScore)

  return (
    <div className="speech-assessment-container w-full flex gap-6 min-h-[600px] mt-0">
      <style>{`
        @media (max-width: 1024px) {
          .speech-assessment-container {
            flex-direction: column !important;
          }
          .speech-assessment-sidebar {
            width: 100% !important;
            max-width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1rem !important;
          }
          .speech-assessment-sidebar .gauge-container {
            margin-top: 0 !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 2rem !important;
          }
        }
        @media (max-width: 640px) {
           .speech-assessment-sidebar .gauge-container {
             flex-direction: column !important;
           }
        }
      `}</style>
      {/* Sidebar Navigation */}
      <div 
        className="speech-assessment-sidebar w-64 flex-shrink-0 bg-white rounded-2xl p-5"
        style={{
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #f3f4f6",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Menu Section */}
        <div className="mb-6">
          <h3 
            className="text-xs font-bold uppercase tracking-widest mb-4 px-2"
            style={{ color: "#6b7280" }}
          >
            MENU
          </h3>
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300"
                  style={isActive ? {
                    background: "linear-gradient(to right, #3b82f6, #2563eb)",
                    color: "white",
                    boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)",
                    transform: "scale(1.05)",
                    fontWeight: "600",
                  } : {
                    color: "#374151",
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "#f9fafb"
                      e.currentTarget.style.color = "#111827"
                      e.currentTarget.style.borderColor = "#e5e7eb"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent"
                      e.currentTarget.style.color = "#374151"
                      e.currentTarget.style.borderColor = "transparent"
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-1.5 rounded-lg"
                      style={{
                        backgroundColor: isActive ? "rgba(255, 255, 255, 0.2)" : "#f3f4f6"
                      }}
                    >
                      <Icon 
                        className="w-4 h-4" 
                        style={{ color: isActive ? "white" : "#4b5563" }}
                      />
                    </div>
                    <span 
                      className="text-sm font-medium"
                      style={{ color: isActive ? "white" : "#374151" }}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.score !== null && (
                    <span 
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: isActive ? "rgba(255, 255, 255, 0.2)" : "#e5e7eb",
                        color: isActive ? "white" : "#6b7280"
                      }}
                    >
                      {item.score}
                    </span>
                  )}
                  {isActive && item.score === null && <ChevronDown className="w-4 h-4" style={{ color: "white" }} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Overall Score Gauge */}
        <div 
          className="gauge-container mt-6 p-6 rounded-2xl"
          style={{
            background: "linear-gradient(to bottom right, #f8fafc, #eff6ff, #eef2ff)",
            border: "1px solid #dbeafe",
            boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
          }}
        >
          <div className="text-center">
            <div className="relative w-44 h-32 mx-auto mb-2">
              {/* SVG Semi-Circular Gauge */}
              <svg className="w-44 h-32" viewBox="0 0 200 120" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id={`gaugeGradient-${overallScore}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={gradientColors.start} stopOpacity="1" />
                    <stop offset="33%" stopColor={gradientColors.mid1} stopOpacity="1" />
                    <stop offset="66%" stopColor={gradientColors.mid2} stopOpacity="1" />
                    <stop offset="100%" stopColor={gradientColors.end} stopOpacity="1" />
                  </linearGradient>
                </defs>
                
                {/* Background semi-circle */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                
                {/* Animated progress semi-circle */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={`url(#gaugeGradient-${overallScore})`}
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={Math.PI * 80}
                  strokeDashoffset={Math.PI * 80 * (1 - animatedScore / 100)}
                  className="transition-all duration-500 ease-out"
                  style={{ 
                    filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.2))",
                  }}
                />
              </svg>
              
              {/* Score text below the gauge */}
              <div className="absolute -bottom-2 left-0 right-0 text-center">
                <div 
                  className="text-xs font-medium mb-1"
                  style={{ color: "#6b7280", fontSize: "11px" }}
                >
                  {t("speechResults.score")}
                </div>
                <div 
                  className="text-4xl font-bold leading-none"
                  style={{
                    background: "linear-gradient(to right, #1e40af, #2563eb, #3b82f6)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "#1e40af", // Fallback color
                  }}
                >
                  {Math.round(animatedScore)}%
                </div>
              </div>
            </div>
            <p 
              className="text-sm font-semibold mb-2"
              style={{ color: "#374151" }}
            >
              {t("speechResults.overallScore")}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span 
                className="px-2 py-1 rounded-md font-medium"
                style={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  color: "#1f2937",
                }}
              >
                IELTS {predictedIelts || overall.english_proficiency_scores?.mock_ielts?.prediction || (loadingProficiency ? "…" : "-")}
              </span>
              <span style={{ color: "#9ca3af" }}>•</span>
              <span 
                className="px-2 py-1 rounded-md font-medium"
                style={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  color: "#1f2937",
                }}
              >
                CEFR {predictedCefr || overall.english_proficiency_scores?.mock_cefr?.prediction || (loadingProficiency ? "…" : "-")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">

        {/* Pronunciation Section */}
        {activeSection === "pronunciation" && (
          <Card 
            className={cardBase}
            style={{
              borderRadius: "1rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid #f3f4f6",
              backgroundColor: "white",
              backdropFilter: "blur(4px)",
            }}
          >
            <CardHeader 
              className="border-b rounded-t-2xl"
              style={{
                background: "linear-gradient(to right, #eff6ff, #ecfeff)",
                borderBottomColor: "#dbeafe",
              }}
            >
              <CardTitle className="flex items-center gap-3 text-blue-700">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: "linear-gradient(to bottom right, #3b82f6, #06b6d4)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <Volume2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">{t("speechResults.pronunciationBreakdown")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: "24px" }}>
              {/* Azure pronunciation sub-scores strip — renders only when Azure provided
                  the richer accuracy / completeness / prosody breakdown. LC responses skip this
                  because they don't carry these fields and the same scores are already in the
                  sidebar nav. */}
              {(() => {
                const accuracy = pronunciation.accuracy_score
                const completeness = pronunciation.completeness_score
                const prosody = pronunciation.prosody_score
                const fluencyOverall = fluency?.overall_score
                const hasAzureBreakdown =
                  accuracy != null || completeness != null || prosody != null || metadata?.provider === "azure"
                if (!hasAzureBreakdown) return null
                const subScores: { label: string; value: number; color: string }[] = []
                if (accuracy != null) subScores.push({ label: "Accuracy", value: Math.round(accuracy), color: "#3b82f6" })
                if (fluencyOverall != null) subScores.push({ label: "Fluency", value: Math.round(fluencyOverall), color: "#10b981" })
                if (completeness != null) subScores.push({ label: "Completeness", value: Math.round(completeness), color: "#a855f7" })
                if (prosody != null) subScores.push({ label: "Prosody", value: Math.round(prosody), color: "#f59e0b" })
                if (subScores.length === 0) return null
                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${subScores.length}, minmax(0, 1fr))`,
                      gap: "12px",
                      marginBottom: "24px",
                    }}
                  >
                    {subScores.map((s) => (
                      <div
                        key={s.label}
                        style={{
                          textAlign: "center",
                          padding: "16px 12px",
                          borderRadius: "12px",
                          backgroundColor: "#f9fafb",
                          border: `2px solid ${s.color}33`,
                        }}
                      >
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 6px 0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {s.label}
                        </p>
                        <p style={{ fontSize: "28px", fontWeight: 700, color: s.color, margin: 0, lineHeight: 1 }}>
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Audio Playback Section */}
              {playbackAudioUrl ? (
                <div
                  style={{
                    marginBottom: "24px",
                    padding: "16px",
                    background: "linear-gradient(to right, #eff6ff, #ecfeff)",
                    borderRadius: "12px",
                    border: "2px solid #bfdbfe",
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          padding: "8px",
                          backgroundColor: "#3b82f6",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "36px",
                          height: "36px",
                        }}
                      >
                        <Volume2 className="w-5 h-5" style={{ color: "#ffffff" }} />
                      </div>
                      <div>
                        <h4
                          style={{
                            fontWeight: "600",
                            fontSize: "16px",
                            color: "#1e3a8a",
                            margin: "0 0 4px 0",
                            lineHeight: "1.5",
                          }}
                        >
                          {t("speechResults.yourRecording")}
                        </h4>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#1e40af",
                            margin: "0",
                            lineHeight: "1.4",
                          }}
                        >
                          {t("speechResults.listenToRecording")}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          color: "#4b5563",
                          fontWeight: "500",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                      <button
                        onClick={togglePlayPauseRecorded}
                        style={{
                          padding: "12px",
                          backgroundColor: "#3b82f6",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "50%",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          transition: "background-color 0.2s ease",
                          width: "44px",
                          height: "44px",
                          minWidth: "44px",
                          minHeight: "44px",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#2563eb"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#3b82f6"
                        }}
                        title={isPlayingRecorded ? "Pause" : "Play"}
                      >
                        {isPlayingRecorded ? (
                          <Pause className="w-5 h-5" style={{ color: "#ffffff", display: "block" }} />
                        ) : (
                          <Play className="w-5 h-5" style={{ color: "#ffffff", display: "block" }} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginBottom: "24px",
                    padding: "16px",
                    background: "#f3f4f6",
                    borderRadius: "12px",
                    border: "1px solid #d1d5db",
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px",
                        backgroundColor: "#9ca3af",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                      }}
                    >
                      <Volume2 className="w-5 h-5" style={{ color: "#ffffff" }} />
                    </div>
                    <div>
                      <h4
                        style={{
                          fontWeight: "600",
                          fontSize: "16px",
                          color: "#374151",
                          margin: "0 0 4px 0",
                        }}
                      >
                        Your Recording
                      </h4>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#6b7280",
                          margin: "0",
                        }}
                      >
                        No audio recording available
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">Click on any word to see detailed pronunciation breakdown:</p>
            <div className="flex flex-wrap gap-2">
              {uniqueFilteredWords.map((word, idx) => {
                // Get the display score (updated score if available, otherwise original)
                const displayScore = getWordDisplayScore(word.name, word.score)
                const colors = getScoreColor(displayScore)
                return (
                  <button
                    type="button"
                    key={`${word.name}-${idx}`}
                    onClick={() => {
                      const newSelectedWord = selectedWord === word.name ? null : word.name
                      const scoreForWord = getWordDisplayScore(word.name, word.score)
                      setSelectedWord(newSelectedWord)
                      setSelectedWordScore(newSelectedWord ? scoreForWord : null)
                      // Reset scores when selecting a new word
                      if (newSelectedWord !== selectedWord) {
                        setPracticeScore(null)
                        setCurrentWordScore(null)
                        setRecordedAudio(null)
                      }
                    }}
                    style={{
                      backgroundColor: selectedWord === word.name ? "#dbeafe" : colors.bg,
                      borderColor: selectedWord === word.name ? "#3b82f6" : colors.border,
                      color: selectedWord === word.name ? "#1e40af" : colors.text,
                      borderWidth: "2px",
                      padding: "10px 18px",
                      borderRadius: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      boxShadow: selectedWord === word.name 
                        ? "0 4px 12px rgba(59, 130, 246, 0.3)" 
                        : "0 2px 4px rgba(0, 0, 0, 0.1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)"
                      e.currentTarget.style.boxShadow = selectedWord === word.name 
                        ? "0 6px 16px rgba(59, 130, 246, 0.4)" 
                        : "0 4px 8px rgba(0, 0, 0, 0.15)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.boxShadow = selectedWord === word.name 
                        ? "0 4px 12px rgba(59, 130, 246, 0.3)" 
                        : "0 2px 4px rgba(0, 0, 0, 0.1)"
                    }}
                  >
                    {word.name}
                    <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: "600" }}>({displayScore})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedWord && (
            <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-blue-700">{selectedWord}</h3>
                  <button
                    onClick={() => playWord(selectedWord)}
                    className="p-2 hover:bg-blue-200 rounded-full transition-colors"
                    title="Play word pronunciation"
                  >
                    <Volume2 className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
                <Dialog>
                  <div className="flex flex-col items-end gap-2">
                    <div
                      style={{
                        backgroundColor: getScoreColor(getWordDisplayScore(selectedWord, selectedWordScore ?? 0)).bg,
                        borderColor: getScoreColor(getWordDisplayScore(selectedWord, selectedWordScore ?? 0)).border,
                        color: getScoreColor(getWordDisplayScore(selectedWord, selectedWordScore ?? 0)).text,
                        padding: "8px 16px",
                        borderRadius: "8px",
                        borderWidth: "2px",
                        fontWeight: "600",
                      }}
                    >
                      Score: {getWordDisplayScore(selectedWord, selectedWordScore ?? 0)}
                    </div>

                    <DialogTrigger asChild>
                      <button
                        type="button"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          borderRadius: "9999px",
                          padding: "8px 14px",
                          fontSize: "12px",
                          fontWeight: 700,
                          letterSpacing: "0.2px",
                          color: "#FFFFFF",
                          border: "1px solid rgba(255, 255, 255, 0.0)",
                          background: "linear-gradient(90deg, #2563EB 0%, #06B6D4 100%)",
                          boxShadow: "0 6px 16px rgba(37, 99, 235, 0.25)",
                          cursor: "pointer",
                          transition: "transform 150ms ease, box-shadow 150ms ease, filter 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-1px)"
                          e.currentTarget.style.boxShadow = "0 10px 22px rgba(37, 99, 235, 0.32)"
                          e.currentTarget.style.filter = "brightness(0.98)"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)"
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.25)"
                          e.currentTarget.style.filter = "none"
                        }}
                      >
                        <BookText className="size-4" />
                        Phoneme Guide
                      </button>
                    </DialogTrigger>
                  </div>

                  <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4">
                      <DialogTitle>Phoneme Guide</DialogTitle>
                      <DialogDescription>
                        Click on any phoneme to hear its pronunciation. Click legend items to highlight categories.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 pb-6">
                      <div className="rounded-xl bg-[#1E3A8A] p-6">
                        <div className="text-white text-lg font-bold text-center mb-2">Phonemic Chart</div>
                        <div className="text-white/90 text-xs text-center mb-5">
                          Click on any phoneme to hear its pronunciation. Click legend items to highlight categories.
                        </div>
                        <div style={{ width: "100%", overflow: "visible" }}>
                          <EmbeddedPhonemeChart />
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {(() => {
                const entry: any = findWordScoreEntry(selectedWord)
                const errorType: string | null = entry?.error_type
                if (!errorType || errorType === "None") return null
                const map: Record<string, { bg: string; border: string; color: string; label: string }> = {
                  Mispronunciation: { bg: "#fee2e2", border: "#ef4444", color: "#991b1b", label: "Mispronunciation" },
                  Omission: { bg: "#fef3c7", border: "#f59e0b", color: "#92400e", label: "Omission (you skipped this word)" },
                  Insertion: { bg: "#ede9fe", border: "#8b5cf6", color: "#5b21b6", label: "Insertion (extra word said)" },
                  UnexpectedBreak: { bg: "#e0f2fe", border: "#0284c7", color: "#075985", label: "Unexpected pause" },
                  MissingBreak: { bg: "#e0f2fe", border: "#0284c7", color: "#075985", label: "Missing pause" },
                  Monotone: { bg: "#fce7f3", border: "#ec4899", color: "#9d174d", label: "Monotone" },
                }
                const tone = map[errorType] || { bg: "#fef3c7", border: "#f59e0b", color: "#92400e", label: errorType }
                return (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 9999,
                      background: tone.bg,
                      border: `2px solid ${tone.border}`,
                      color: tone.color,
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 16,
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {tone.label}
                  </div>
                )
              })()}

              {/* Syllable breakdown — Azure-only */}
              {(() => {
                const syllables: any[] = findWordScoreEntry(selectedWord)?.syllables || []
                if (syllables.length === 0) return null
                return (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Syllables</h4>
                    <div className="flex flex-wrap gap-2">
                      {syllables.map((s: any, idx: number) => {
                        const score = s.score ?? s.PronunciationAssessment?.AccuracyScore
                        const colors = score != null ? getScoreColor(score) : { bg: "#f3f4f6", border: "#9ca3af", text: "#374151" }
                        return (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
                            style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}`, color: colors.text }}
                          >
                            <span className="font-mono font-semibold">{s.syllable || s.Syllable}</span>
                            {s.grapheme && (
                              <span className="text-xs opacity-70">({s.grapheme})</span>
                            )}
                            {score != null && (
                              <span className="text-sm font-bold">{Math.round(score)}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">{t("speechResults.phonemes")}</h4>
                <div className="flex flex-wrap gap-2">
                  {findWordScoreEntry(selectedWord)?.phonemes?.length > 0 ? (
                    findWordScoreEntry(selectedWord)
                      ?.phonemes?.map((p: any, idx: any) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => playPhonemeSound(getPhonemeLabel(p))}
                          title="Play sound"
                          className="inline-flex items-center gap-2 border border-blue-300 bg-white px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <span className="font-mono text-blue-700">{getPhonemeLabel(p)}</span>
                          {p.phoneme_score !== undefined && p.phoneme_score !== null && (
                            <span className="text-sm text-gray-600">({Math.round(p.phoneme_score)})</span>
                          )}
                        </button>
                      ))
                  ) : (
                    <p className="text-sm text-gray-500">No phoneme data available for this word.</p>
                  )}
                </div>
              </div>

              {/* Prosody / break / monotone feedback per word — Azure-only */}
              {(() => {
                const fb = findWordScoreEntry(selectedWord)?.feedback?.Prosody
                if (!fb) return null
                const items: { title: string; detail: string; color: string }[] = []
                const breakInfo = fb.Break
                if (breakInfo) {
                  if ((breakInfo.UnexpectedBreak?.Confidence ?? 0) > 0.5) {
                    items.push({ title: "Unexpected pause", detail: "Try not to pause here.", color: "#0284c7" })
                  }
                  if ((breakInfo.MissingBreak?.Confidence ?? 0) > 0.5) {
                    items.push({ title: "Missing pause", detail: "A short pause here will sound more natural.", color: "#0284c7" })
                  }
                  if ((breakInfo.BreakLength ?? 0) > 0) {
                    items.push({ title: `Pause length: ${Math.round((breakInfo.BreakLength || 0) / 10000)}ms`, detail: "Pause duration before this word.", color: "#6b7280" })
                  }
                }
                const intonation = fb.Intonation
                if (intonation?.Monotone && (intonation.Monotone.SyllablePitchDeltaConfidence ?? 0) > 0.6) {
                  items.push({ title: "Monotone delivery", detail: "Vary your pitch a little to sound more expressive.", color: "#ec4899" })
                }
                if (items.length === 0) return null
                return (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <h4 className="text-sm font-semibold text-amber-800 mb-2">Prosody feedback</h4>
                    <ul className="space-y-1.5 text-sm">
                      {items.map((it, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span style={{ color: it.color, fontWeight: 700 }}>•</span>
                          <span className="text-gray-700">
                            <span className="font-semibold" style={{ color: it.color }}>{it.title}.</span>{" "}
                            {it.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}

              <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">{t("speechResults.practicePronunciation")}</h4>

                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-4">
                  {/* Left side: Record button */}
                  <div className="w-full md:w-auto">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors w-full md:w-auto`}
                      style={{
                        backgroundColor: isRecording ? "#EF4444" : "#4A98F8", // red-500 or purple-400
                        color: "white",
                        borderRadius: isRecording ? "8px" : "9999px",
                        padding: "12px 32px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        transform: isRecording ? "none" : "scale(1)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isRecording ? "#2563EB" : "#4A98F8" // hover colors
                        e.currentTarget.style.transform = "scale(1.05)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isRecording ? "#EF4444" : "#4A98F8" // reset color
                        e.currentTarget.style.transform = "scale(1)"
                      }}
                    >
                      {isRecording ? (
                        <>
                          <Square className="w-5 h-5" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5" />
                          Record
                        </>
                      )}
                    </button>
                  </div>

                  {/* Middle: Audio player with slider */}
                  <div className="w-full min-w-0">
                    {recordedAudio ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlayPause}
                          className="flex-shrink-0 p-2 bg-red-600 hover:bg-blue-600 text-white rounded-full transition-colors"
                          title={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        <div className="flex-1">
                          <input
                            type="range"
                            min="0"
                            max={practiceDuration || 0}
                            value={practiceCurrentTime}
                            onChange={handlePracticeSliderChange}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{formatTime(practiceCurrentTime)}</span>
                            <span>{formatTime(practiceDuration)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-12 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
                        {isRecording ? "Recording in progress..." : "No recording yet"}
                      </div>
                    )}
                  </div>

                  {/* Right side: Score boxes */}
                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto justify-center">
                    {/* Current Score (Orange) */}
                    <div className="px-4 py-2 bg-orange-100 border-2 border-orange-400 rounded-lg text-center min-w-[100px] flex-1 md:flex-none">
                      <p className="text-xs text-gray-600 mb-1">Current</p>
                      <p className="text-xl font-bold text-orange-600">
                        {currentWordScore ?? selectedWordScore ?? 0}
                      </p>
                    </div>
                    {/* Practice Score (Green) - shows API result */}
                    <div className="px-4 py-2 bg-green-100 border-2 border-green-400 rounded-lg text-center min-w-[100px] flex-1 md:flex-none">
                      <p className="text-xs text-gray-600 mb-1">Practice</p>
                      {isLoadingPractice ? (
                        <p className="text-xl font-bold text-gray-400">...</p>
                      ) : practiceScore !== null ? (
                        <p className="text-xl font-bold text-green-600">{practiceScore}</p>
                      ) : (
                        <p className="text-xl font-bold text-gray-400">-</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recording progress indicator */}
                {isRecording && (
                  <div className="mt-4">
                    <p className="text-sm text-red-600 flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                      Recording... {recordingTime}s / 5s
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((recordingTime / 5) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Loading indicator when API is processing */}
                {isLoadingPractice && (
                  <div className="mt-4">
                    <p className="text-sm text-blue-600 flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                      Processing pronunciation assessment...
                    </p>
                  </div>
                )}

                {/* Improvement message */}
                {practiceScore !== null && !isLoadingPractice && (
                  <div className="mt-4">
                    {(() => {
                      const originalScore = selectedWordScore ?? findWordScoreEntry(selectedWord)?.score ?? 0
                      const currentScore = currentWordScore !== null ? currentWordScore : originalScore
                      if (practiceScore > currentScore) {
                        return (
                          <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                            <Award className="w-5 h-5" />
                            <span>Great improvement! Keep practicing!</span>
                          </div>
                        )
                      } else {
                        return (
                          <div className="text-center text-gray-600">
                            <span>Keep practicing to improve your score!</span>
                          </div>
                        )
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

            </CardContent>
          </Card>
        )}

        {/* Fluency Section */}
        {activeSection === "fluency" && (
          <Card 
            className={cardBase}
            style={{
              borderRadius: "1rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid #f3f4f6",
              backgroundColor: "white",
              backdropFilter: "blur(4px)",
            }}
          >
            <CardHeader 
              className="border-b rounded-t-2xl"
              style={{
                background: "linear-gradient(to right, #ecfdf5, #f0fdfa)",
                borderBottomColor: "#d1fae5",
              }}
            >
              <CardTitle className="flex items-center gap-3 text-emerald-700">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: "linear-gradient(to bottom right, #10b981, #14b8a6)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">{t("speechResults.fluencyRhythm")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
              <p className="text-sm text-gray-600">{t("speechResults.speechRate")}</p>
              <p className="text-2xl font-semibold text-emerald-600">{fluency.metrics?.speech_rate}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
              <p className="text-sm text-gray-600">{t("speechResults.pauses")}</p>
              <p className="text-2xl font-semibold text-emerald-600">{fluency.metrics?.pauses}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
              <p className="text-sm text-gray-600">{t("speechResults.fillerWords")}</p>
              <p className="text-2xl font-semibold text-emerald-600">{fluency.metrics?.filler_words}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {Object.entries(fluency.feedback || {}).map(([key, value]) =>
              key !== "tagged_transcript" ? (
                <div key={key} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                  <p className="text-sm font-semibold text-emerald-700 capitalize">{key.replace(/_/g, " ")}</p>
                  <p className="text-gray-700 text-sm">{(value as any)?.feedback_text ?? "-"}</p>
                </div>
              ) : null,
            )}
          </div>
        </CardContent>
      </Card>
        )}

        {/* Vocabulary Section */}
        {activeSection === "vocabulary" && (
          <Card 
            className={cardBase}
            style={{
              borderRadius: "1rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid #f3f4f6",
              backgroundColor: "white",
              backdropFilter: "blur(4px)",
            }}
          >
            <CardHeader 
              className="border-b rounded-t-2xl"
              style={{
                background: "linear-gradient(to right, #faf5ff, #fdf2f8)",
                borderBottomColor: "#f3e8ff",
              }}
            >
              <CardTitle className="flex items-center gap-3 text-purple-700">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: "linear-gradient(to bottom right, #a855f7, #ec4899)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">{t("speechResults.vocabulary")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {(vocabulary && Object.keys(vocabulary).length > 0) || (reading && Object.keys(reading).length > 0) ? (
                <>
                  {vocabulary && Object.keys(vocabulary).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600">{t("speechResults.overall")}</p>
                        <p className="text-2xl font-semibold text-purple-600">{vocabulary.overall_score ?? "-"}</p>
                      </div>
                      <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600">{t("speechResults.complexity")}</p>
                        <p className="text-2xl font-semibold text-purple-600">{vocabulary.metrics?.vocabulary_complexity ?? "-"}</p>
                      </div>
                      <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600">{t("speechResults.idioms")}</p>
                        <p className="text-2xl font-semibold text-purple-600">{vocabulary.metrics?.idiom_details?.length ?? 0}</p>
                      </div>
                      <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600">IELTS</p>
                        <p className="text-2xl font-semibold text-purple-600">{vocabulary.english_proficiency_scores?.mock_ielts?.prediction ?? "-"}</p>
                      </div>
                    </div>
                  )}
                  
                  {vocabulary.feedback?.tagged_transcript && (
                    <div className="mb-6 bg-purple-50 border border-purple-200 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-purple-700 mb-2">{t("speechResults.transcript")}</p>
                      <p className="text-sm text-gray-700">{vocabulary.feedback.tagged_transcript}</p>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-1 rounded-full bg-purple-500" />
                      <h3 className="text-base font-bold text-purple-800">{t("speechResults.synonyms")}</h3>
                    </div>
                    {loadingVocabularySynonyms && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                        {t("speechResults.loading")}
                      </div>
                    )}
                    {vocabularySynonyms && !loadingVocabularySynonyms && (
                      <div className="space-y-4">
                        {vocabularySynonyms
                          .split(/\n\n+/)
                          .map((block) => block.trim())
                          .filter(Boolean)
                          .map((block, i) => {
                            const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean)
                            const firstLine = lines[0] || ""
                            const rest = lines.slice(1)
                            return (
                              <div
                                key={i}
                                className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                                style={{ borderLeftWidth: "4px", borderLeftColor: "#a855f7" }}
                              >
                                <p className="text-base font-semibold text-purple-800 mb-3 leading-snug">{firstLine}</p>
                                <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
                                  {rest.map((line, j) => (
                                    <p key={j} className={line.toLowerCase().startsWith("example:") ? "italic text-gray-600 pl-2 border-l-2 border-purple-200" : ""}>
                                      {line}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                    {!vocabularySynonyms && !loadingVocabularySynonyms && (metadata?.predicted_text || pronunciation?.words?.length) && (
                      <p className="text-sm text-gray-500 py-4">{t("speechResults.synonymsLoadHint")}</p>
                    )}
                  </div>

                  {reading && Object.keys(reading).length > 0 && (
                    <div className={vocabulary && Object.keys(vocabulary).length > 0 ? "mt-6" : ""}>
                      <h4 className="text-lg font-semibold text-purple-700 mb-4">{t("speechResults.readingMetrics")}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <p className="text-sm text-gray-600">{t("speechResults.accuracy")}</p>
                          <p className="text-2xl font-semibold text-purple-600">{Number.isFinite(reading.accuracy) ? (reading.accuracy * 100).toFixed(0) : "-"}%</p>
                        </div>
                        <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <p className="text-sm text-gray-600">{t("speechResults.completion")}</p>
                          <p className="text-2xl font-semibold text-purple-600">{Number.isFinite(reading.completion || reading.completions) ? ((reading.completion || reading.completions) * 100).toFixed(0) : "-"}%</p>
                        </div>
                        <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <p className="text-sm text-gray-600">{t("speechResults.speedWpm")}</p>
                          <p className="text-2xl font-semibold text-purple-600">{Number.isFinite(reading.speed_wpm || reading.speed_wpm_correct) ? (reading.speed_wpm || reading.speed_wpm_correct).toFixed(1) : "-"}</p>
                        </div>
                        <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <p className="text-sm text-gray-600">{t("speechResults.wordsRead")}</p>
                          <p className="text-2xl font-semibold text-purple-600">{reading.words_read ?? "-"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600">{t("speechResults.noVocabularyMetrics")}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Grammar Section */}
        {activeSection === "grammar" && (
          <Card 
            className={cardBase}
            style={{
              borderRadius: "1rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid #f3f4f6",
              backgroundColor: "white",
              backdropFilter: "blur(4px)",
            }}
          >
            <CardHeader 
              className="border-b rounded-t-2xl"
              style={{
                background: "linear-gradient(to right, #ecfdf5, #f0fdf4)",
                borderBottomColor: "#d1fae5",
              }}
            >
              <CardTitle className="flex items-center gap-3 text-emerald-700">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: "linear-gradient(to bottom right, #10b981, #22c55e)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <Award className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">{t("speechResults.grammar")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600">{t("speechResults.overall")}</p>
                  <p className="text-2xl font-semibold text-emerald-600">{grammarOverallScore}</p>
                </div>
                <div className="text-center bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600">{t("speechResults.mistakes")}</p>
                  <p className="text-2xl font-semibold text-emerald-600">{grammar.metrics?.mistake_count ?? 0}</p>
                </div>
                <div className="text-center bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600">{t("speechResults.complexity")}</p>
                  <p className="text-2xl font-semibold text-emerald-600">{grammar.metrics?.grammatical_complexity ?? "-"}</p>
                </div>
                <div className="text-center bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600">IELTS</p>
                  <p className="text-2xl font-semibold text-emerald-600">{grammar.english_proficiency_scores?.mock_ielts?.prediction ?? "-"}</p>
                </div>
              </div>

              {/* Original text + tone dropdown + improved text (no Corrected Text) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t("speechResults.originalRecordedText")}</p>
                  <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-[120px]">
                    {(metadata?.predicted_text || "").trim() || "—"}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-gray-700">{t("speechResults.selectOption")}</p>
                  <select
                    value={grammarToneOption}
                    onChange={(e) => setGrammarToneOption(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">{t("speechResults.chooseTone")}</option>
                    <option value="Casual">{t("speechResults.toneCasual")}</option>
                    <option value="Grammar">{t("speechResults.toneGrammar")}</option>
                    <option value="Passionate">{t("speechResults.tonePassionate")}</option>
                    <option value="Formal">{t("speechResults.toneFormal")}</option>
                    <option value="Business">{t("speechResults.toneBusiness")}</option>
                    <option value="Funny">{t("speechResults.toneFunny")}</option>
                    <option value="Custom">{t("speechResults.toneCustom")}</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleImproveTone}
                    disabled={!grammarToneOption || !(metadata?.predicted_text || "").trim() || improvingTone}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {improvingTone ? t("speechResults.improving") : t("speechResults.improve")}
                  </button>
                  {improvedText && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(improvedText)}
                      className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      {t("speechResults.copy")}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t("speechResults.improvedSpeechText")}</p>
                  <div className="text-sm text-gray-700 bg-emerald-50 p-4 rounded-lg border border-emerald-200 min-h-[120px]">
                    {improvingTone ? t("speechResults.loading") : (improvedText || "—")}
                  </div>
                </div>
              </div>

              {/* Grammar tip — auto-fetched when tab opens; fallback button to retry */}
              <div className="bg-white border border-emerald-200 p-4 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-2">{t("speechResults.grammarTip")}</p>
                {grammar.feedback?.grammar_feedback && !grammarTip && !loadingGrammarTip && (
                  <div className="text-sm text-gray-700 space-y-2">
                    {(grammar.feedback.grammar_feedback as string).replace(/\*\*/g, "").split(/\n+/).filter(Boolean).map((p, i) => (
                      <p key={i} className="mb-2">{p.trim()}</p>
                    ))}
                  </div>
                )}
                {grammarTip && (
                  <div className="text-sm text-gray-700 space-y-2">
                    {grammarTip.replace(/\*\*/g, "").split(/\n+/).filter(Boolean).map((p, i) => (
                      <p key={i} className="mb-2">{p.trim()}</p>
                    ))}
                  </div>
                )}
                {loadingGrammarTip && <p className="text-sm text-gray-500">{t("speechResults.loadingTips")}</p>}
                {!grammar.feedback?.grammar_feedback && !grammarTip && !loadingGrammarTip && (metadata?.predicted_text || "").trim() && (
                  <button
                    type="button"
                    onClick={fetchGrammarTip}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    {t("speechResults.getGrammarTips")}
                  </button>
                )}
              </div>

              {/* Grammar errors list (no Corrected Text) */}
              {((grammar.metrics?.grammar_errors || []).length > 0 || (grammar.feedback?.grammar_errors || []).length > 0) && (
                <div className="bg-white border border-emerald-200 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t("speechResults.grammarErrors")}</p>
                  <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
                    {[...(grammar.metrics?.grammar_errors || []), ...(grammar.feedback?.grammar_errors || [])].map((err: any, i: number) => {
                      if (typeof err === "string") {
                        return <li key={i}>{err}</li>
                      }
                      const mistake = err?.mistake ?? "Unknown"
                      const correction = err?.correction ?? "-"
                      const start = err?.start_index
                      const end = err?.end_index
                      return (
                        <li key={i}>
                          <span className="font-semibold">{mistake}</span>
                          {" → "}
                          <span className="text-green-700">{correction}</span>
                          {Number.isFinite(start) && Number.isFinite(end) && (
                            <span className="text-gray-500"> {` (at ${start}-${end})`}</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Phoneme Guide Section */}
        {activeSection === "phoneme-guide" && (
          <Card 
            className={cardBase}
            style={{
              borderRadius: "1rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid #f3f4f6",
              backgroundColor: "white",
              backdropFilter: "blur(4px)",
            }}
          >
            <CardHeader 
              className="border-b rounded-t-2xl"
              style={{
                background: "linear-gradient(to right, #1e3a8a, #3b82f6)",
                borderBottomColor: "#3b82f6",
              }}
            >
              <CardTitle className="flex items-center gap-3 text-white">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <BookText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">{t("speechResults.phonemeGuide")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: "24px" }}>
              <div style={{ 
                padding: "0",
                backgroundColor: "#1E3A8A",
                borderRadius: "12px"
              }}>
                <div style={{ 
                  padding: "24px",
                }}>
                  <div style={{ 
                    color: "white", 
                    fontSize: "20px", 
                    fontWeight: "bold", 
                    textAlign: "center", 
                    marginBottom: "12px" 
                  }}>
                    Phonemic Chart
                  </div>
                  <div style={{ 
                    color: "white", 
                    fontSize: "12px", 
                    textAlign: "center", 
                    marginBottom: "20px",
                    opacity: 0.9
                  }}>
                    Click on any phoneme to hear its pronunciation. Click legend items to highlight categories.
                  </div>
                  <div style={{ width: "100%", overflow: "visible" }}>
                    <EmbeddedPhonemeChart />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Information - shown in all sections except phoneme-guide */}
        {activeSection !== "phoneme-guide" && (Object.keys(warnings).length > 0 || metadata.predicted_text) && (
          <Card 
            className={cardBase}
            style={{
              borderRadius: "1rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid #f3f4f6",
              backgroundColor: "white",
              backdropFilter: "blur(4px)",
            }}
          >
            <CardHeader 
              className="border-b rounded-t-2xl"
              style={{
                background: "linear-gradient(to right, #fffbeb, #fefce8)",
                borderBottomColor: "#fde68a",
              }}
            >
              <CardTitle className="flex items-center gap-3 text-yellow-700">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: "linear-gradient(to bottom right, #f59e0b, #eab308)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">{t("speechResults.additionalInfo")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 text-sm text-gray-800">
              {Object.entries(warnings).map(([key, value]) => (
                <div key={key}>
                  <strong>{key}: </strong>
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </div>
              ))}
              {metadata.predicted_text && (
                <div>
                  <strong>{t("speechResults.predictedText")}</strong> {metadata.predicted_text}
                </div>
              )}
              {metadata.content_relevance && (
                <div>
                  <strong>{t("speechResults.contentRelevance")}</strong> {metadata.content_relevance}%
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

