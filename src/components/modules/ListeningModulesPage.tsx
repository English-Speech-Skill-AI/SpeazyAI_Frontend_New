"use client"

import { Button } from "../ui/button"
import { ArrowLeft, Play, Pause, Loader2, Volume2, Radio, Music } from "lucide-react"
import { PageHeader } from "../PageHeader"
import type { CSSProperties } from "react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { API_URLS } from '@/config/apiConfig'
import { useTranslation } from "react-i18next"
import { useLocalizedNavigate } from "../LocaleLayout"

const API_URL = "https://api.intelliviq.com/api/content/list_bundle.php?section=listening"
const SAVE_RESULT_API = "https://api.intelliviq.com/api/listening/save-result.php"

type PracticeLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null

interface ListeningItem {
  title: string
  json_key: string
  json_url: string
  audio_key: string
  audio_url: string
  item_count: number | null
}

interface ListeningResponse {
  success: boolean
  prefix: string
  count: number
  items: ListeningItem[]
}

interface QuestionAnswer {
  question?: string
  answer?: string
  questions?: string[]
  answers?: string[]
  [key: string]: any
}

interface EvaluationResult {
  mark: number
  total: number
  percentage: number
  ieltsScore: number
  feedback?: string
  answerResults?: { [key: number]: boolean } // Track which answers are correct/wrong
}

export function ListeningModulesPage() {
  const { t } = useTranslation()
  const navigate = useLocalizedNavigate()
  const { token } = useAuth()
  const [selectedLevel, setSelectedLevel] = useState<PracticeLevel>(null)
  const [items, setItems] = useState<ListeningItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ListeningItem | null>(null)
  const [questionData, setQuestionData] = useState<QuestionAnswer | null>(null)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({})

  const BLUE_BG: CSSProperties = {
    backgroundColor: "#1E3A8A",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  }

  // Define allowed items per level based on screenshots (match against path/key, not title)
  const allowedItemsByLevel: Record<string, string[]> = {
    BEGINNER: ["lilys-morning", "sarahs-day", "toms-day"],
    INTERMEDIATE: ["career", "socialmedia", "stress-management"],
    ADVANCED: ["communication-skill", "environmental-issues"],
  }

  // Fetch listening items from API when level is selected
  useEffect(() => {
    const fetchItems = async () => {
      if (!token || !selectedLevel) {
        return
      }

      try {
        setLoading(true)
        const levelPath = selectedLevel.toLowerCase()
        const allowedItems = allowedItemsByLevel[selectedLevel] || []
        
        // Try with bundle parameter first, fallback to filtering
        let apiUrl = `${API_URL}&bundle=${levelPath}`
        
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          // If bundle parameter doesn't work, try without it and filter
          const fallbackResponse = await fetch(API_URL, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
          })
          
          if (!fallbackResponse.ok) {
            throw new Error(`Failed to fetch: ${fallbackResponse.status}`)
          }
          
          const fallbackData: ListeningResponse = await fallbackResponse.json()
          if (fallbackData.success && fallbackData.items) {
            // Filter items by level path and allowed items
            const filteredItems = fallbackData.items.filter(item => {
              const path = item.json_key || item.audio_key || ""
              const normalizedPath = path.toLowerCase().replace(/[^a-z0-9-]/g, "")
              const matchesLevel = path.includes(`/listening/${levelPath}/`)
              const matchesAllowed = allowedItems.some(allowed => {
                const normalizedAllowed = allowed.toLowerCase()
                // Check if path contains the allowed item name
                return normalizedPath.includes(normalizedAllowed) || 
                       item.title.toLowerCase().includes(normalizedAllowed.replace(/-/g, "")) ||
                       item.title.toLowerCase().includes(normalizedAllowed)
              })
              return matchesLevel && matchesAllowed
            })
            setItems(filteredItems)
          } else {
            setItems([])
          }
        } else {
          const data: ListeningResponse = await response.json()
          if (data.success && data.items) {
            // Filter to only show allowed items - check both path and title
            const filteredItems = data.items.filter(item => {
              const path = item.json_key || item.audio_key || ""
              const normalizedPath = path.toLowerCase().replace(/[^a-z0-9-]/g, "")
              return allowedItems.some(allowed => {
                const normalizedAllowed = allowed.toLowerCase()
                // Check if path contains the allowed item name, or title matches
                return normalizedPath.includes(normalizedAllowed) || 
                       item.title.toLowerCase().includes(normalizedAllowed.replace(/-/g, "")) ||
                       item.title.toLowerCase().includes(normalizedAllowed)
              })
            })
            setItems(filteredItems)
          } else {
            setItems([])
          }
        }
      } catch (error) {
        console.error("Error fetching listening items:", error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [token, selectedLevel])

  // Fetch question/answer data when item is selected
  useEffect(() => {
    const fetchQuestionData = async () => {
      if (!selectedItem?.json_url) return

      try {
        setLoadingQuestions(true)
        const response = await fetch(selectedItem.json_url)

        if (!response.ok) {
          throw new Error(`Failed to fetch JSON: ${response.status}`)
        }

        const data: QuestionAnswer = await response.json()
        setQuestionData(data)
        // Reset user answers and evaluation result when new item is selected
        setUserAnswers({})
        setEvaluationResult(null)
      } catch (error) {
        console.error("Error fetching question data:", error)
        setQuestionData(null)
      } finally {
        setLoadingQuestions(false)
      }
    }

    fetchQuestionData()
  }, [selectedItem])

  const handleLevelClick = (level: PracticeLevel) => {
    setSelectedLevel(level)
    setSelectedItem(null)
    setQuestionData(null)
    setUserAnswers({})
    setEvaluationResult(null)
  }

  const handleItemClick = (item: ListeningItem) => {
    setSelectedItem(item)
    setQuestionData(null)
    setUserAnswers({})
    setEvaluationResult(null)
  }

  const handleBack = () => {
    if (selectedItem) {
      // Go back to level items
      setSelectedItem(null)
      setQuestionData(null)
      setUserAnswers({})
      setEvaluationResult(null)
    } else if (selectedLevel) {
      // Go back to level selection
      setSelectedLevel(null)
      setItems([])
    }
    // Stop any playing audio
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    })
    setPlayingAudioId(null)
  }

  const handlePlayPause = (item: ListeningItem) => {
    const audioId = item.audio_url
    const audio = audioRefs.current[audioId]

    if (!audio) {
      // Create audio element if it doesn't exist
      const newAudio = new Audio(item.audio_url)
      audioRefs.current[audioId] = newAudio
      
      newAudio.addEventListener('ended', () => {
        setPlayingAudioId(null)
      })

      newAudio.play()
      setPlayingAudioId(audioId)
    } else {
      if (playingAudioId === audioId) {
        // Currently playing this audio, pause it
        audio.pause()
        setPlayingAudioId(null)
      } else {
        // Pause other audio if playing
        if (playingAudioId) {
          const otherAudio = audioRefs.current[playingAudioId]
          if (otherAudio) {
            otherAudio.pause()
            otherAudio.currentTime = 0
          }
        }
        // Play this audio
        audio.play()
        setPlayingAudioId(audioId)
      }
    }
  }

  const handleAnswerChange = (index: number, value: string) => {
    setUserAnswers(prev => ({ ...prev, [index]: value }))
  }

  const getQuestionsAndAnswers = () => {
    if (!questionData) return { questions: [], answers: [] }

    if (questionData.questions && Array.isArray(questionData.questions)) {
      return {
        questions: questionData.questions,
        answers: questionData.answers || []
      }
    } else if (questionData.question) {
      return {
        questions: [questionData.question],
        answers: questionData.answer ? [questionData.answer] : []
      }
    }
    return { questions: [], answers: [] }
  }

  const handleSubmit = async () => {
    if (!questionData || !selectedItem || !selectedLevel) return

    const { questions, answers } = getQuestionsAndAnswers()
    if (questions.length === 0) {
      alert(t("modules.listening.noQuestionsAvailable"))
      return
    }

    // Check if user has answered at least one question
    const answeredCount = Object.keys(userAnswers).filter(key => userAnswers[parseInt(key)]?.trim()).length
    if (answeredCount === 0) {
      alert(t("modules.listening.answerOneQuestion"))
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare the prompt for ChatGPT
      const answersText = answers.map((ans, idx) => `Question ${idx + 1}: ${questions[idx]}\nCorrect Answer: ${ans}`).join('\n\n')
      const userAnswersText = Object.keys(userAnswers)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => {
          const idx = parseInt(key)
          return `Question ${idx + 1}: ${questions[idx]}\nStudent Answer: ${userAnswers[idx] || '(not answered)'}`
        })
        .join('\n\n')

      const prompt = `You are an IELTS listening comprehension examiner. Evaluate the student's answers for a listening comprehension exercise.

QUESTIONS AND CORRECT ANSWERS:
${answersText}

STUDENT'S ANSWERS:
${userAnswersText}

Please evaluate each answer and provide:
1. A mark out of the total number of questions (e.g., 3/5 means 3 correct out of 5 questions)
2. An IELTS band score (0-9 scale) based on the overall performance
3. Brief feedback
4. For each question, indicate if the answer is correct (true) or incorrect (false)

Return your response as JSON in this exact format:
{
  "mark": <number of correct answers>,
  "total": <total number of questions>,
  "percentage": <percentage score>,
  "ieltsScore": <IELTS band score 0-9>,
  "feedback": "<brief feedback message>",
  "answerResults": {
    "0": <true if question 1 is correct, false otherwise>,
    "1": <true if question 2 is correct, false otherwise>,
    ...
  }
}

Be fair but strict. Consider partial credit for answers that are close but not exact. The answerResults object must have an entry for each question index (0-based).`

      const proxyUrl = API_URLS.chatgptProxy

      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "chat",
          messages: [
            {
              role: "system",
              content: "You are an expert IELTS listening comprehension examiner. Return only valid JSON in the specified format."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to evaluate: ${response.status}`)
      }

      const data = await response.json()
      let result: EvaluationResult

      if (data.response) {
        // Parse the JSON response from ChatGPT
        try {
          const parsed = JSON.parse(data.response)
          
          // Extract answerResults from ChatGPT response if available
          let answerResults: { [key: number]: boolean } = {}
          
          if (parsed.answerResults && typeof parsed.answerResults === 'object') {
            // Convert string keys to numbers and boolean values
            Object.keys(parsed.answerResults).forEach(key => {
              const idx = parseInt(key)
              if (!isNaN(idx)) {
                answerResults[idx] = Boolean(parsed.answerResults[key])
              }
            })
          }
          
          // Fallback to client-side comparison if ChatGPT didn't provide answerResults
          if (Object.keys(answerResults).length === 0) {
            questions.forEach((_, idx) => {
              const userAnswer = (userAnswers[idx] || "").trim().toLowerCase()
              const correctAnswer = (answers[idx] || "").trim().toLowerCase()
              
              if (!userAnswer) {
                // Not answered - mark as wrong
                answerResults[idx] = false
              } else {
                // Improved comparison: check for exact match first, then word matching
                if (userAnswer === correctAnswer) {
                  answerResults[idx] = true
                } else {
                  // Check if user answer contains the correct answer or vice versa
                  const userWords = userAnswer.split(/\s+/).filter(w => w.length > 0)
                  const correctWords = correctAnswer.split(/\s+/).filter(w => w.length > 0)
                  
                  // For single word answers, require exact match (case-insensitive)
                  if (correctWords.length === 1 && userWords.length === 1) {
                    answerResults[idx] = userAnswer === correctAnswer
                  } else {
                    // For multi-word answers, check if all key words from correct answer are present
                    const allKeyWordsMatch = correctWords.every(correctWord => 
                      userWords.some(userWord => 
                        userWord === correctWord || 
                        userWord.includes(correctWord) || 
                        correctWord.includes(userWord)
                      )
                    )
                    answerResults[idx] = allKeyWordsMatch && userWords.length > 0
                  }
                }
              }
            })
          }

          // Derive mark/total/percentage from answerResults so score always matches red/green borders
          const total = questions.length
          const mark = Object.keys(answerResults).reduce((sum, key) => sum + (answerResults[Number(key)] ? 1 : 0), 0)
          const percentage = total > 0 ? Math.round((mark / total) * 100) : 0
          // IELTS band from percentage so it stays consistent with the count
          let ieltsScore = 0
          if (percentage >= 95) ieltsScore = 9.0
          else if (percentage >= 85) ieltsScore = 8.5
          else if (percentage >= 75) ieltsScore = 8.0
          else if (percentage >= 65) ieltsScore = 7.5
          else if (percentage >= 55) ieltsScore = 7.0
          else if (percentage >= 45) ieltsScore = 6.5
          else if (percentage >= 35) ieltsScore = 6.0
          else if (percentage >= 25) ieltsScore = 5.5
          else if (percentage >= 15) ieltsScore = 5.0
          else if (percentage >= 5) ieltsScore = 4.5
          else ieltsScore = 4.0
          
          result = {
            mark,
            total,
            percentage,
            ieltsScore,
            feedback: parsed.feedback || "",
            answerResults: answerResults
          }
        } catch (e) {
          // Fallback if JSON parsing fails - use client-side comparison
          const answerResults: { [key: number]: boolean } = {}
          questions.forEach((_, idx) => {
            const userAnswer = (userAnswers[idx] || "").trim().toLowerCase()
            const correctAnswer = (answers[idx] || "").trim().toLowerCase()
            
            if (!userAnswer) {
              answerResults[idx] = false
            } else {
              answerResults[idx] = userAnswer === correctAnswer
            }
          })

          const total = questions.length
          const mark = Object.keys(answerResults).reduce((sum, key) => sum + (answerResults[Number(key)] ? 1 : 0), 0)
          const percentage = total > 0 ? Math.round((mark / total) * 100) : 0
          let ieltsScore = 0
          if (percentage >= 95) ieltsScore = 9.0
          else if (percentage >= 85) ieltsScore = 8.5
          else if (percentage >= 75) ieltsScore = 8.0
          else if (percentage >= 65) ieltsScore = 7.5
          else if (percentage >= 55) ieltsScore = 7.0
          else if (percentage >= 45) ieltsScore = 6.5
          else if (percentage >= 35) ieltsScore = 6.0
          else if (percentage >= 25) ieltsScore = 5.5
          else if (percentage >= 15) ieltsScore = 5.0
          else if (percentage >= 5) ieltsScore = 4.5
          else ieltsScore = 4.0
          
          result = {
            mark,
            total,
            percentage,
            ieltsScore,
            feedback: data.response || "Evaluation completed",
            answerResults: answerResults
          }
        }
      } else {
        throw new Error("Invalid response from API")
      }
      setEvaluationResult(result)

      // Save result to API using the selected level variable
      if (result.ieltsScore > 0 && token && selectedLevel) {
        try {
          const saveResponse = await fetch(SAVE_RESULT_API, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              practice_level: selectedLevel,
              title: selectedItem.title,
              ielts_score: result.ieltsScore
            }),
          })

          if (!saveResponse.ok) {
            console.error("Failed to save result:", await saveResponse.text())
          } else {
            console.log("Result saved successfully")
          }
        } catch (err) {
          console.error("Error saving result:", err)
        }
      }

    } catch (error) {
      console.error("Error evaluating answers:", error)
      alert(t("modules.listening.evaluateFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render item detail view
  if (selectedItem) {
    const isPlaying = playingAudioId === selectedItem.audio_url
    const { questions, answers } = getQuestionsAndAnswers()

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "relative", overflowX: "hidden", width: "100%" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: -10, ...BLUE_BG }} />
        <PageHeader />

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: "896px", margin: "0 auto", padding: "32px 16px" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              style={{ color: "white", marginBottom: "32px", borderRadius: "16px" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <ArrowLeft style={{ width: "16px", height: "16px", marginRight: "8px" }} />
              {t("modules.back")}
            </Button>

            <div style={{ backgroundColor: "white", borderRadius: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
              <div style={{ padding: "24px 24px 16px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1E3A8A", textTransform: "capitalize", margin: 0 }}>
                  {selectedItem.title.replace(/-/g, " ")}
                </h2>
              </div>
              <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Audio Player */}
                <div style={{ background: "linear-gradient(to bottom right, #3B82F6, #00B9FC)", borderRadius: "16px", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "16px" }}>
                    <button
                      onClick={() => handlePlayPause(selectedItem)}
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        border: "2px solid rgba(255, 255, 255, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "white"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)"}
                    >
                      {isPlaying ? (
                        <Pause style={{ width: "32px", height: "32px" }} />
                      ) : (
                        <Play style={{ width: "32px", height: "32px", marginLeft: "4px" }} />
                      )}
                    </button>
                  </div>
                  <audio
                    ref={(el) => {
                      if (el && !audioRefs.current[selectedItem.audio_url]) {
                        audioRefs.current[selectedItem.audio_url] = el
                      }
                    }}
                    src={selectedItem.audio_url}
                    preload="metadata"
                  />
                </div>

                {/* Questions and Answers */}
                {loadingQuestions ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
                    <Loader2 style={{ width: "24px", height: "24px", animation: "spin 1s linear infinite", color: "#1E3A8A" }} />
                    <span style={{ marginLeft: "8px", color: "#1E3A8A" }}>{t("modules.listening.loadingQuestions")}</span>
                  </div>
                ) : questions.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#1E3A8A", margin: 0 }}>{t("modules.listening.questionsAndAnswers")}</h3>
                    
                    {questions.map((question, idx) => {
                      const isWrong = evaluationResult?.answerResults && evaluationResult.answerResults[idx] === false
                      const isCorrect = evaluationResult?.answerResults && evaluationResult.answerResults[idx] === true
                      
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            backgroundColor: isWrong ? "#fef2f2" : "#f9fafb", 
                            borderRadius: "8px", 
                            padding: "16px", 
                            border: isWrong ? "2px solid #ef4444" : "1px solid #e5e7eb",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <p style={{ fontWeight: "600", color: "#1E3A8A", marginBottom: "8px", margin: "0 0 8px 0" }}>
                            {t("modules.listening.question", { n: idx + 1 })}
                          </p>
                          <p style={{ color: "#374151", marginBottom: "12px", margin: "0 0 12px 0" }}>
                            {question}
                          </p>
                        <input
                          type="text"
                          placeholder={t("modules.listening.enterAnswer")}
                          value={userAnswers[idx] || ""}
                          onChange={(e) => handleAnswerChange(idx, e.target.value)}
                          disabled={!!evaluationResult}
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: "6px",
                            border: evaluationResult?.answerResults?.[idx] === false 
                              ? "2px solid #ef4444" 
                              : evaluationResult?.answerResults?.[idx] === true
                                ? "2px solid #10b981"
                                : "2px solid #d1d5db",
                            fontSize: "14px",
                            backgroundColor: "#ffffff",
                            color: "#111827",
                            outline: "none",
                            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                            transition: "all 0.2s ease",
                            cursor: evaluationResult ? "not-allowed" : "text",
                            opacity: evaluationResult ? 0.7 : 1
                          }}
                          onFocus={(e) => {
                            if (!evaluationResult) {
                              e.currentTarget.style.borderColor = "#3B82F6"
                              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)"
                            }
                          }}
                          onBlur={(e) => {
                            if (!evaluationResult) {
                              e.currentTarget.style.borderColor = "#d1d5db"
                              e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                            }
                          }}
                        />
                        </div>
                      )
                    })}

                    {!evaluationResult && (
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{
                          width: "100%",
                          background: "linear-gradient(to right, #3B82F6, #00B9FC)",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          padding: "12px 24px",
                          fontSize: "16px",
                          fontWeight: "600",
                          cursor: isSubmitting ? "not-allowed" : "pointer",
                          opacity: isSubmitting ? 0.6 : 1
                        }}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 style={{ width: "16px", height: "16px", marginRight: "8px", animation: "spin 1s linear infinite", display: "inline-block" }} />
                            {t("modules.listening.evaluating")}
                          </>
                        ) : (
                          t("modules.listening.submitAnswers")
                        )}
                      </Button>
                    )}

                    {evaluationResult && (
                      <div style={{ backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "20px", border: "2px solid #86efac" }}>
                        <h4 style={{ fontSize: "18px", fontWeight: "600", color: "#166534", margin: "0 0 16px 0" }}>{t("modules.listening.yourResults")}</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#166534", fontWeight: "500" }}>{t("modules.listening.score")}</span>
                            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#166534" }}>
                              {evaluationResult.mark}/{evaluationResult.total} ({evaluationResult.percentage}%)
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#166534", fontWeight: "500" }}>{t("modules.listening.ieltsBandScore")}</span>
                            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#166534" }}>
                              {evaluationResult.ieltsScore.toFixed(1)}
                            </span>
                          </div>
                          {evaluationResult.feedback && (
                            <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px solid #86efac" }}>
                              <p style={{ color: "#166534", margin: 0, fontSize: "14px" }}>{evaluationResult.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ backgroundColor: "#fef3c7", borderRadius: "8px", padding: "16px", border: "1px solid #fde047" }}>
                    <p style={{ color: "#92400e", margin: 0 }}>{t("modules.listening.noQuestions")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render level items view
  if (selectedLevel) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "relative", overflowX: "hidden", width: "100%" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: -10, ...BLUE_BG }} />
        <PageHeader />

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 16px" }}>
            <div style={{ marginBottom: "32px" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                style={{ color: "white", marginBottom: "32px", borderRadius: "16px" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <ArrowLeft style={{ width: "16px", height: "16px", marginRight: "8px" }} />
                Back
              </Button>
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: "30px", fontWeight: "bold", color: "white", marginBottom: "12px", margin: "0 0 12px 0", textTransform: "capitalize" }}>
                  {t("modules.listening.levelListening", { level: selectedLevel ? t(`modules.listening.${selectedLevel.toLowerCase()}`) : "" })}
                </h2>
                <p style={{ fontSize: "16px", color: "rgba(255, 255, 255, 0.8)", margin: 0 }}>{t("modules.listening.chooseExercise")}</p>
              </div>
            </div>

            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
                <Loader2 style={{ width: "32px", height: "32px", animation: "spin 1s linear infinite", color: "white" }} />
                <span style={{ marginLeft: "12px", color: "white" }}>{t("modules.listening.loadingExercises")}</span>
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0" }}>
                <p style={{ color: "white", fontSize: "18px", margin: 0 }}>{t("modules.listening.noExercises")}</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
                {items.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleItemClick(item)}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "24px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-8px)"
                      e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}
                  >
                    <div style={{ padding: "24px 24px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flexGrow: 1 }}>
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          background: "linear-gradient(135deg, #3B82F6 0%, #00B9FC 100%)",
                          borderRadius: "24px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "16px",
                          boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                        }}
                      >
                        <Play style={{ width: "32px", height: "32px", color: "white", marginLeft: "4px" }} />
                      </div>
                      <h3
                        style={{
                          color: "#1E3A8A",
                          fontSize: "20px",
                          marginBottom: "8px",
                          fontWeight: 600,
                          textTransform: "capitalize",
                          margin: "0 0 8px 0",
                        }}
                      >
                        {item.title.replace(/-/g, " ")}
                      </h3>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "rgba(30, 58, 138, 0.7)",
                          lineHeight: "1.5",
                          margin: 0,
                        }}
                      >
                        {t("modules.listening.clickToView")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render level selection view
  const levelModules = [
    { id: "BEGINNER" as PracticeLevel, titleKey: "modules.listening.beginner", descKey: "modules.listening.beginnerDesc", icon: Volume2, gradient: "linear-gradient(135deg, #3B82F6 0%, #00B9FC 100%)" },
    { id: "INTERMEDIATE" as PracticeLevel, titleKey: "modules.listening.intermediate", descKey: "modules.listening.intermediateDesc", icon: Radio, gradient: "linear-gradient(135deg, #00B9FC 0%, #246BCF 100%)" },
    { id: "ADVANCED" as PracticeLevel, titleKey: "modules.listening.advanced", descKey: "modules.listening.advancedDesc", icon: Music, gradient: "linear-gradient(135deg, #246BCF 0%, #1E3A8A 100%)" },
  ]

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "relative", overflowX: "hidden", width: "100%" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: -10, ...BLUE_BG }} />
      <PageHeader />

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 16px" }}>
          <div style={{ marginBottom: "32px" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/skills-home")}
              style={{ color: "white", marginBottom: "32px", borderRadius: "16px" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <ArrowLeft style={{ width: "16px", height: "16px", marginRight: "8px" }} />
              Back
            </Button>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "30px", fontWeight: "bold", color: "white", marginBottom: "12px", margin: "0 0 12px 0" }}>{t("modules.listening.title")}</h2>
              <p style={{ fontSize: "16px", color: "rgba(255, 255, 255, 0.8)", margin: 0 }}>{t("modules.chooseLearningPath")}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
            {levelModules.map((module) => {
              const Icon = module.icon
              return (
                <div
                  key={module.id}
                  onClick={() => handleLevelClick(module.id)}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "24px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-8px)"
                    e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                >
                  <div style={{ padding: "24px 24px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flexGrow: 1 }}>
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        background: module.gradient,
                        borderRadius: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "16px",
                        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                        transition: "transform 0.3s ease",
                      }}
                    >
                      <Icon style={{ width: "32px", height: "32px", color: "white" }} />
                    </div>
                    <h3
                      style={{
                        color: "#1E3A8A",
                        fontSize: "20px",
                        marginBottom: "8px",
                        fontWeight: 600,
                        margin: "0 0 8px 0",
                      }}
                    >
                      {t(module.titleKey)}
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "rgba(30, 58, 138, 0.7)",
                        lineHeight: "1.5",
                        margin: 0,
                      }}
                    >
                      {t(module.descKey)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
