"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "../ui/button"
import { Mic, Square, Play, Pause, RotateCcw } from "lucide-react"
import { RecordingWaveform } from "../recordingWaveform"
import { LoadingAssessment } from "../loadingAssessment"
import { getSpeechProxyUrl } from '@/config/apiConfig';
import { speechProxyResponseJson } from "@/utils/normalizeSpeechProxyResponse";

export function SpeakingAudioRecorder({
  expectedText = "",
  lessonColor = "from-blue-500 to-cyan-400",
  endpoint = "https://apis.languageconfidence.ai/speech-assessment/scripted/uk",
  onApiResponse = null
}: {
  expectedText?: string;
  lessonColor?: string;
  endpoint?: string;
  onApiResponse?: any;
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordedAudioUrlRef = useRef<string | null>(null)

  // Recording timer
  useEffect(() => {
    if (!isRecording) return
    timerIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 10)
    }, 10)
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [isRecording])

  // Start Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Detect supported mimeType for better mobile compatibility
      let mimeType = "audio/webm"; // Default fallback
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4"; // iOS Safari often supports this
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        mimeType = "audio/aac";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = handleRecordingStop

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      setAudioUrl(null)
      setApiResponse(null)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Unable to access microphone. Please check permissions.")
    }
  }

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }

  // When recording stops, convert audio and call API
  const handleRecordingStop = () => {
    try {
      // Check if we have audio chunks
      if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
        console.error("No audio chunks recorded")
        setApiResponse({ 
          error: "No audio data was recorded. Please try recording again.",
          errorType: "NO_AUDIO_DATA"
        })
        alert("No audio data was recorded. Please try recording again.")
        return
      }

      // Use the mimeType from the recorder if available, otherwise fallback
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
      
      // Verify blob size
      if (audioBlob.size === 0) {
        console.error("Audio blob is empty")
        setApiResponse({ 
          error: "Recorded audio is empty. Please try recording again.",
          errorType: "EMPTY_AUDIO"
        })
        alert("Recorded audio is empty. Please try recording again.")
        return
      }
      
      // Map mimeType to API format
      // API expects 'webm', 'wav', 'mp3', 'm4a', 'ogg'
      let format = "webm";
      if (mimeType.includes("wav")) format = "wav";
      else if (mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType.includes("aac")) format = "m4a";
      else if (mimeType.includes("ogg")) format = "ogg";
      else if (mimeType.includes("webm")) format = "webm";

      const audioUrl = URL.createObjectURL(audioBlob)
      setAudioUrl(audioUrl)

      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          if (reader.result && typeof reader.result === 'string') {
            // Store the base64 data URL for passing through navigation
            recordedAudioUrlRef.current = reader.result // This is a data URL (base64 encoded)
            
            const base64Audio = reader.result.split(",")[1]
            if (!base64Audio) {
              throw new Error("Failed to convert audio to base64 format")
            }
            streamRef.current?.getTracks().forEach((t) => t.stop())
            audioContextRef.current?.close()
            await callSpeechAssessmentAPI(base64Audio, format)
          } else {
            throw new Error("Failed to read audio file")
          }
        } catch (error: any) {
          console.error("Error processing audio:", error)
          setIsLoading(false)
          setApiResponse({ 
            error: error?.message || "Failed to process audio",
            errorType: "PROCESSING_ERROR"
          })
          alert(`Error processing audio: ${error?.message || "Unknown error"}. Please try recording again.`)
        }
      }
      reader.onerror = () => {
        console.error("FileReader error:", reader.error)
        setIsLoading(false)
        const errorMsg = reader.error?.message || "Failed to read audio file"
        setApiResponse({ 
          error: errorMsg,
          errorType: "FILE_READ_ERROR"
        })
        alert(`Error reading audio file: ${errorMsg}. Please try recording again.`)
      }
      reader.readAsDataURL(audioBlob) // This creates a data URL (base64 encoded)
    } catch (error: any) {
      console.error("Error in handleRecordingStop:", error)
      setIsLoading(false)
      setApiResponse({ 
        error: error?.message || "Failed to process recording",
        errorType: "RECORDING_STOP_ERROR"
      })
      alert(`Error processing recording: ${error?.message || "Unknown error"}. Please try recording again.`)
    }
  }

  // 🔥 API Integration
  const callSpeechAssessmentAPI = async (base64Audio, format) => {
    console.log("Calling LanguageConfidence API through CORS proxy...")
    // Use API config for consistent URL handling
    const proxyUrl = getSpeechProxyUrl(endpoint)
    
    console.log(`Using proxy URL: ${proxyUrl}`)
    setIsLoading(true)

    const isScripted = typeof endpoint === "string" && endpoint.includes("speech-assessment/scripted")
    const payloadObj: any = {
      audio_base64: base64Audio,
      audio_format: format,
      endpoint,
    }
    if (isScripted && expectedText) {
      payloadObj.expected_text = expectedText
    }
    const payload = JSON.stringify(payloadObj)

    try {
      const response = await fetch(`${proxyUrl}?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "lc-beta-features": "false",
        },
        body: payload,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const data = await speechProxyResponseJson(response)
      setApiResponse(data)
      // Pass API response and audio URL to parent component
      if (onApiResponse) {
        const audioDataUrl = recordedAudioUrlRef.current
        onApiResponse({
          apiResponse: data,
          audioUrl: audioDataUrl // Pass the recorded audio URL from ref (base64 data URL)
        })
      }
    } catch (error: any) {
      console.error("Error calling API:", error)
      // Show user-friendly error message
      const errorMessage = error?.message || "Unknown error occurred"
      console.error("Full error details:", error)
      
      // Set error response so the UI can show it gracefully
      setApiResponse({ 
        error: errorMessage,
        errorType: error?.name || "API_ERROR"
      })
      
      // Show alert with helpful message
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        if (isLocal) {
          alert("Network error: Could not connect to the proxy server at localhost:4000.\n\nPlease make sure the proxy server is running:\n1. Open a terminal\n2. Run: npm run proxy:speech\n3. Then try recording again.")
        } else {
          alert("Network error: Could not connect to the server.\n\nPlease check:\n1. Your internet connection\n2. The speech assessment service may be temporarily unavailable\n3. Try refreshing the page and recording again")
        }
      } else if (errorMessage.includes("404")) {
        alert("Service not found (404). The proxy endpoint may not be available. Please contact support if this issue persists.")
      } else if (errorMessage.includes("500")) {
        alert("Server error (500): The service is temporarily unavailable. Please try again later.")
      } else {
        alert(`Error processing audio: ${errorMessage}. Please try recording again.`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Playback Controls
  const togglePlayback = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const formatTime = (time: number) => {
    if (!time && time !== 0) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration
      if (dur && !isNaN(dur) && dur !== Infinity) {
        setDuration(dur)
      }
    }
  }

  const handleDurationChange = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration
      if (dur && !isNaN(dur) && dur !== Infinity) {
        setDuration(dur)
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
  }

  const handleSeekEnd = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime
    }
    setIsDragging(false)
  }

  const handleSeekStart = () => {
    setIsDragging(true)
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // On touch/drag, we want to update the visual slider immediately
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
  }

  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) return

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0) // Reset slider on end
    }
    
    audioElement.addEventListener("ended", handleEnded)

    return () => {
      if (audioElement) {
        audioElement.removeEventListener("ended", handleEnded)
      }
    }
  }, [audioUrl])

  // Helper to get valid CSS values from lessonColor
  const isTailwind = lessonColor.includes("from-")
  // Try to extract a hex color for text/borders, fallback to blue-600
  const extractHex = (str: string) => {
    const match = str.match(/#[0-9a-fA-F]{6}/)
    return match ? match[0] : "#2563eb"
  }
  const themeColor = isTailwind ? "#2563eb" : extractHex(lessonColor)
  
  // Extract gradient colors from Tailwind class or use provided gradient
  const getGradientStyle = () => {
    if (!isTailwind) {
      return { background: lessonColor }
    }
    
    // Map Tailwind gradient classes to actual gradient values
    const gradientMap: { [key: string]: string } = {
      "from-blue-500 to-cyan-400": "linear-gradient(to right, #3B82F6, #22D3EE)",
      "from-blue-700 to-blue-500": "linear-gradient(to right, #1D4ED8, #3B82F6)",
      "from-cyan-400 to-blue-500": "linear-gradient(to right, #22D3EE, #3B82F6)",
      "from-indigo-500 to-purple-500": "linear-gradient(to right, #6366F1, #A855F7)",
      "from-pink-500 to-rose-500": "linear-gradient(to right, #EC4899, #F43F5E)",
      "from-amber-500 to-red-500": "linear-gradient(to right, #F59E0B, #EF4444)",
      "from-emerald-500 to-emerald-600": "linear-gradient(to right, #10B981, #059669)",
      "from-purple-500 to-pink-500": "linear-gradient(to right, #A855F7, #EC4899)",
    }
    
    const gradientValue = gradientMap[lessonColor] || "linear-gradient(to right, #3B82F6, #22D3EE)"
    return { background: gradientValue }
  }
  
  const gradientStyle = getGradientStyle()

  return (
    <div className="w-full space-y-6">
      {/* 🎙 Start / Stop Recording */}
      {!isRecording && !audioUrl && (
        <button
          onClick={() => startRecording()}
          style={{
            ...gradientStyle,
            color: "#FFFFFF",
            borderRadius: "9999px",
            paddingLeft: "2rem",
            paddingRight: "2rem",
            paddingTop: "1.5rem",
            paddingBottom: "1.5rem",
            fontSize: "1.125rem",
            fontWeight: "600",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            transform: "scale(1)",
            transition: "all 0.2s ease-in-out",
            width: "100%",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)"
            e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)"
            e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.98)"
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1.05)"
          }}
        >
          <Mic style={{ width: "24px", height: "24px" }} />
          Start Recording
        </button>
      )}

      {isRecording && (
        <div
          className="flex flex-col items-center space-y-6 p-8 rounded-2xl shadow-lg"
          style={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}
        >
          <RecordingWaveform analyser={analyserRef.current} isRecording={isRecording} recordingTime={recordingTime} />
          <Button
            size="lg"
            onClick={stopRecording}
            className="text-white rounded-full px-8 shadow-lg flex items-center gap-2 mt-4"
            style={{
              backgroundColor: "#DC2626",
            }}
          >
            <Square className="w-5 h-5" />
            Stop Recording
          </Button>
        </div>
      )}

      {/* 🎧 Custom Playback Section - Updated Layout */}
      {audioUrl && !isRecording && !isLoading && (
        <div className="w-full animate-in fade-in zoom-in duration-300 flex flex-col gap-4">
          {/* Record Again Button (Top) */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause()
                  audioRef.current.currentTime = 0
                }
                // Reset for new recording
                setApiResponse(null)
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
                fontWeight: "600",
                borderWidth: "2px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f9fafb"
                e.currentTarget.style.transform = "translateY(-1px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <RotateCcw size={16} />
              Record Again
            </Button>
          </div>

          <div 
            style={{
              padding: "1.25rem",
              borderRadius: "1rem",
              backgroundColor: "white",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              border: "1px solid #e5e7eb"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {/* Play/Pause Button */}
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
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  transition: "transform 0.1s",
                  cursor: "pointer",
                  border: "none"
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                {isPlaying ? (
                  <Pause size={20} fill="currentColor" stroke="currentColor" />
                ) : (
                  <Play size={20} fill="currentColor" stroke="currentColor" style={{ marginLeft: "0.25rem" }} />
                )}
              </button>
              
              {/* Progress Bar & Time */}
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
                    height: "0.375rem", // h-1.5
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    backgroundColor: "#f3f4f6", // bg-gray-100
                    accentColor: themeColor,
                    outline: "none",
                    border: "none",
                    padding: 0,
                    margin: 0
                  }}
                />
                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "500", color: "#9ca3af" }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
            
            {/* Hidden Audio Element */}
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onDurationChange={handleDurationChange}
              style={{ display: "none" }}
            />
          </div>
        </div>
      )}

      {/* ⏳ Loading State */}
      {isLoading && <LoadingAssessment />}
    </div>
  )
}

