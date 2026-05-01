"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import { Button } from "../ui/button"
import { ArrowLeft, Mic2, BookOpen, PenTool, Headphones } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { getExelerateApiBase } from "../../config/apiConfig"
import {
  ChartContainer,
  ChartTooltip,
} from "../ui/chart"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
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
  const { token } = useAuth()
  const apiBase = getExelerateApiBase() + "/api"
  const API_TOKEN = token || ""
  
  // Student ID in URL (e.g. /progress-dashboard/students/51)
  const { userId: urlUserId } = useParams<{ userId?: string }>()
  // Get student data and return state (org/class, fromSection) from location state
  const rawStudentData: StudentDetailsData = location.state?.studentData || {}
  const returnState = location.state?.returnState as { selectedOrganization?: string; selectedClass?: string } | undefined
  const fromSection = location.state?.fromSection as "my-analysis" | "organization" | undefined

  const [detailedResult, setDetailedResult] = useState<any>(rawStudentData.detailedResult?.item || rawStudentData.detailedResult?.data || rawStudentData.detailedResult || {})
  const [isLoadingSkillData, setIsLoadingSkillData] = useState(false)
  const [skillDataError, setSkillDataError] = useState<string | null>(null)
  const [isNotAttempted, setIsNotAttempted] = useState(false)

  // Combined line graph: Speaking, Reading, Writing, Listening (graphs/*.php?user_id=X)
  const [graphLoading, setGraphLoading] = useState(false)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [graphRawSeries, setGraphRawSeries] = useState<Record<string, Array<{ date: string; score: number }>>>({
    speaking: [],
    reading: [],
    writing: [],
    listening: [],
  })
  
  const skill = rawStudentData.skill || "speaking"
  const skillLabels: Record<string, string> = {
    reading: "Reading",
    writing: "Writing",
    listening: "Listening",
    speaking: "Speaking",
  }
  
  // Get user ID: URL param (so URL is the source of truth) or state
  const userId = urlUserId || rawStudentData.id || rawStudentData.user_id || rawStudentData.userId
  
  // Fetch skill-specific result when skill changes or component mounts
  useEffect(() => {
    if (skill && userId) {
      fetchSkillResult(skill, userId)
    }
  }, [skill, userId])
  
  // Function to fetch skill-specific results via list-results.php?user_id=X (per API spec)
  const fetchSkillResult = async (skillType: string, id: string | number) => {
    if (!id) {
      console.warn("No user ID provided for fetching skill result")
      return
    }

    setIsLoadingSkillData(true)
    setSkillDataError(null)
    setIsNotAttempted(false)

    try {
      // Use list-results.php with user_id query param for each skill (per API)
      let API_URL = ""
      switch (skillType) {
        case "speaking":
          API_URL = `${apiBase}/speaking/list-results.php?user_id=${id}`
          break
        case "reading":
          API_URL = `${apiBase}/reading/list-results.php?user_id=${id}`
          break
        case "writing":
          API_URL = `${apiBase}/writing/list-results.php?user_id=${id}`
          break
        case "listening":
          API_URL = `${apiBase}/listening/list-results.php?user_id=${id}`
          break
        default:
          console.warn(`Unknown skill type: ${skillType}`)
          setIsLoadingSkillData(false)
          return
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || ""}`,
      }

      let response = await fetch(API_URL, { method: "GET", headers })

      // Listening API may accept POST with empty body; try if GET returns 405
      if (response.status === 405 && skillType === "listening") {
        response = await fetch(API_URL, {
          method: "POST",
          headers,
          body: "",
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`${skillType} API Error (${response.status}):`, errorText)
        if (response.status === 404) {
          setDetailedResult({})
          setSkillDataError("Student has not attempted this skill yet.")
          setIsNotAttempted(true)
          setIsLoadingSkillData(false)
          return
        }
        throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`)
      }

      const data = await response.json()

      // Handle 200 OK with "Result not found" in body
      if (data?.success === false && /result not found|not found/i.test(data?.message || "")) {
        setDetailedResult({})
        setSkillDataError("Student has not attempted this skill yet.")
        setIsNotAttempted(true)
        setIsLoadingSkillData(false)
        return
      }

      // list-results can return { items: [...] }, { data: [...] }, or { success, data/items: [...] }
      const list =
        Array.isArray(data.items) ? data.items
        : Array.isArray(data.data) ? data.data
        : Array.isArray(data) ? data
        : []
      if (list.length === 0) {
        setDetailedResult({})
        setSkillDataError("Student has not attempted this skill yet.")
        setIsNotAttempted(true)
        setIsLoadingSkillData(false)
        return
      }

      // Use most recent result (first by date); support date_time, created_at, date
      const sorted = [...list].sort((a: any, b: any) => {
        const dateA = a.date_time || a.created_at || a.date || ""
        const dateB = b.date_time || b.created_at || b.date || ""
        const timeA = dateA ? new Date(dateA).getTime() : 0
        const timeB = dateB ? new Date(dateB).getTime() : 0
        return timeB - timeA
      })
      const result = sorted[0] || list[0]

      setDetailedResult(result)
      
    } catch (error: any) {
      console.error(`Error fetching ${skillType} result:`, error)
      setSkillDataError(error.message || `Failed to fetch ${skillType} result`)
    } finally {
      setIsLoadingSkillData(false)
    }
  }

  // Fetch graph data (speaking, reading, writing, listening) for combined line chart - when viewing a specific user
  useEffect(() => {
    const uid = urlUserId || rawStudentData.id || rawStudentData.user_id || rawStudentData.userId
    if (!uid || !API_TOKEN) {
      setGraphRawSeries({ speaking: [], reading: [], writing: [], listening: [] })
      return
    }
    const endpoints = [
      { key: "speaking" as const, url: `${apiBase}/graphs/speaking.php?user_id=${uid}` },
      { key: "reading" as const, url: `${apiBase}/graphs/reading.php?user_id=${uid}` },
      { key: "writing" as const, url: `${apiBase}/graphs/writing.php?user_id=${uid}` },
      { key: "listening" as const, url: `${apiBase}/graphs/listening.php?user_id=${uid}` },
    ]
    let cancelled = false
    setGraphLoading(true)
    setGraphError(null)
    const headers: HeadersInit = { "Content-Type": "application/json", Authorization: `Bearer ${API_TOKEN}` }

    // API returns { success, module, points: [ { x: "2026-02-06", y: 74 }, ... ] }
    const normalizePoint = (item: any): { date: string; score: number } | null => {
      const dateStr = item?.x ?? item?.date ?? item?.date_time ?? item?.created_at ?? item?.created_at_date
      if (!dateStr) return null
      const d = new Date(dateStr)
      const dateLabel = isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      const scoreRaw = item?.y ?? item?.score ?? item?.overall_score ?? item?.total_score ?? item?.percentage
      const score = typeof scoreRaw === "number" ? scoreRaw : typeof scoreRaw === "string" ? parseFloat(scoreRaw) : NaN
      if (Number.isNaN(score)) return null
      return { date: dateLabel, score }
    }

    const fetchOne = async (key: "speaking" | "reading" | "writing" | "listening", url: string) => {
      try {
        const res = await fetch(url, { method: "GET", headers })
        if (!res.ok) return []
        const data = await res.json()
        const list = Array.isArray(data?.points)
          ? data.points
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data)
                ? data
                : []
        return list.map(normalizePoint).filter((p): p is { date: string; score: number } => p != null)
      } catch {
        return []
      }
    }

    Promise.all(endpoints.map((e) => fetchOne(e.key, e.url)))
      .then(([speaking, reading, writing, listening]) => {
        if (cancelled) return
        setGraphRawSeries({ speaking, reading, writing, listening })
      })
      .catch(() => { if (!cancelled) setGraphError("Failed to load graph data") })
      .finally(() => { if (!cancelled) setGraphLoading(false) })
    return () => { cancelled = true }
  }, [urlUserId, rawStudentData.id, rawStudentData.user_id, rawStudentData.userId, apiBase, API_TOKEN])

  // Merge all series by date for the combined line chart (X = date, Y = score, 4 lines)
  const graphChartData = useMemo(() => {
    const byDate: Record<string, { date: string; speaking?: number; reading?: number; writing?: number; listening?: number }> = {}
    const add = (key: "speaking" | "reading" | "writing" | "listening", points: Array<{ date: string; score: number }>) => {
      points.forEach((p) => {
        if (!byDate[p.date]) byDate[p.date] = { date: p.date }
        ;(byDate[p.date] as any)[key] = p.score
      })
    }
    add("speaking", graphRawSeries.speaking)
    add("reading", graphRawSeries.reading)
    add("writing", graphRawSeries.writing)
    add("listening", graphRawSeries.listening)
    const arr = Object.values(byDate)
    arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return arr
  }, [graphRawSeries])
  
  // Merge the base student data with detailed result
  // CRITICAL: rawStudentData takes precedence to ensure correct student info is displayed
  const studentData: StudentDetailsData = {
    // CRITICAL: Use rawStudentData first (from navigation state) - this is the correct student
    email: rawStudentData.email || "N/A",
    class: rawStudentData.class || "",
    studentName: rawStudentData.studentName || rawStudentData.user_name || rawStudentData.user || rawStudentData.name || "Student",
    // Use detailedResult only for skill-specific data, not for student identity
    transcribedText: rawStudentData.transcribedText || detailedResult.transcribed_text || detailedResult.text || detailedResult.content || "",
    pitch: rawStudentData.pitch || detailedResult.pitch || "N/A",
    volume: rawStudentData.volume || detailedResult.volume || 0,
    tone: rawStudentData.tone || detailedResult.tone || "Neutral",
    hesitationWords: rawStudentData.hesitationWords || detailedResult.hesitation_words || detailedResult.hesitationWords || 0,
    pauses: rawStudentData.pauses || detailedResult.pauses || 0,
    fillerWords: rawStudentData.fillerWords || detailedResult.filler_words || detailedResult.fillerWords || 0,
    date: rawStudentData.date || rawStudentData.date_time || detailedResult.date || detailedResult.date_time || new Date().toLocaleString(),
    skill: skill,
    // Include other fields from detailed result (but don't override student identity fields)
    ...Object.fromEntries(
      Object.entries(detailedResult).filter(([key]) => 
        !['email', 'user_email', 'studentName', 'user_name', 'user', 'name', 'class'].includes(key)
      )
    ),
    // CRITICAL: Override with rawStudentData to ensure correct student identity
    name: rawStudentData.name || rawStudentData.studentName || rawStudentData.user_name || rawStudentData.user,
    user_name: rawStudentData.user_name || rawStudentData.studentName || rawStudentData.name || rawStudentData.user,
    user: rawStudentData.user || rawStudentData.studentName || rawStudentData.name || rawStudentData.user_name,
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
              let org = returnState?.selectedOrganization
              let cls = returnState?.selectedClass
              let from = fromSection
              try {
                const stored = sessionStorage.getItem("progressDashboardReturnState")
                if (stored) {
                  const parsed = JSON.parse(stored) as { selectedOrganization?: string; selectedClass?: string; fromSection?: "my-analysis" | "organization" }
                  if (org === undefined) org = parsed.selectedOrganization
                  if (cls === undefined) cls = parsed.selectedClass
                  if (from === undefined) from = parsed.fromSection
                }
                sessionStorage.setItem(
                  "progressDashboardReturnState",
                  JSON.stringify({ selectedOrganization: org, selectedClass: cls, fromSection: from })
                )
              } catch (_) {}
              navigate("/progress-dashboard", {
                state: {
                  selectedSkill: skill,
                  selectedOrganization: org,
                  selectedClass: cls,
                  fromSection: from,
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

          {/* Skills Tab Section */}
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
              Skills
            </h2>
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              {[
                { id: "speaking" as const, label: "Speaking", icon: Mic2, color: "#3B82F6" },
                { id: "reading" as const, label: "Reading", icon: BookOpen, color: "#246BCF" },
                { id: "writing" as const, label: "Writing", icon: PenTool, color: "#00B9FC" },
                { id: "listening" as const, label: "Listening", icon: Headphones, color: "#1E3A8A" },
              ].map((skillBtn) => {
                const Icon = skillBtn.icon
                const isActive = skill === skillBtn.id
                return (
                  <Button
                    key={skillBtn.id}
                    onClick={() => {
                      // Update skill and fetch new data
                      if (userId) {
                        fetchSkillResult(skillBtn.id, userId)
                      }
                      // Keep URL with student ID and preserve state
                      const path = userId ? `/progress-dashboard/students/${userId}` : "/progress-dashboard/students"
                      navigate(path, {
                        state: {
                          studentData: {
                            ...rawStudentData,
                            skill: skillBtn.id,
                            id: userId,
                          },
                          returnState,
                          fromSection,
                        },
                      })
                    }}
                    variant={isActive ? "default" : "outline"}
                    style={{
                      backgroundColor: isActive ? skillBtn.color : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : skillBtn.color,
                      borderColor: skillBtn.color,
                      borderWidth: "1px",
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: isActive ? "600" : "500",
                    }}
                  >
                    <Icon style={{ width: "18px", height: "18px", marginRight: "8px" }} />
                    {skillBtn.label}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Combined line graph: Speaking, Reading, Writing, Listening (only when viewing a specific user) */}
          {userId && (
            <div
              style={{
                marginBottom: "32px",
                paddingBottom: "24px",
                borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
              }}
            >
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: "#1E3A8A",
                  marginBottom: "6px",
                }}
              >
                Score Over Time
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: "rgba(30, 58, 138, 0.6)",
                  marginBottom: "20px",
                }}
              >
                Date vs score by skill
              </p>
              {graphLoading && (
                <div style={{ padding: "24px", textAlign: "center", color: "#1E3A8A" }}>
                  Loading graph data...
                </div>
              )}
              {graphError && (
                <div style={{ padding: "16px", backgroundColor: "#FEE2E2", borderRadius: "8px", color: "#DC2626" }}>
                  {graphError}
                </div>
              )}
              {!graphLoading && !graphError && graphChartData.length > 0 && (
                <div
                  style={{
                    minHeight: "480px",
                    width: "100%",
                    padding: "24px 20px",
                    backgroundColor: "rgba(30, 58, 138, 0.02)",
                    borderRadius: "12px",
                    border: "1px solid rgba(30, 58, 138, 0.08)",
                  }}
                >
                  <ChartContainer
                    config={{
                      speaking: { label: "Speaking", color: "#2563EB" },
                      reading: { label: "Reading", color: "#059669" },
                      writing: { label: "Writing", color: "#D97706" },
                      listening: { label: "Listening", color: "#7C3AED" },
                    }}
                    style={{ height: "440px", width: "100%" }}
                  >
                  <LineChart
                    data={graphChartData}
                    margin={{ top: 28, right: 36, left: 56, bottom: 96 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 138, 0.12)" vertical={true} horizontal={true} />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(30, 58, 138, 0.7)"
                      style={{ fontSize: "14px" }}
                      angle={-40}
                      textAnchor="end"
                      height={88}
                      tickMargin={14}
                      tick={{ fill: "rgba(30, 58, 138, 0.85)", fontSize: 14 }}
                    />
                    <YAxis
                      stroke="rgba(30, 58, 138, 0.7)"
                      style={{ fontSize: "14px" }}
                      domain={[0, 100]}
                      width={48}
                      tickMargin={10}
                      tick={{ fill: "rgba(30, 58, 138, 0.85)", fontSize: 14 }}
                      label={{
                        value: "Score",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: "14px", fill: "rgba(30, 58, 138, 0.85)" },
                        offset: -10,
                      }}
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div
                            style={{
                              padding: "12px 16px",
                              backgroundColor: "#1E3A8A",
                              color: "#FFFFFF",
                              borderRadius: "8px",
                              border: "1px solid rgba(255,255,255,0.2)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              minWidth: "140px",
                              fontSize: "13px",
                            }}
                          >
                            <div style={{ fontWeight: 600, marginBottom: "8px", color: "#E0E7FF" }}>
                              {label}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {payload.map((entry: any) => (
                                <div key={entry.dataKey} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: entry.color, flexShrink: 0 }} />
                                    <span style={{ color: "rgba(255,255,255,0.9)" }}>{entry.name}</span>
                                  </span>
                                  <span style={{ fontWeight: 600, color: "#FFFFFF" }}>{entry.value != null ? Number(entry.value) : "—"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "20px" }}
                      iconType="circle"
                      iconSize={10}
                      formatter={(value) => <span style={{ color: "rgba(30, 58, 138, 0.9)", fontSize: "14px" }}>{value}</span>}
                    />
                    <Line type="monotone" dataKey="speaking" name="Speaking" stroke="#2563EB" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: "#2563EB" }} activeDot={{ r: 7, strokeWidth: 2, fill: "#2563EB", stroke: "#fff" }} connectNulls />
                    <Line type="monotone" dataKey="reading" name="Reading" stroke="#059669" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: "#059669" }} activeDot={{ r: 7, strokeWidth: 2, fill: "#059669", stroke: "#fff" }} connectNulls />
                    <Line type="monotone" dataKey="writing" name="Writing" stroke="#D97706" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: "#D97706" }} activeDot={{ r: 7, strokeWidth: 2, fill: "#D97706", stroke: "#fff" }} connectNulls />
                    <Line type="monotone" dataKey="listening" name="Listening" stroke="#7C3AED" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: "#7C3AED" }} activeDot={{ r: 7, strokeWidth: 2, fill: "#7C3AED", stroke: "#fff" }} connectNulls />
                  </LineChart>
                </ChartContainer>
                </div>
              )}
              {!graphLoading && !graphError && graphChartData.length === 0 && (
                <div style={{ padding: "24px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)", fontSize: "14px" }}>
                  No score data yet for this user.
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoadingSkillData && (
            <div
              style={{
                marginBottom: "32px",
                padding: "24px",
                textAlign: "center",
                color: "#1E3A8A",
              }}
            >
              Loading {skillLabels[skill]} data...
            </div>
          )}
          
          {/* Error State */}
          {skillDataError && (
            <div
              style={{
                marginBottom: "32px",
                padding: "24px",
                backgroundColor: isNotAttempted ? "#EFF6FF" : "#FEE2E2",
                borderRadius: "8px",
                color: isNotAttempted ? "#1E40AF" : "#DC2626",
                border: `1px solid ${isNotAttempted ? "#93C5FD" : "#FECACA"}`,
              }}
            >
              {isNotAttempted ? skillDataError : `Error: ${skillDataError}`}
            </div>
          )}
          
          {/* Reading Data Table - Show all Reading fields in table format */}
          {skill === "reading" && !isLoadingSkillData && detailedResult && Object.keys(detailedResult).length > 0 && (
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
                      
                      // User Name - USE rawStudentData (correct student) instead of API data
                      if (rawStudentData.studentName || rawStudentData.name || rawStudentData.user_name || detailedResult.first_name || detailedResult.last_name) {
                        fieldsToShow.push({
                          key: "user_name",
                          label: "User Name",
                          getValue: (data) => {
                            // CRITICAL: Use rawStudentData first (correct student from navigation)
                            const studentName = rawStudentData.studentName || rawStudentData.name || rawStudentData.user_name
                            if (studentName) {
                              return studentName
                            }
                            // Fallback to API data only if rawStudentData doesn't have it
                            const firstName = data.first_name || ""
                            const lastName = data.last_name || ""
                            return `${firstName} ${lastName}`.trim() || "-"
                          }
                        })
                      }
                      
                      // Organization (skip ID, just show name if available, otherwise skip)
                      // We'll skip organization_id as we don't have org names in the detailed result
                      
                      // Email - USE rawStudentData (correct student) instead of API data
                      if (rawStudentData.email || detailedResult.email) {
                        fieldsToShow.push({
                          key: "email",
                          label: "Email",
                          getValue: (data) => {
                            // CRITICAL: Use rawStudentData first (correct student from navigation)
                            return rawStudentData.email || data.email || "-"
                          }
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

          {/* Speaking Data Table - Show all Speaking fields in table format */}
          {skill === "speaking" && !isLoadingSkillData && detailedResult && Object.keys(detailedResult).length > 0 && (
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
                Speaking Detailed Analysis
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
                  const fieldsToShow: Array<{key: string, label: string, getValue: (data: any) => any}> = []
                  
                  // User Name - USE rawStudentData (correct student) instead of API data
                  if (rawStudentData.studentName || rawStudentData.name || rawStudentData.user_name || detailedResult.first_name || detailedResult.last_name) {
                    fieldsToShow.push({
                      key: "user_name",
                      label: "User Name",
                      getValue: (data) => {
                        // CRITICAL: Use rawStudentData first (correct student from navigation)
                        const studentName = rawStudentData.studentName || rawStudentData.name || rawStudentData.user_name
                        if (studentName) {
                          return studentName
                        }
                        // Fallback to API data only if rawStudentData doesn't have it
                        const firstName = data.first_name || ""
                        const lastName = data.last_name || ""
                        return `${firstName} ${lastName}`.trim() || "-"
                      }
                    })
                  }
                  
                  // Email - USE rawStudentData (correct student) instead of API data
                  if (rawStudentData.email || detailedResult.email) {
                    fieldsToShow.push({
                      key: "email",
                      label: "Email",
                      getValue: (data) => {
                        // CRITICAL: Use rawStudentData first (correct student from navigation)
                        return rawStudentData.email || data.email || "-"
                      }
                    })
                  }
                  
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
                  
                  if (detailedResult.ielts_score !== undefined && detailedResult.ielts_score !== null) {
                    fieldsToShow.push({
                      key: "ielts_score",
                      label: "IELTS based score",
                      getValue: (data) => data.ielts_score || "-"
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

          {/* Writing Data Table - Show all Writing fields in table format */}
          {skill === "writing" && !isLoadingSkillData && detailedResult && Object.keys(detailedResult).length > 0 && (
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
                Writing Detailed Analysis
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
                  const fieldsToShow: Array<{key: string, label: string, getValue: (data: any) => any}> = []
                  
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
                  
                  if (detailedResult.email) {
                    fieldsToShow.push({
                      key: "email",
                      label: "Email",
                      getValue: (data) => data.email || "-"
                    })
                  }
                  
                  if (detailedResult.title) {
                    fieldsToShow.push({
                      key: "title",
                      label: "Title",
                      getValue: (data) => data.title || "-"
                    })
                  }
                  
                  if (detailedResult.ielts_score !== undefined && detailedResult.ielts_score !== null) {
                    fieldsToShow.push({
                      key: "ielts_score",
                      label: "IELTS based score",
                      getValue: (data) => data.ielts_score || "-"
                    })
                  }
                  
                  if (detailedResult.created_at) {
                    fieldsToShow.push({
                      key: "created_at",
                      label: "Created At",
                      getValue: (data) => {
                        try {
                          const date = new Date(data.created_at)
                          if (!isNaN(date.getTime())) {
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

          {/* Listening Data Table - Show Listening fields in table format */}
          {skill === "listening" && !isLoadingSkillData && detailedResult && Object.keys(detailedResult).length > 0 && (
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
                  
                  // User Name - USE rawStudentData (correct student) instead of API data
                  if (rawStudentData.studentName || rawStudentData.name || rawStudentData.user_name || detailedResult.first_name || detailedResult.last_name) {
                    fieldsToShow.push({
                      key: "user_name",
                      label: "User Name",
                      getValue: (data) => {
                        // CRITICAL: Use rawStudentData first (correct student from navigation)
                        const studentName = rawStudentData.studentName || rawStudentData.name || rawStudentData.user_name
                        if (studentName) {
                          return studentName
                        }
                        // Fallback to API data only if rawStudentData doesn't have it
                        const firstName = data.first_name || ""
                        const lastName = data.last_name || ""
                        return `${firstName} ${lastName}`.trim() || "-"
                      }
                    })
                  }
                  
                  // Email - USE rawStudentData (correct student) instead of API data
                  if (rawStudentData.email || detailedResult.email) {
                    fieldsToShow.push({
                      key: "email",
                      label: "Email",
                      getValue: (data) => {
                        // CRITICAL: Use rawStudentData first (correct student from navigation)
                        return rawStudentData.email || data.email || "-"
                      }
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
            {(() => {
              // Collect all metrics into an array
              const metrics: Array<{ label: string; value: string | number }> = []
              
              // Overall Score
              if (detailedResult.overall_score !== undefined || studentData.overall_score !== undefined) {
                metrics.push({
                  label: "Overall Score",
                  value: `${detailedResult.overall_score ?? studentData.overall_score ?? 0}%`
                })
              }

              // Fluency Score
              if (detailedResult.fluency_score !== undefined || studentData.fluency_score !== undefined) {
                metrics.push({
                  label: "Fluency Score",
                  value: `${detailedResult.fluency_score ?? studentData.fluency_score ?? 0}%`
                })
              }

              // IELTS based score
              if (detailedResult.ielts_score !== undefined || studentData.ielts_score !== undefined) {
                metrics.push({
                  label: "IELTS based score",
                  value: detailedResult.ielts_score ?? studentData.ielts_score ?? 0
                })
              }

              // Speaking-specific metrics
              if (skill === "speaking") {
                if (studentData.pitch) {
                  metrics.push({
                    label: "Pitch",
                    value: studentData.pitch
                  })
                }
                if (studentData.volume !== undefined) {
                  metrics.push({
                    label: "Volume",
                    value: typeof studentData.volume === "number"
                      ? studentData.volume.toFixed(2)
                      : studentData.volume
                  })
                }
                if (studentData.tone) {
                  metrics.push({
                    label: "Tone",
                    value: studentData.tone
                  })
                }
                if (studentData.hesitationWords !== undefined) {
                  metrics.push({
                    label: "Hesitation Words",
                    value: studentData.hesitationWords
                  })
                }
                if (studentData.pauses !== undefined) {
                  metrics.push({
                    label: "Pauses",
                    value: studentData.pauses
                  })
                }
                if (studentData.fillerWords !== undefined) {
                  metrics.push({
                    label: "Filler Words",
                    value: studentData.fillerWords
                  })
                }
              }

              // Add pronunciation_score and grammar_score if not already added
              if (detailedResult.pronunciation_score !== undefined && !metrics.find(m => m.label.toLowerCase().includes("pronunciation"))) {
                metrics.push({
                  label: "Pronunciation Score",
                  value: `${detailedResult.pronunciation_score ?? 0}%`
                })
              }
              
              if (detailedResult.grammar_score !== undefined && !metrics.find(m => m.label.toLowerCase().includes("grammar"))) {
                metrics.push({
                  label: "Grammar Score",
                  value: `${detailedResult.grammar_score ?? 0}%`
                })
              }
              
              // Add CEFR Level and PTE Score if available
              if (detailedResult.cefr_level) {
                metrics.push({
                  label: "CEFR Level",
                  value: detailedResult.cefr_level
                })
              }
              
              if (detailedResult.pte_score !== undefined) {
                metrics.push({
                  label: "PTE Score",
                  value: `${detailedResult.pte_score}%`
                })
              }
              
              // Display any other metrics from detailedResult
              if (detailedResult) {
                Object.keys(detailedResult).forEach((key) => {
                  // Skip already displayed fields and non-metric fields
                  if (["id", "email", "user_email", "class", "text", "content", "answer", "transcribed_text", "overall_score", "fluency_score", "ielts_score", "pronunciation_score", "grammar_score", "cefr_level", "pte_score", "date", "date_time", "module", "title", "conversation_type", "user", "user_name", "skill", "success", "data", 
                       "module_type", "module_key", "module_title", "organisation_id", "organization_id", "user_id", "created_at", "first_name", "last_name", "user_role", "raw_result_json", "pitch", "volume", "tone", "hesitationWords", "pauses", "fillerWords"].includes(key.toLowerCase())) {
                    return
                  }
                  
                  const value = detailedResult[key]
                  // Only show numeric or string values that look like metrics
                  if (value !== null && value !== undefined && (typeof value !== "object" || Array.isArray(value))) {
                    const formattedValue = typeof value === "number" 
                      ? (key.toLowerCase().includes("score") || key.toLowerCase().includes("percent") ? `${value}%` : value)
                      : String(value)
                    metrics.push({
                      label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
                      value: formattedValue
                    })
                  }
                })
              }

              if (metrics.length === 0) {
                return (
                  <div style={{ padding: "24px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                    No metrics available
                  </div>
                )
              }

              return (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      backgroundColor: "#FFFFFF",
                      borderRadius: "8px",
                      border: "1px solid rgba(30, 58, 138, 0.1)",
                      overflow: "hidden",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#F3F4F6",
                          borderBottom: "2px solid rgba(30, 58, 138, 0.1)",
                        }}
                      >
                        {metrics.map((metric, index) => (
                          <th
                            key={index}
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#1E3A8A",
                              borderRight: index < metrics.length - 1 ? "1px solid rgba(30, 58, 138, 0.1)" : "none",
                            }}
                          >
                            {metric.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: "#FFFFFF" }}>
                        {metrics.map((metric, index) => (
                          <td
                            key={index}
                            style={{
                              padding: "12px 16px",
                              fontSize: "16px",
                              color: "#1E3A8A",
                              fontWeight: "600",
                              textAlign: "center",
                              borderRight: index < metrics.length - 1 ? "1px solid rgba(30, 58, 138, 0.1)" : "none",
                            }}
                          >
                            {String(metric.value)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

