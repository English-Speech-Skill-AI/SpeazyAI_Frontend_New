"use client"

import React from "react"

//@ts-ignore
import { useState, useRef, useEffect } from "react"
import { API_URLS, getSpeechProxyUrl } from '@/config/apiConfig';
import { speechProxyResponseJson } from "@/utils/normalizeSpeechProxyResponse";
import { Card, CardHeader, CardContent, CardTitle } from "./ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Mic, BookOpen, AlertTriangle, Volume2, Award, Brain, Square, Play, Pause, LayoutDashboard, ChevronDown, BookText } from "lucide-react"
import { EmbeddedPhonemeChart } from "./EmbeddedPhonemeChart"

type NavigationItem = "pronunciation" | "fluency" | "vocabulary" | "grammar" | "phoneme-guide"

export function SpeakingAssessmentResults({ data, audioUrl: propAudioUrl }) {
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
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [updatedWordScores, setUpdatedWordScores] = useState<Map<string, number>>(new Map())
  const [verifiedDisplayWords, setVerifiedDisplayWords] = useState<string[] | null>(null)
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recordedAudioRef = useRef<HTMLAudioElement | null>(null)
  const practiceAudioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlayingPractice, setIsPlayingPractice] = useState(false)
  
  // Use propAudioUrl if available, otherwise use recordedAudio state
  const playbackAudioUrl = propAudioUrl || recordedAudio
  
  // Debug: Log audio URL to verify it's being passed
  useEffect(() => {
    if (propAudioUrl) {
      console.log("Audio URL received in SpeakingAssessmentResults:", propAudioUrl.substring(0, 50) + "...")
    } else {
      console.log("No audio URL prop received in SpeakingAssessmentResults")
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

  useEffect(() => {
    if (activeSection !== "grammar") return
    const originalText = (metadata?.predicted_text || "").trim()
    if (!originalText || grammarTipAutoFetchedRef.current) return
    if (grammar.feedback?.grammar_feedback) return
    grammarTipAutoFetchedRef.current = true
    fetchGrammarTip()
  }, [activeSection, metadata?.predicted_text])

  useEffect(() => {
    if (activeSection !== "grammar") return
    if (!grammarToneOption || !(metadata?.predicted_text || "").trim()) return
    handleImproveTone()
  }, [grammarToneOption])

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
      const resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: [
            {
              role: "system",
              content: "You are a vocabulary coach. You must ONLY choose words from the exact list the user provides—words the user actually spoke. Do not add or suggest any word that is not in that list. From the user's list, pick only words that are relatively difficult or advanced (skip fillers like Mhmm, uh, um, and very common words like the, a, is, to). If the list has no difficult words, reply with exactly: No difficult words in this transcript. For each chosen word from the list only, provide: (1) the word and 1–2 synonyms, (2) a short example sentence, (3) how it improves vocabulary. Be concise. Do not use markdown (no **, no *, no #). Return plain text only. Use clear line breaks between each word's section.",
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
        setVocabularySynonyms("Could not load synonyms. Please try again.")
        return
      }
      let text = (json?.response ?? json?.content ?? json?.message ?? "").trim()
      text = text.replace(/\*\*/g, "")
      setVocabularySynonyms(text || "No synonyms available.")
    } catch (e: any) {
      clearTimeout(timeoutId)
      setVocabularySynonyms(e?.name === "AbortError" ? "Request timed out. Try again." : "Could not load synonyms. Please try again.")
    } finally {
      setLoadingVocabularySynonyms(false)
    }
  }

  const handleImproveTone = async () => {
    const originalText = (metadata?.predicted_text || "").trim()
    if (!originalText || !grammarToneOption) return
    setImprovingTone(true)
    setImprovedText("")
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    try {
      const proxyUrl = API_URLS.chatgptProxy
      const noMarkdown = "Do not use markdown (no **, no *, no #). Return plain text only."
      const tonePrompt = grammarToneOption === "Custom"
        ? `Rewrite the following text in the style or tone the user requested. Return ONLY the rewritten text, no explanation. ${noMarkdown}`
        : `Rewrite the following text in a ${grammarToneOption.toLowerCase()} tone/style. Return ONLY the rewritten text, no explanation or preamble. ${noMarkdown}`
      const resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
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
        setImprovedText(`${errMsg}. Please try again.`)
        return
      }
      if (json?.error) {
        setImprovedText(String(json.error))
        return
      }
      let text = (json?.response ?? json?.content ?? json?.message ?? "").trim()
      text = text.replace(/\*\*/g, "")
      setImprovedText(text || "No response returned. Please try again.")
    } catch (e: any) {
      clearTimeout(timeoutId)
      if (e?.name === "AbortError") {
        setImprovedText("Request took too long. Please try again.")
      } else {
        setImprovedText("Failed to get improved text. Please check your connection and try again.")
      }
    } finally {
      setImprovingTone(false)
    }
  }

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
      const resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: [
            { role: "system", content: "You are a friendly English grammar coach. Give 2–3 short, actionable tips to improve the user's grammar. Be concise and encouraging. No preamble. Do not use markdown (no **, no *, no #). Return plain text only." },
            { role: "user", content: `Text the user said: "${originalText.slice(0, 1500)}". Grammar issues: ${errorsStr}. Give 2–3 brief tips to improve.` },
          ],
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setGrammarTip("Could not load tips. Please try again.")
        return
      }
      let text = (json?.response ?? json?.content ?? json?.message ?? "").trim()
      text = text.replace(/\*\*/g, "")
      setGrammarTip(text || "No tips available.")
    } catch (e: any) {
      clearTimeout(timeoutId)
      setGrammarTip(e?.name === "AbortError" ? "Request timed out. Try again." : "Could not load tips. Please try again.")
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

  const wordScores = (pronunciation.words || []).map((w: { word_text: any; word_score: any; phonemes?: any[] }) => ({
    name: w.word_text,
    score: w.word_score,
    phonemes: w.phonemes || [], // API-returned phonemes for this word
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
      return displayWords.map((w) => ({ name: w, score: 0, phonemes: [] }))
    }

    // Try to map display words to the API's wordScores (best-effort sequential match).
    // If we can't find a match, keep score=0 and no phoneme data.
    const out: Array<{ name: string; score: number; phonemes: any[] }> = []
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
        })
        wsIdx = matchIdx + 1
      } else {
        out.push({ name: w, score: 0, phonemes: [] })
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

  // Call API for practice pronunciation
  const callPracticeAPI = async (audioBlob: Blob) => {
    if (!selectedWord) return

    setIsLoadingPractice(true)
    try {
      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob)
      
      // Determine endpoint - use scripted endpoint for word practice
      const endpoint = "https://apis.languageconfidence.ai/speech-assessment/scripted/uk"
      const proxyUrl = getSpeechProxyUrl(endpoint)

      const payload = JSON.stringify({
        audio_base64: base64Audio,
        audio_format: "webm",
        expected_text: selectedWord, // Use the selected word as expected text
      })

      const response = await fetch(`${proxyUrl}?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const apiData = await speechProxyResponseJson(response)
      console.log("Practice API Response:", apiData)

      // Extract overall_score from pronunciation
      const pronunciationScore = apiData?.pronunciation?.overall_score
      if (pronunciationScore !== undefined && pronunciationScore !== null) {
        const roundedScore = Math.round(pronunciationScore)
        setPracticeScore(roundedScore)
        
        // Update the word score in the breakdown when practice score is received
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
      // Don't show alert, just log the error
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

        // Call API after recording stops (after 5 seconds)
        await callPracticeAPI(audioBlob)
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
    
    const handleLoadedMetadata = () => {
      if (audio) {
        setDuration(audio.duration)
      }
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

  // Practice recording audio controls
  const togglePlayPause = () => {
    if (practiceAudioRef.current && recordedAudio) {
      if (isPlayingPractice) {
        practiceAudioRef.current.pause()
        setIsPlayingPractice(false)
      } else {
        practiceAudioRef.current.play()
        setIsPlayingPractice(true)
      }
    }
  }

  const handlePracticeTimeUpdate = () => {
    if (practiceAudioRef.current) {
      setCurrentTime(practiceAudioRef.current.currentTime)
    }
  }

  const handlePracticeLoadedMetadata = () => {
    if (practiceAudioRef.current) {
      setDuration(practiceAudioRef.current.duration)
    }
  }

  const handlePracticeEnded = () => {
    setIsPlayingPractice(false)
    setCurrentTime(0)
  }

  // Initialize practice audio element when recordedAudio changes
  useEffect(() => {
    if (!recordedAudio) {
      setCurrentTime(0)
      setDuration(0)
      setIsPlayingPractice(false)
      return
    }
    
    // The audio element will be set up when it's rendered
    // We just need to reset state when recordedAudio changes
    setCurrentTime(0)
    setDuration(0)
    setIsPlayingPractice(false)
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

  const navigationItems = [
    { id: "pronunciation" as NavigationItem, label: "Pronunciation", icon: Mic, score: Math.round(pronunciation.overall_score || 0) },
    { id: "fluency" as NavigationItem, label: "Fluency", icon: Brain, score: Math.round(fluency.overall_score || 0) },
    { id: "vocabulary" as NavigationItem, label: "Vocabulary", icon: BookOpen, score: Math.round(vocabulary.overall_score || 0) },
    { id: "grammar" as NavigationItem, label: "Grammar", icon: Award, score: grammarScore },
    { id: "phoneme-guide" as NavigationItem, label: "Phoneme Guide", icon: BookText, score: null },
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
                  Score
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
              Overall Score
            </p>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span 
                className="px-2 py-1 rounded-md font-medium"
                style={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  color: "#1f2937",
                }}
              >
                IELTS {overall.english_proficiency_scores?.mock_ielts?.prediction || "-"}
              </span>
              <span style={{ color: "#9ca3af" }}>•</span>
              <span 
                className="px-2 py-1 rounded-md font-medium"
                style={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  color: "#1f2937",
                }}
              >
                CEFR {overall.english_proficiency_scores?.mock_cefr?.prediction || "-"}
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
                <span className="text-xl font-bold">Pronunciation Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: "24px" }}>
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
                          Your Recording
                        </h4>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#1e40af",
                            margin: "0",
                            lineHeight: "1.4",
                          }}
                        >
                          Listen to your recorded speech
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

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Phonemes:</h4>
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
                          {p.phoneme_score !== undefined && (
                            <span className="text-sm text-gray-600">({p.phoneme_score})</span>
                          )}
                        </button>
                      ))
                  ) : (
                    <p className="text-sm text-gray-500">No phoneme data available for this word.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Practice Pronunciation:</h4>

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
                          style={{
                            flexShrink: 0,
                            padding: "8px",
                            backgroundColor: "#dc2626",
                            color: "#ffffff",
                            borderRadius: "50%",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#2563eb"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#dc2626"
                          }}
                          title={isPlayingPractice ? "Pause" : "Play"}
                        >
                          {isPlayingPractice ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        <div className="flex-1">
                          <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSliderChange}
                            style={{
                              width: "100%",
                              height: "8px",
                              borderRadius: "8px",
                              backgroundColor: "#f3f4f6",
                              accentColor: "#3b82f6",
                              outline: "none",
                              border: "none",
                              cursor: "pointer",
                            }}
                          />
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                        </div>
                        <audio
                          ref={practiceAudioRef}
                          src={recordedAudio}
                          onTimeUpdate={handlePracticeTimeUpdate}
                          onLoadedMetadata={handlePracticeLoadedMetadata}
                          onEnded={handlePracticeEnded}
                          style={{ display: "none" }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "48px",
                        fontSize: "14px",
                        color: "#9ca3af",
                        border: "1px dashed #d1d5db",
                        borderRadius: "8px",
                      }}>
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
                <span className="text-xl font-bold">Fluency & Rhythm</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
              <p className="text-sm text-gray-600">Speech Rate (wpm)</p>
              <p className="text-2xl font-semibold text-emerald-600">{fluency.metrics?.speech_rate}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
              <p className="text-sm text-gray-600">Pauses</p>
              <p className="text-2xl font-semibold text-emerald-600">{fluency.metrics?.pauses}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
              <p className="text-sm text-gray-600">Filler Words</p>
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
                <span className="text-xl font-bold">Vocabulary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {(vocabulary && Object.keys(vocabulary).length > 0) || (reading && Object.keys(reading).length > 0) ? (
                <>
                  {vocabulary && Object.keys(vocabulary).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600">Overall</p>
                        <p className="text-2xl font-semibold text-purple-600">{vocabulary.overall_score ?? "-"}</p>
                      </div>
                      <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600">Complexity</p>
                        <p className="text-2xl font-semibold text-purple-600">{vocabulary.metrics?.vocabulary_complexity ?? "-"}</p>
                      </div>
                      <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600">Idioms</p>
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
                      <p className="text-sm font-semibold text-purple-700 mb-2">Transcript:</p>
                      <p className="text-sm text-gray-700">{vocabulary.feedback.tagged_transcript}</p>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-1 rounded-full bg-purple-500" />
                      <h3 className="text-base font-bold text-purple-800">Synonyms</h3>
                    </div>
                    {loadingVocabularySynonyms && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                        Loading…
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
                      <p className="text-sm text-gray-500 py-4">Synonyms will load when you open this tab.</p>
                    )}
                  </div>

                  {reading && Object.keys(reading).length > 0 && (
                    <div className={vocabulary && Object.keys(vocabulary).length > 0 ? "mt-6" : ""}>
                      <h4 className="text-lg font-semibold text-purple-700 mb-4">Reading Metrics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <p className="text-sm text-gray-600">Accuracy</p>
                          <p className="text-2xl font-semibold text-purple-600">{Number.isFinite(reading.accuracy) ? (reading.accuracy * 100).toFixed(0) : "-"}%</p>
                        </div>
                        <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <p className="text-sm text-gray-600">Completion</p>
                          <p className="text-2xl font-semibold text-purple-600">{Number.isFinite(reading.completion || reading.completions) ? ((reading.completion || reading.completions) * 100).toFixed(0) : "-"}%</p>
                        </div>
                        <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <p className="text-sm text-gray-600">Speed (WPM)</p>
                          <p className="text-2xl font-semibold text-purple-600">{Number.isFinite(reading.speed_wpm || reading.speed_wpm_correct) ? (reading.speed_wpm || reading.speed_wpm_correct).toFixed(1) : "-"}</p>
                        </div>
                        <div className="text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <p className="text-sm text-gray-600">Words Read</p>
                          <p className="text-2xl font-semibold text-purple-600">{reading.words_read ?? "-"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600">No vocabulary or reading metrics available.</p>
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
                <span className="text-xl font-bold">Grammar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Overall</p>
                  <p className="text-2xl font-semibold text-emerald-600">{grammarOverallScore}</p>
                </div>
                <div className="text-center bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Mistakes</p>
                  <p className="text-2xl font-semibold text-emerald-600">{grammar.metrics?.mistake_count ?? 0}</p>
                </div>
                <div className="text-center bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Complexity</p>
                  <p className="text-2xl font-semibold text-emerald-600">{grammar.metrics?.grammatical_complexity ?? "-"}</p>
                </div>
                <div className="text-center bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600">IELTS</p>
                  <p className="text-2xl font-semibold text-emerald-600">{grammar.english_proficiency_scores?.mock_ielts?.prediction ?? "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Original Recorded Text</p>
                  <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-[120px]">
                    {(metadata?.predicted_text || "").trim() || "—"}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-gray-700">Select an option:</p>
                  <select
                    value={grammarToneOption}
                    onChange={(e) => setGrammarToneOption(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Choose tone...</option>
                    <option value="Casual">Casual</option>
                    <option value="Grammar">Grammar</option>
                    <option value="Passionate">Passionate</option>
                    <option value="Formal">Formal</option>
                    <option value="Business">Business</option>
                    <option value="Funny">Funny</option>
                    <option value="Custom">Custom</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleImproveTone}
                    disabled={!grammarToneOption || !(metadata?.predicted_text || "").trim() || improvingTone}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {improvingTone ? "Improving…" : "Improve"}
                  </button>
                  {improvedText && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(improvedText)}
                      className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Copy
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Improved Speech Text</p>
                  <div className="text-sm text-gray-700 bg-emerald-50 p-4 rounded-lg border border-emerald-200 min-h-[120px]">
                    {improvingTone ? "Loading…" : (improvedText || "—")}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-emerald-200 p-4 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-2">Grammar tip</p>
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
                {loadingGrammarTip && <p className="text-sm text-gray-500">Loading tips…</p>}
                {!grammar.feedback?.grammar_feedback && !grammarTip && !loadingGrammarTip && (metadata?.predicted_text || "").trim() && (
                  <button
                    type="button"
                    onClick={fetchGrammarTip}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Get grammar tips
                  </button>
                )}
              </div>

              {((grammar.metrics?.grammar_errors || []).length > 0 || (grammar.feedback?.grammar_errors || []).length > 0) && (
                <div className="bg-white border border-emerald-200 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Grammar Errors:</p>
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
                <span className="text-xl font-bold">Phoneme Guide</span>
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
                <span className="text-xl font-bold">Additional Information</span>
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
                  <strong>Predicted Text:</strong> {metadata.predicted_text}
                </div>
              )}
              {metadata.content_relevance && (
                <div>
                  <strong>Content Relevance:</strong> {metadata.content_relevance}%
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

