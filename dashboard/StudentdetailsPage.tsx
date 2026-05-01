"use client"

import React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "./ui/button"
import { ArrowLeft, Mic2, Award, Star, TrendingUp } from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

interface StudentDetailsData {
  email?: string
  class?: string
  transcribedText?: string
  pitch?: string | number
  volume?: string | number
  tone?: string
  hesitationWords?: number
  pauses?: number
  fillerWords?: number
  studentName?: string
  user_name?: string
  user?: string
  date?: string
  date_time?: string
  skill?: "reading" | "writing" | "listening" | "speaking"
  detailedResult?: any
  // Allow any additional fields from API
  [key: string]: any
}

export function StudentDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get student data from location state or use default sample data
  const rawStudentData: StudentDetailsData = location.state?.studentData || {}
  // Handle different API response formats: item (Reading), data (others), or direct object
  const detailedResult = rawStudentData.detailedResult?.item || rawStudentData.detailedResult?.data || rawStudentData.detailedResult || {}
  
  // Merge the base student data with detailed result
  const studentData: StudentDetailsData = {
    email: rawStudentData.email || detailedResult.email || detailedResult.user_email || "N/A",
    class: rawStudentData.class || detailedResult.class || "",
    transcribedText: rawStudentData.transcribedText || detailedResult.transcribed_text || detailedResult.text || detailedResult.content || "",
    pitch: rawStudentData.pitch || detailedResult.pitch || "N/A",
    volume: rawStudentData.volume || detailedResult.volume || 0,
    tone: rawStudentData.tone || detailedResult.tone || "Neutral",
    hesitationWords: rawStudentData.hesitationWords || detailedResult.hesitation_words || detailedResult.hesitationWords || 0,
    pauses: rawStudentData.pauses || detailedResult.pauses || 0,
    fillerWords: rawStudentData.fillerWords || detailedResult.filler_words || detailedResult.fillerWords || 0,
    studentName: rawStudentData.studentName || rawStudentData.user_name || rawStudentData.user || detailedResult.user_name || detailedResult.user || "Student",
    date: rawStudentData.date || rawStudentData.date_time || detailedResult.date || detailedResult.date_time || new Date().toLocaleString(),
    skill: rawStudentData.skill || detailedResult.skill || undefined,
    // Include all other fields from detailed result
    ...detailedResult,
  }
  
  const skill = studentData.skill || "speaking"
  const skillLabels: Record<string, string> = {
    reading: "Reading",
    writing: "Writing",
    listening: "Listening",
    speaking: "Speaking",
  }

  // Sample progress data for the graph
  const progressData = [
    { date: "Jul-17", score: 85 },
    { date: "Aug-05", score: 88 },
    { date: "Aug-27", score: 90 },
    { date: "Aug-28", score: 92 },
    { date: "Sep-02", score: 89 },
    { date: "Sep-04", score: 91 },
    { date: "Sep-08", score: 93 },
    { date: "Sep-09", score: 94 },
    { date: "Sep-19", score: 92 },
    { date: "Sep-22", score: 95 },
    { date: "Sep-24", score: 96 },
    { date: "Oct-25", score: 94 },
    { date: "Oct-28", score: 97 },
    { date: "Oct-29", score: 95 },
    { date: "Oct-31", score: 98 },
    { date: "Nov-03", score: 96 },
    { date: "Nov-04", score: 97 },
    { date: "Nov-05", score: 99 },
    { date: "Nov-06", score: 98 },
    { date: "Nov-09", score: 97 },
    { date: "Nov-10", score: 96 },
    { date: "Nov-11", score: 92 },
  ]

  const chartConfig = {
    score: {
      label: "Score (%)",
      color: "#3B82F6",
    },
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#1E40AF",
        padding: "32px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <Button
            variant="outline"
            onClick={() => {
              // Navigate back to edu/home with the skill pre-selected
              navigate("/edu/home", {
                state: {
                  selectedSkill: skill, // Pass the skill so EduDashboard can select it
                },
              })
            }}
            style={{
              borderColor: "#FFFFFF",
              color: "#FFFFFF",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <ArrowLeft style={{ width: "16px", height: "16px", marginRight: "8px" }} />
            Back
          </Button>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#FFFFFF",
              margin: 0,
            }}
          >
            {studentData.skill ? `${skillLabels[skill] || skill.toUpperCase()} - ` : ""}Student Detailed Analysis
          </h1>
        </div>

        {/* Main Content Card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Student Info Section */}
          <div
            style={{
              marginBottom: "32px",
              paddingBottom: "24px",
              borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#1E3A8A",
                marginBottom: "16px",
              }}
            >
              Student Info
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "rgba(30, 58, 138, 0.7)",
                    margin: "0 0 4px 0",
                  }}
                >
                  Email:
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: "500",
                    color: "#1E3A8A",
                    margin: 0,
                  }}
                >
                  {studentData.email}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "rgba(30, 58, 138, 0.7)",
                    margin: "0 0 4px 0",
                  }}
                >
                  Class:
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: "500",
                    color: "#1E3A8A",
                    margin: 0,
                  }}
                >
                  {studentData.class || "N/A"}
                </p>
              </div>
              {studentData.date && (
                <div>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "rgba(30, 58, 138, 0.7)",
                      margin: "0 0 4px 0",
                    }}
                  >
                    Date:
                  </p>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: "500",
                      color: "#1E3A8A",
                      margin: 0,
                    }}
                  >
                    {studentData.date}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Over Time Chart with Stats */}
          <div
            style={{
              marginBottom: "32px",
              paddingBottom: "24px",
              borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#1E3A8A",
                marginBottom: "24px",
              }}
            >
              Progress Over Time
            </h2>
            
            {/* Stats Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              {/* Speaking Time */}
              <div
                style={{
                  backgroundColor: "#EFF6FF",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "2px solid #3B82F6",
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.15)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#3B82F6",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <Mic2 style={{ width: "24px", height: "24px", color: "#FFFFFF" }} />
                  </div>
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1E3A8A",
                      marginBottom: "4px",
                    }}
                  >
                    2h 45m
                  </p>
                  <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.6)" }}>
                    Speaking Time
                  </p>
                </div>
              </div>

              {/* Lessons Completed */}
              <div
                style={{
                  backgroundColor: "#F0FDFA",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "2px solid #00B9FC",
                  boxShadow: "0 2px 8px rgba(0, 185, 252, 0.15)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#00B9FC",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <Award style={{ width: "24px", height: "24px", color: "#FFFFFF" }} />
                  </div>
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1E3A8A",
                      marginBottom: "4px",
                    }}
                  >
                    25
                  </p>
                  <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.6)" }}>
                    Lessons Completed
                  </p>
                </div>
              </div>

              {/* Streak Days */}
              <div
                style={{
                  backgroundColor: "#FFFBEB",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "2px solid #FBBF24",
                  boxShadow: "0 2px 8px rgba(251, 191, 36, 0.15)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#FBBF24",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <Star style={{ width: "24px", height: "24px", color: "#FFFFFF" }} />
                  </div>
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1E3A8A",
                      marginBottom: "4px",
                    }}
                  >
                    7
                  </p>
                  <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.6)" }}>
                    Streak Days
                  </p>
                </div>
              </div>

              {/* Improvement */}
              <div
                style={{
                  backgroundColor: "#F0F9FF",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "2px solid #3B82F6",
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.15)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#3B82F6",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <TrendingUp style={{ width: "24px", height: "24px", color: "#FFFFFF" }} />
                  </div>
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1E3A8A",
                      marginBottom: "4px",
                    }}
                  >
                    +23%
                  </p>
                  <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.6)" }}>
                    Improvement
                  </p>
                </div>
              </div>
            </div>

            {/* Graph */}
            <ChartContainer config={chartConfig} style={{ height: "400px" }}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 138, 0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(30, 58, 138, 0.6)"
                  style={{ fontSize: "12px" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="rgba(30, 58, 138, 0.6)"
                  style={{ fontSize: "12px" }}
                  domain={[0, 100]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: "#3B82F6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </div>

          {/* Reading Data Table - Show all Reading fields in table format */}
          {skill === "reading" && detailedResult && Object.keys(detailedResult).length > 0 && (
            <div
              style={{
                marginBottom: "32px",
                paddingBottom: "24px",
                borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1E3A8A",
                  marginBottom: "16px",
                }}
              >
                Reading Detailed Analysis
              </h2>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "8px",
                  border: "1px solid rgba(30, 58, 138, 0.1)",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                {(() => {
                  // Define field order and transformations
                  const fieldsToShow: Array<{key: string, label: string, getValue: (data: any) => any}> = []
                      
                      // User Name (combine first_name and last_name)
                      if (detailedResult.first_name || detailedResult.last_name) {
                        fieldsToShow.push({
                          key: "user_name",
                          label: "User Name",
                          getValue: (data) => {
                            const firstName = data.first_name || ""
                            const lastName = data.last_name || ""
                            return `${firstName} ${lastName}`.trim() || "-"
                          }
                        })
                      }
                      
                      // Organization (skip ID, just show name if available, otherwise skip)
                      // We'll skip organization_id as we don't have org names in the detailed result
                      
                      // Email
                      if (detailedResult.email) {
                        fieldsToShow.push({
                          key: "email",
                          label: "Email",
                          getValue: (data) => data.email || "-"
                        })
                      }
                      
                       // User Class
                       if (detailedResult.user_class !== undefined) {
                         fieldsToShow.push({
                           key: "user_class",
                           label: "User Class",
                           getValue: (data) => data.user_class || "-"
                         })
                       }
                      
                      // Overall Score
                      if (detailedResult.overall_score !== undefined && detailedResult.overall_score !== null) {
                        fieldsToShow.push({
                          key: "overall_score",
                          label: "Overall Score",
                          getValue: (data) => {
                            const score = data.overall_score
                            if (score === null || score === undefined) return "-"
                            const numScore = typeof score === "string" ? parseFloat(score) : score
                            return isNaN(numScore) ? score : `${numScore}%`
                          }
                        })
                      }
                      
                      // Pronunciation Score
                      if (detailedResult.pronunciation_score !== undefined && detailedResult.pronunciation_score !== null) {
                        fieldsToShow.push({
                          key: "pronunciation_score",
                          label: "Pronunciation Score",
                          getValue: (data) => {
                            const score = data.pronunciation_score
                            if (score === null || score === undefined) return "-"
                            const numScore = typeof score === "string" ? parseFloat(score) : score
                            return isNaN(numScore) ? score : `${numScore}%`
                          }
                        })
                      }
                      
                      // Fluency Score
                      if (detailedResult.fluency_score !== undefined && detailedResult.fluency_score !== null) {
                        fieldsToShow.push({
                          key: "fluency_score",
                          label: "Fluency Score",
                          getValue: (data) => {
                            const score = data.fluency_score
                            if (score === null || score === undefined) return "-"
                            const numScore = typeof score === "string" ? parseFloat(score) : score
                            return isNaN(numScore) ? score : `${numScore}%`
                          }
                        })
                      }
                      
                      // Grammar Score
                      if (detailedResult.grammar_score !== undefined && detailedResult.grammar_score !== null) {
                        fieldsToShow.push({
                          key: "grammar_score",
                          label: "Grammar Score",
                          getValue: (data) => {
                            const score = data.grammar_score
                            if (score === null || score === undefined) return "-"
                            const numScore = typeof score === "string" ? parseFloat(score) : score
                            return isNaN(numScore) ? score : `${numScore}%`
                          }
                        })
                      }
                      
                      // IELTS based score
                      if (detailedResult.ielts_score !== undefined && detailedResult.ielts_score !== null) {
                        fieldsToShow.push({
                          key: "ielts_score",
                          label: "IELTS based score",
                          getValue: (data) => data.ielts_score || "-"
                        })
                      }
                      
                      // CEFR Level
                      if (detailedResult.cefr_level) {
                        fieldsToShow.push({
                          key: "cefr_level",
                          label: "CEFR Level",
                          getValue: (data) => data.cefr_level || "-"
                        })
                      }
                      
                      // PTE Score
                      if (detailedResult.pte_score !== undefined && detailedResult.pte_score !== null) {
                        fieldsToShow.push({
                          key: "pte_score",
                          label: "PTE Score",
                          getValue: (data) => data.pte_score || "-"
                        })
                      }
                      
                      // Total Time
                      if (detailedResult.total_time !== undefined && detailedResult.total_time !== null) {
                        fieldsToShow.push({
                          key: "total_time",
                          label: "Total Time",
                          getValue: (data) => {
                            const time = data.total_time
                            if (!time) return "-"
                            return typeof time === "number" ? `${time}s` : time
                          }
                        })
                      }
                      
                      // Words Read
                      if (detailedResult.words_read !== undefined && detailedResult.words_read !== null) {
                        fieldsToShow.push({
                          key: "words_read",
                          label: "Words Read",
                          getValue: (data) => data.words_read || "-"
                        })
                      }
                      
                      // Words Per Minute
                      if (detailedResult.words_per_minute !== undefined && detailedResult.words_per_minute !== null) {
                        fieldsToShow.push({
                          key: "words_per_minute",
                          label: "Words Per Minute",
                          getValue: (data) => data.words_per_minute || "-"
                        })
                      }
                      
                      // Completion Percent
                      if (detailedResult.completion_percent !== undefined && detailedResult.completion_percent !== null) {
                        fieldsToShow.push({
                          key: "completion_percent",
                          label: "Completion Percent",
                          getValue: (data) => {
                            const percent = data.completion_percent
                            if (percent === null || percent === undefined) return "-"
                            const numPercent = typeof percent === "string" ? parseFloat(percent) : percent
                            return isNaN(numPercent) ? percent : `${numPercent}%`
                          }
                        })
                      }
                      
                       // Accuracy Percent
                       if (detailedResult.accuracy_percent !== undefined && detailedResult.accuracy_percent !== null) {
                         fieldsToShow.push({
                           key: "accuracy_percent",
                           label: "Accuracy Percent",
                           getValue: (data) => {
                             const percent = data.accuracy_percent
                             if (percent === null || percent === undefined) return "-"
                             const numPercent = typeof percent === "string" ? parseFloat(percent) : percent
                             return isNaN(numPercent) ? percent : `${numPercent}%`
                           }
                         })
                       }
                      
                      return (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: "16px",
                          }}
                        >
                          {fieldsToShow.map((field, index) => {
                            const value = field.getValue(detailedResult)
                            
                            return (
                              <div
                                key={field.key}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  padding: "16px",
                                  backgroundColor: index % 4 < 2 ? "#FFFFFF" : "#F9FAFB",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(30, 58, 138, 0.1)",
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: "13px",
                                    color: "#374151",
                                    fontWeight: "500",
                                    margin: "0 0 8px 0",
                                  }}
                                >
                                  {field.label}
                                </p>
                                <p
                                  style={{
                                    fontSize: "16px",
                                    color: "#1E3A8A",
                                    fontWeight: "500",
                                    margin: 0,
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {String(value)}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
              </div>
            </div>
          )}

          {/* Listening Data Table - Show Listening fields in table format */}
          {skill === "listening" && detailedResult && Object.keys(detailedResult).length > 0 && (
            <div
              style={{
                marginBottom: "32px",
                paddingBottom: "24px",
                borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1E3A8A",
                  marginBottom: "16px",
                }}
              >
                Listening Detailed Analysis
              </h2>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "8px",
                  border: "1px solid rgba(30, 58, 138, 0.1)",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                {(() => {
                  // Define field order and transformations for Listening
                  const fieldsToShow: Array<{key: string, label: string, getValue: (data: any) => any}> = []
                  
                  // User Name (combine first_name and last_name)
                  if (detailedResult.first_name || detailedResult.last_name) {
                    fieldsToShow.push({
                      key: "user_name",
                      label: "User Name",
                      getValue: (data) => {
                        const firstName = data.first_name || ""
                        const lastName = data.last_name || ""
                        return `${firstName} ${lastName}`.trim() || "-"
                      }
                    })
                  }
                  
                  // Email
                  if (detailedResult.email) {
                    fieldsToShow.push({
                      key: "email",
                      label: "Email",
                      getValue: (data) => data.email || "-"
                    })
                  }
                  
                  // Organisation ID (we don't have org names here, showing ID)
                  if (detailedResult.organisation_id !== undefined && detailedResult.organisation_id !== null) {
                    fieldsToShow.push({
                      key: "organisation",
                      label: "Organisation",
                      getValue: (data) => {
                        // Note: To show organization name, we'd need to fetch organizations list
                        // For now, showing the ID
                        return data.organisation_id || "-"
                      }
                    })
                  }
                  
                  // Title
                  if (detailedResult.title) {
                    fieldsToShow.push({
                      key: "title",
                      label: "Title",
                      getValue: (data) => data.title || "-"
                    })
                  }
                  
                  // IELTS based score
                  if (detailedResult.ielts_score !== undefined && detailedResult.ielts_score !== null) {
                    fieldsToShow.push({
                      key: "ielts_score",
                      label: "IELTS based score",
                      getValue: (data) => data.ielts_score || "-"
                    })
                  }
                  
                  // Created At (format: date and time in hour and min, not seconds)
                  if (detailedResult.created_at) {
                    fieldsToShow.push({
                      key: "created_at",
                      label: "Created At",
                      getValue: (data) => {
                        try {
                          const date = new Date(data.created_at)
                          if (!isNaN(date.getTime())) {
                            // Format: date and time in hour and min (no seconds)
                            const dateStr = date.toLocaleDateString()
                            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                            return `${dateStr}, ${timeStr}`
                          }
                        } catch (e) {
                          // Keep original value if parsing fails
                        }
                        return data.created_at || "-"
                      }
                    })
                  }
                  
                  return (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "16px",
                      }}
                    >
                      {fieldsToShow.map((field, index) => {
                        const value = field.getValue(detailedResult)
                        
                        return (
                          <div
                            key={field.key}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              padding: "16px",
                              backgroundColor: index % 4 < 2 ? "#FFFFFF" : "#F9FAFB",
                              borderRadius: "8px",
                              border: "1px solid rgba(30, 58, 138, 0.1)",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "13px",
                                color: "#374151",
                                fontWeight: "500",
                                margin: "0 0 8px 0",
                              }}
                            >
                              {field.label}
                            </p>
                            <p
                              style={{
                                fontSize: "16px",
                                color: "#1E3A8A",
                                fontWeight: "500",
                                margin: 0,
                                wordBreak: "break-word",
                              }}
                            >
                              {String(value)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Content Section - Show transcribed text for Speaking, or content for other skills */}
          {(studentData.transcribedText || detailedResult.text || detailedResult.content || detailedResult.answer) && (
            <div
              style={{
                marginBottom: "32px",
                paddingBottom: "24px",
                borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1E3A8A",
                  marginBottom: "16px",
                }}
              >
                {skill === "speaking" ? "Transcribed Text" : skill === "writing" ? "Written Content" : skill === "reading" ? "Reading Content" : skill === "listening" ? "Answer" : "Content"}
              </h2>
              <div
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: "8px",
                  padding: "16px",
                  border: "1px solid rgba(30, 58, 138, 0.1)",
                }}
              >
                <p
                  style={{
                    fontSize: "16px",
                    color: "#1E3A8A",
                    margin: 0,
                    lineHeight: "1.6",
                  }}
                >
                  {studentData.transcribedText || detailedResult.text || detailedResult.content || detailedResult.answer || ""}
                </p>
              </div>
            </div>
          )}

          {/* Metrics Section - Dynamic based on skill */}
          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#1E3A8A",
                marginBottom: "24px",
              }}
            >
              {skill === "speaking" ? "Speech Metrics" : skill === "reading" ? "Reading Metrics" : skill === "writing" ? "Writing Metrics" : skill === "listening" ? "Listening Metrics" : "Metrics"}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              {/* Show Overall Score if available */}
              {(detailedResult.overall_score !== undefined || studentData.overall_score !== undefined) && (
                <div
                  style={{
                    backgroundColor: "#EFF6FF",
                    borderRadius: "12px",
                    padding: "20px",
                    border: "1px solid rgba(30, 58, 138, 0.1)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      color: "rgba(30, 58, 138, 0.7)",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Overall Score
                  </p>
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1E3A8A",
                      margin: 0,
                    }}
                  >
                    {detailedResult.overall_score ?? studentData.overall_score ?? 0}%
                  </p>
                </div>
              )}

              {/* Show Fluency Score if available */}
              {(detailedResult.fluency_score !== undefined || studentData.fluency_score !== undefined) && (
                <div
                  style={{
                    backgroundColor: "#EFF6FF",
                    borderRadius: "12px",
                    padding: "20px",
                    border: "1px solid rgba(30, 58, 138, 0.1)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      color: "rgba(30, 58, 138, 0.7)",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Fluency Score
                  </p>
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1E3A8A",
                      margin: 0,
                    }}
                  >
                    {detailedResult.fluency_score ?? studentData.fluency_score ?? 0}%
                  </p>
                </div>
              )}

              {/* Show IELTS based score if available */}
              {(detailedResult.ielts_score !== undefined || studentData.ielts_score !== undefined) && (
                <div
                  style={{
                    backgroundColor: "#EFF6FF",
                    borderRadius: "12px",
                    padding: "20px",
                    border: "1px solid rgba(30, 58, 138, 0.1)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      color: "rgba(30, 58, 138, 0.7)",
                      margin: "0 0 8px 0",
                    }}
                  >
                    IELTS based score
                  </p>
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1E3A8A",
                      margin: 0,
                    }}
                  >
                    {detailedResult.ielts_score ?? studentData.ielts_score ?? 0}
                  </p>
                </div>
              )}

              {/* Speaking-specific metrics */}
              {skill === "speaking" && (
                <>
                  {studentData.pitch && (
                    <div
                      style={{
                        backgroundColor: "#EFF6FF",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(30, 58, 138, 0.1)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "14px",
                          color: "rgba(30, 58, 138, 0.7)",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Pitch
                      </p>
                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#1E3A8A",
                          margin: 0,
                        }}
                      >
                        {studentData.pitch}
                      </p>
                    </div>
                  )}

                  {studentData.volume !== undefined && (
                    <div
                      style={{
                        backgroundColor: "#EFF6FF",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(30, 58, 138, 0.1)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "14px",
                          color: "rgba(30, 58, 138, 0.7)",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Volume
                      </p>
                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#1E3A8A",
                          margin: 0,
                        }}
                      >
                        {typeof studentData.volume === "number"
                          ? studentData.volume.toFixed(2)
                          : studentData.volume}
                      </p>
                    </div>
                  )}

                  {studentData.tone && (
                    <div
                      style={{
                        backgroundColor: "#EFF6FF",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(30, 58, 138, 0.1)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "14px",
                          color: "rgba(30, 58, 138, 0.7)",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Tone
                      </p>
                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#1E3A8A",
                          margin: 0,
                        }}
                      >
                        {studentData.tone}
                      </p>
                    </div>
                  )}

                  {studentData.hesitationWords !== undefined && (
                    <div
                      style={{
                        backgroundColor: "#EFF6FF",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(30, 58, 138, 0.1)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "14px",
                          color: "rgba(30, 58, 138, 0.7)",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Hesitation Words
                      </p>
                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#1E3A8A",
                          margin: 0,
                        }}
                      >
                        {studentData.hesitationWords}
                      </p>
                    </div>
                  )}

                  {studentData.pauses !== undefined && (
                    <div
                      style={{
                        backgroundColor: "#EFF6FF",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(30, 58, 138, 0.1)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "14px",
                          color: "rgba(30, 58, 138, 0.7)",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Pauses
                      </p>
                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#1E3A8A",
                          margin: 0,
                        }}
                      >
                        {studentData.pauses}
                      </p>
                    </div>
                  )}

                  {studentData.fillerWords !== undefined && (
                    <div
                      style={{
                        backgroundColor: "#EFF6FF",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(30, 58, 138, 0.1)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "14px",
                          color: "rgba(30, 58, 138, 0.7)",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Filler Words
                      </p>
                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#1E3A8A",
                          margin: 0,
                        }}
                      >
                        {studentData.fillerWords}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Display any other metrics from detailedResult */}
              {detailedResult && Object.keys(detailedResult).map((key) => {
                // Skip already displayed fields and non-metric fields
                // Also skip fields that should not be shown: module_type, module_key, module_title, organisation_id, user_id, created_at, first_name, last_name, user_role, raw_result_json
                if (["id", "email", "user_email", "class", "text", "content", "answer", "transcribed_text", "overall_score", "fluency_score", "ielts_score", "date", "date_time", "module", "title", "conversation_type", "user", "user_name", "skill", "success", "data", 
                     "module_type", "module_key", "module_title", "organisation_id", "organization_id", "user_id", "created_at", "first_name", "last_name", "user_role", "raw_result_json"].includes(key.toLowerCase())) {
                  return null
                }
                
                const value = detailedResult[key]
                // Only show numeric or string values that look like metrics
                if (value === null || value === undefined || (typeof value === "object" && !Array.isArray(value))) {
                  return null
                }

                return (
                  <div
                    key={key}
                    style={{
                      backgroundColor: "#EFF6FF",
                      borderRadius: "12px",
                      padding: "20px",
                      border: "1px solid rgba(30, 58, 138, 0.1)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "14px",
                        color: "rgba(30, 58, 138, 0.7)",
                        margin: "0 0 8px 0",
                        textTransform: "capitalize",
                      }}
                    >
                      {key.replace(/_/g, " ")}
                    </p>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#1E3A8A",
                        margin: 0,
                      }}
                    >
                      {typeof value === "number" ? (key.toLowerCase().includes("score") || key.toLowerCase().includes("percent") ? `${value}%` : value) : String(value)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

