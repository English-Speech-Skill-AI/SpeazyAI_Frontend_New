"use client"

import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "./ui/button"
import { ArrowLeft } from "lucide-react"
import { SpeakingAssessmentResults } from "./SpeakingAssessmentResults"
import { PageHeader } from "./PageHeader"
import type { CSSProperties } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useEffect, useRef } from "react"

export function SpeakingAssessmentResultsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, authData } = useAuth()
  const hasSavedRef = useRef(false)
  
  // Get token from authData if token is null, and ensure it's a valid string
  const rawToken = token || authData?.token
  const authToken = rawToken && typeof rawToken === 'string' ? rawToken.trim() : null

  // Get data from navigation state
  const { apiResponse, chapter, classData, backRoute, lessonTitle, lessonId, speech, audioUrl, moduleType, moduleKey, moduleTitle } = (location.state as any) || {}
  
  // Also handle cases where audioUrl might be passed through different state structures
  const finalAudioUrl = audioUrl || (apiResponse?.audioUrl)
  
  // Debug: Log audio URL to verify it's being passed
  useEffect(() => {
    if (finalAudioUrl) {
      console.log("Audio URL found in SpeakingAssessmentResultsPage:", finalAudioUrl.substring(0, 50) + "...")
    } else {
      console.log("No audio URL found in SpeakingAssessmentResultsPage")
      console.log("Location state:", location.state)
    }
  }, [finalAudioUrl, location.state])

  const handleBack = () => {
    if (backRoute) {
      if (speech) {
        // Famous speeches
        navigate(backRoute)
      } else {
        navigate(backRoute, { state: { classData, chapter } })
      }
    } else {
      navigate("/speaking-modules")
    }
  }

  // If no data, redirect back
  if (!apiResponse || apiResponse.error) {
    if (backRoute) {
      if (speech) {
        // Famous speeches
        navigate(backRoute)
      } else {
        navigate(backRoute, { state: { classData, chapter } })
      }
    } else {
      navigate("/speaking-modules")
    }
    return null
  }

  // Save result to database when component mounts
  useEffect(() => {
    const saveResultToDatabase = async () => {
      if (hasSavedRef.current) return
      if (!apiResponse || apiResponse.error || !authToken) {
        console.warn("Cannot save result: missing token or invalid response", {
          hasToken: !!authToken,
          hasResponse: !!apiResponse,
          hasError: !!apiResponse?.error,
        })
        return
      }

      console.log("[Save Result] apiResponse (Confidence API result) keys:", Object.keys(apiResponse))
      console.log("[Save Result] apiResponse.reading:", apiResponse.reading)
      console.log("[Save Result] apiResponse.metadata:", apiResponse.metadata)
      console.log("[Save Result] Full apiResponse:", apiResponse)

      // Determine if this is from custom-content, academic-samples, famous-speeches, or speaking-modules
      const isCustomContent = backRoute?.includes("/custom-content") || lessonId
      const hasChapter = chapter && chapter.id
      const isFamousSpeech = speech && speech.id
      const isSpeakingModule = moduleType && moduleKey

      // Only save if we have chapter data, lesson data, speech data, or module data
      if (!hasChapter && !isCustomContent && !isFamousSpeech && !isSpeakingModule) {
        return
      }

      try {
        hasSavedRef.current = true

        let finalModuleType: string
        let finalModuleKey: string
        let finalModuleTitle: string

        if (isSpeakingModule && moduleType && moduleKey) {
          // Speaking module - use provided module data
          finalModuleType = moduleType
          finalModuleKey = moduleKey
          finalModuleTitle = moduleTitle || ""
        } else if (isFamousSpeech) {
          // Famous speech - use speech data
          finalModuleType = "FAMOUS_SPEECH"
          finalModuleKey = speech.id || "unknown"
          finalModuleTitle = speech.title || ""
        } else if (isCustomContent && lessonId) {
          // Custom content - use lessonId and lessonTitle
          finalModuleType = "CUSTOM_CONTENT"
          finalModuleKey = lessonId.toString()
          finalModuleTitle = lessonTitle || ""
        } else if (hasChapter) {
          // Academic sample - use chapter data
          finalModuleType = "ACADEMIC_SAMPLE"
          finalModuleKey = chapter.id?.startsWith("ch") 
            ? `chapter_${chapter.id.replace("ch", "")}` 
            : chapter.id || "unknown"
          finalModuleTitle = chapter.title || ""
        } else {
          // Fallback - shouldn't reach here but just in case
          return
        }

        // Map API response to the format expected by save-result API
        // Handle english_proficiency_scores structure - it might be nested or flat
        const englishProficiencyScores = apiResponse.overall?.english_proficiency_scores || {}
        const mockIelts = englishProficiencyScores.mock_ielts || apiResponse.overall?.mock_ielts
        const mockCefr = englishProficiencyScores.mock_cefr || apiResponse.overall?.mock_cefr
        const mockPte = englishProficiencyScores.mock_pte || apiResponse.overall?.mock_pte

        // Resolve reading from multiple possible response paths (API may nest or wrap it)
        const rawReading = apiResponse.reading
          ?? apiResponse.reading_metrics
          ?? apiResponse.data?.reading
          ?? apiResponse.result?.reading
          ?? {}
        const r = rawReading
        const completionVal = r.completion ?? r.completion_percent
        const accuracyVal = r.accuracy ?? r.accuracy_percent
        const completionNum = completionVal != null ? (Number(completionVal) <= 1 ? Number(completionVal) : Number(completionVal) / 100) : 0
        const accuracyNum = accuracyVal != null ? (Number(accuracyVal) <= 1 ? Number(accuracyVal) : Number(accuracyVal) / 100) : 0

        const payload = {
          module_type: finalModuleType,
          module_key: finalModuleKey,
          module_title: finalModuleTitle,
          result: {
            pronunciation: {
              overall_score: apiResponse.pronunciation?.overall_score ?? 0
            },
            fluency: {
              overall_score: apiResponse.fluency?.overall_score ?? 0
            },
            grammar: {
              overall_score: apiResponse.grammar?.overall_score ?? 0
            },
            overall: {
              overall_score: apiResponse.overall?.overall_score ?? 0,
              english_proficiency_scores: {
                mock_ielts: { 
                  prediction: mockIelts?.prediction ?? null 
                },
                mock_cefr: { 
                  prediction: mockCefr?.prediction ?? null 
                },
                mock_pte: { 
                  prediction: mockPte?.prediction ?? null 
                }
              }
            },
            reading: {
              reading_total_time: r.total_time ?? r.reading_time ?? 0,
              words_read: r.words_read ?? 0,
              unique_words_read: r.unique_words_read ?? 0,
              correct_words_read: r.correct_words_read ?? 0,
              words_per_minute: r.speed_wpm_correct ?? r.speed_wpm ?? 0,
              completion_percent: completionNum * 100,
              accuracy_percent: accuracyNum * 100,
              non_reading_time: r.non_reading_time ?? 0,
              total_time: r.total_time ?? r.reading_time ?? 0,
              speed_wpm_correct: r.speed_wpm_correct ?? r.speed_wpm ?? 0,
              completion: completionNum,
              accuracy: accuracyNum
            },
            metadata: {
              predicted_text: apiResponse.metadata?.predicted_text ?? "",
              content_relevance: apiResponse.metadata?.content_relevance ?? 0
            }
          }
        }

        console.log("Saving result to database with payload:", JSON.stringify(payload, null, 2))

        // Use the speaking API endpoint as specified by the user
        const response = await fetch("https://api.intelliviq.com/api/speaking/save-result.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Failed to save result to database:", response.status, response.statusText, errorText)
          
          // Handle 401 Unauthorized specifically
          if (response.status === 401) {
            console.error("Authentication failed. Token may be invalid or expired:", {
              hasToken: !!authToken,
              tokenLength: authToken?.length,
              tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : "null"
            })
          }
        } else {
          const responseData = await response.json()
          console.log("Result saved to database successfully:", responseData)
        }
      } catch (error) {
        console.error("Error saving result to database:", error)
        // Don't show error to user as this is a background operation
      }
    }

    saveResultToDatabase()
  }, [apiResponse, chapter, authToken, backRoute, lessonId, lessonTitle, speech, moduleType, moduleKey, moduleTitle, authData])

  const BLUE_BG: CSSProperties = {
    backgroundColor: "#1E3A8A",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflowX: "hidden",
        width: "100%",
      }}
    >
      {/* Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -10,
          ...BLUE_BG,
        }}
      />

      {/* Header */}
      <PageHeader />

      {/* Main Content */}
      <div
        style={{
          padding: "24px 16px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          style={{
            color: "#FFFFFF",
            marginBottom: "16px",
            borderRadius: "16px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent"
          }}
        >
          <ArrowLeft
            style={{
              width: "16px",
              height: "16px",
              marginRight: "8px",
            }}
          />
          Back
        </Button>

        {/* Speech Assessment Results */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <SpeakingAssessmentResults data={apiResponse} audioUrl={finalAudioUrl} />
        </div>
      </div>
    </div>
  )
}

