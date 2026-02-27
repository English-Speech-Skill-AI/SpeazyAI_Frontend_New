"use client"

import React, { useState, useEffect } from "react"
import type { CSSProperties } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "./ui/button"
import { PageHeader } from "./PageHeader"
import { useAuth } from "../contexts/AuthContext"
import {
  TrendingUp,
  Award,
  BarChart3,
  RefreshCw,
  Eye,
  Mic2,
  BookOpen,
  PenTool,
  Headphones,
  GraduationCap,
  Clock,
  Star,
  Briefcase,
  Users,
  Settings,
  Shield,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
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

interface SkillResult {
  id: number | string
  date?: string
  date_time?: string
  created_at?: string  // Writing API uses created_at instead of date_time
  module?: string
  title?: string
  overall_score?: number
  fluency_score?: number
  pronunciation?: number
  pronunciation_score?: number
  grammar_score?: number
  grammar?: number
  ielts_score?: number | string  // Can be number or string like "8.00"
  conversation_type?: string
  user?: string
  user_name?: string
  email?: string
  [key: string]: any // Allow additional fields
}

// Helper function to render Progress Over Time graph
const renderProgressGraph = () => {
  // Sample progress data for the graph (in a real app, this would come from API)
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
    <div style={{ marginBottom: "32px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E3A8A", marginBottom: "16px" }}>
        Progress Over Time
      </h3>
      <ChartContainer config={chartConfig} style={{ height: "300px" }}>
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
  )
}

// Helper function to render Reading detailed view
const renderReadingDetailedView = (data: any, getOrganizationName: (id: any) => string, skill: string = "reading") => {
  const detailedResult = data.detailedResult?.item || data.detailedResult?.data || data.detailedResult || {}
  
  // Get table columns for this skill
  const getTableColumns = () => {
    switch (skill) {
      case "reading":
        return [
          { key: "date_time", label: "Date & Time" },
          { key: "module", label: "Module" },
          { key: "title", label: "Title" },
          { key: "overall_score", label: "Overall Score" },
          { key: "pronunciation", label: "Pronunciation" },
          { key: "fluency_score", label: "Fluency Score" },
          { key: "grammar_score", label: "Grammar Score" },
        ]
      default:
        return []
    }
  }
  
  const tableColumns = getTableColumns()
  const rowData = data // The original row data
  
  // Helper to get display value for a column
  const getDisplayValue = (row: any, col: any) => {
    let displayValue: any = undefined
    
    if (col.key === "module") {
      displayValue = row.module_type || row.module || row.module_key || undefined
    } else if (col.key === "title") {
      displayValue = row.module_title || row.title || undefined
    } else if (col.key === "pronunciation") {
      displayValue = row.pronunciation || row.pronunciation_score || row.pronunciationScore || undefined
      if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
        displayValue = parseFloat(displayValue)
      }
    } else if (col.key === "grammar_score") {
      displayValue = row.grammar_score || row.grammarScore || row.grammar || undefined
      if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
        displayValue = parseFloat(displayValue)
      }
    } else if (col.key === "overall_score") {
      displayValue = row.overall_score || row.overallScore || undefined
      if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
        displayValue = parseFloat(displayValue)
      }
    } else if (col.key === "fluency_score") {
      displayValue = row.fluency_score || row.fluencyScore || undefined
      if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
        displayValue = parseFloat(displayValue)
      }
    } else {
      displayValue = row[col.key] || row[col.key.toLowerCase()] || undefined
    }
    
    if (col.key === "date_time" && displayValue === undefined) {
      displayValue = row.created_at || row.date || row.timestamp || row.time || undefined
    }
    
    if (displayValue === undefined || displayValue === null || displayValue === "") {
      displayValue = "-"
    }
    
    if (col.key === "date_time" || col.key === "date") {
      try {
        if (displayValue && displayValue !== "-") {
          const date = new Date(displayValue)
          if (!isNaN(date.getTime())) {
            displayValue = date.toLocaleString()
          }
        }
      } catch (e) {
        // Keep original value if parsing fails
      }
    }
    
    if ((col.key.includes("score") || col.key === "pronunciation" || col.key === "grammar_score") && typeof displayValue === "number") {
      displayValue = `${displayValue}%`
    }
    
    return displayValue
  }
  
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
  
  if (detailedResult.cefr_level) {
    fieldsToShow.push({
      key: "cefr_level",
      label: "CEFR Level",
      getValue: (data) => data.cefr_level || "-"
    })
  }
  
  if (detailedResult.pte_score !== undefined && detailedResult.pte_score !== null) {
    fieldsToShow.push({
      key: "pte_score",
      label: "PTE Score",
      getValue: (data) => data.pte_score || "-"
    })
  }
  
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
  
  if (detailedResult.words_read !== undefined && detailedResult.words_read !== null) {
    fieldsToShow.push({
      key: "words_read",
      label: "Words Read",
      getValue: (data) => data.words_read || "-"
    })
  }
  
  if (detailedResult.words_per_minute !== undefined && detailedResult.words_per_minute !== null) {
    fieldsToShow.push({
      key: "words_per_minute",
      label: "Words Per Minute",
      getValue: (data) => data.words_per_minute || "-"
    })
  }
  
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
    <div>
      {renderProgressGraph()}
      
      {/* Original Table Row */}
      <div style={{ marginBottom: "32px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E3A8A", marginBottom: "16px" }}>
          Result Summary
        </h3>
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid rgba(30, 58, 138, 0.1)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "2px solid rgba(30, 58, 138, 0.1)" }}>
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1E3A8A",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid rgba(30, 58, 138, 0.1)" }}>
                {tableColumns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "12px",
                      fontSize: "14px",
                      color: "#1E3A8A",
                    }}
                  >
                    {getDisplayValue(rowData, col)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E3A8A", marginBottom: "16px" }}>
        Reading Detailed Analysis
      </h3>
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
    </div>
  )
}

// Helper function to render Listening detailed view
const renderListeningDetailedView = (data: any, getOrganizationName: (id: any) => string, skill: string = "listening") => {
  const detailedResult = data.detailedResult?.item || data.detailedResult?.data || data.detailedResult || {}
  
  // Get table columns for this skill
  const getTableColumns = () => {
    switch (skill) {
      case "listening":
        return [
          { key: "date_time", label: "Date & Time" },
          { key: "conversation_type", label: "Conversation Type" },
          { key: "title", label: "Title" },
          { key: "ielts_score", label: "IELTS based score" },
        ]
      default:
        return []
    }
  }
  
  const tableColumns = getTableColumns()
  const rowData = data // The original row data
  
  // Helper to get display value for a column
  const getDisplayValue = (row: any, col: any) => {
    let displayValue: any = undefined
    
    displayValue = row[col.key] || row[col.key.toLowerCase()] || undefined
    
    if (col.key === "date_time" && displayValue === undefined) {
      displayValue = row.created_at || row.date || row.timestamp || row.time || undefined
    }
    
    if (displayValue === undefined || displayValue === null || displayValue === "") {
      displayValue = "-"
    }
    
    if (col.key === "date_time" || col.key === "date") {
      try {
        if (displayValue && displayValue !== "-") {
          const date = new Date(displayValue)
          if (!isNaN(date.getTime())) {
            displayValue = date.toLocaleString()
          }
        }
      } catch (e) {
        // Keep original value if parsing fails
      }
    }
    
    return displayValue
  }
  
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
  
  if (detailedResult.organisation_id !== undefined && detailedResult.organisation_id !== null) {
    fieldsToShow.push({
      key: "organisation",
      label: "Organisation",
      getValue: (data) => {
        const orgId = data.organisation_id
        return orgId ? getOrganizationName(orgId) : "-"
      }
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
    <div>
      {renderProgressGraph()}
      
      {/* Original Table Row */}
      <div style={{ marginBottom: "32px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E3A8A", marginBottom: "16px" }}>
          Result Summary
        </h3>
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid rgba(30, 58, 138, 0.1)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "2px solid rgba(30, 58, 138, 0.1)" }}>
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1E3A8A",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid rgba(30, 58, 138, 0.1)" }}>
                {tableColumns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "12px",
                      fontSize: "14px",
                      color: "#1E3A8A",
                    }}
                  >
                    {getDisplayValue(rowData, col)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E3A8A", marginBottom: "16px" }}>
        Listening Detailed Analysis
      </h3>
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
    </div>
  )
}

// Helper function to render Speaking detailed view (similar to Reading)
const renderSpeakingDetailedView = (data: any, getOrganizationName: (id: any) => string, skill: string = "speaking") => {
  const detailedResult = data.detailedResult?.item || data.detailedResult?.data || data.detailedResult || {}
  
  // Get table columns for this skill
  const getTableColumns = () => {
    switch (skill) {
      case "speaking":
        return [
          { key: "user_name", label: "User Name" },
          { key: "organisation", label: "Organisation" },
          { key: "module_title", label: "Module Title" },
          { key: "email", label: "Email" },
          { key: "user_role", label: "User Role" },
          { key: "user_class", label: "User Class" },
          { key: "overall_score", label: "Overall Score" },
          { key: "pronunciation_score", label: "Pronunciation Score" },
          { key: "fluency_score", label: "Fluency Score" },
          { key: "grammar_score", label: "Grammar Score" },
          { key: "ielts_score", label: "IELTS based score" },
        ]
      default:
        return []
    }
  }
  
  const tableColumns = getTableColumns()
  const rowData = data // The original row data
  
  // Helper to get display value for a column
  const getDisplayValue = (row: any, col: any) => {
    let displayValue: any = undefined
    
    if (col.key === "user_name") {
      const firstName = row.first_name || ""
      const lastName = row.last_name || ""
      displayValue = `${firstName} ${lastName}`.trim() || "-"
    } else if (col.key === "organisation") {
      const orgId = row.organisation_id || row.organization_id
      displayValue = orgId ? getOrganizationName(orgId) : "-"
    } else if (col.key === "module_title") {
      displayValue = row.module_title || row.title || "-"
    } else if (col.key === "email") {
      displayValue = row.email || "-"
    } else if (col.key === "user_role") {
      const role = row.user_role || row.role || ""
      displayValue = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : "-"
    } else if (col.key === "user_class") {
      let userClass = row.user_class
      if (typeof userClass === "string" && userClass.startsWith("[")) {
        try {
          const parsed = JSON.parse(userClass)
          if (Array.isArray(parsed)) {
            displayValue = parsed.join(", ") || "-"
          } else {
            displayValue = userClass
          }
        } catch (e) {
          displayValue = userClass || "-"
        }
      } else if (Array.isArray(userClass)) {
        displayValue = userClass.join(", ") || "-"
      } else {
        displayValue = userClass || "-"
      }
    } else if (col.key === "pronunciation_score") {
      displayValue = row.pronunciation_score || undefined
      if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
        displayValue = parseFloat(displayValue)
      }
    } else if (col.key === "grammar_score") {
      displayValue = row.grammar_score || undefined
      if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
        displayValue = parseFloat(displayValue)
      }
    } else if (col.key === "overall_score") {
      displayValue = row.overall_score || undefined
      if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
        displayValue = parseFloat(displayValue)
      }
    } else if (col.key === "fluency_score") {
      displayValue = row.fluency_score || undefined
      if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
        displayValue = parseFloat(displayValue)
      }
    } else {
      displayValue = row[col.key] || undefined
    }
    
    if (displayValue === undefined || displayValue === null || displayValue === "") {
      displayValue = "-"
    }
    
    if ((col.key.includes("score") && col.key !== "ielts_score") && typeof displayValue === "number") {
      displayValue = `${displayValue}%`
    }
    
    return displayValue
  }
  
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
  
  if (detailedResult.cefr_level) {
    fieldsToShow.push({
      key: "cefr_level",
      label: "CEFR Level",
      getValue: (data) => data.cefr_level || "-"
    })
  }
  
  if (detailedResult.pte_score !== undefined && detailedResult.pte_score !== null) {
    fieldsToShow.push({
      key: "pte_score",
      label: "PTE Score",
      getValue: (data) => data.pte_score || "-"
    })
  }
  
  if (detailedResult.module_title) {
    fieldsToShow.push({
      key: "module_title",
      label: "Module Title",
      getValue: (data) => data.module_title || "-"
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
    <div>
      {renderProgressGraph()}
      
      {/* Original Table Row */}
      <div style={{ marginBottom: "32px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E3A8A", marginBottom: "16px" }}>
          Result Summary
        </h3>
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid rgba(30, 58, 138, 0.1)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "2px solid rgba(30, 58, 138, 0.1)" }}>
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1E3A8A",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid rgba(30, 58, 138, 0.1)" }}>
                {tableColumns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "12px",
                      fontSize: "14px",
                      color: "#1E3A8A",
                    }}
                  >
                    {getDisplayValue(rowData, col)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E3A8A", marginBottom: "16px" }}>
        Speaking Detailed Analysis
      </h3>
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
    </div>
  )
}

export function EduDashboard() {
  const navigate = useNavigate()
  const [selectedOrganization, setSelectedOrganization] = useState("")
  const [activeFilter, setActiveFilter] = useState("My Analysis")
  const [showClasses, setShowClasses] = useState(false)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [activeSkill, setActiveSkill] = useState<"speaking" | "reading" | "writing" | "listening" | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { authData, logout, token } = useAuth()
  
  // State for skill-based results
  const [skillResults, setSkillResults] = useState<SkillResult[]>([])
  const [isLoadingResults, setIsLoadingResults] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [expandedResultId, setExpandedResultId] = useState<string | number | null>(null)
  const [expandedDetailedResult, setExpandedDetailedResult] = useState<any>(null)
  const [isLoadingDetailedResult, setIsLoadingDetailedResult] = useState(false)

  // State for users and classes from API
  interface ApiUser {
    id?: number | string
    user_id?: number | string
    name?: string
    email?: string
    class?: number | string
    class_name?: string
    teacher?: string
    teacher_name?: string
    role?: string
    [key: string]: any
  }

  const [usersList, setUsersList] = useState<ApiUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [classesData, setClassesData] = useState<Record<string, { students: ApiUser[], teacher: string }>>({})

  // State for organizations from API
  interface Organisation {
    id?: number | string
    organisation_id?: number | string
    organisation?: string  // Primary field name for organization name
    name?: string
    organisation_name?: string
    organization_name?: string
    [key: string]: any
  }

  const [organizationsList, setOrganizationsList] = useState<Organisation[]>([])
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false)
  const [organizationsError, setOrganizationsError] = useState<string | null>(null)

  // Progress over time data
  const progressOverTimeData = [
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

   // Get table data - shows students with scores if class is selected, otherwise shows skill results
   const getTableData = () => {
     // If a class is selected, show students from API
     if (selectedClass) {
       const classData = classesData[selectedClass]
       if (classData && classData.students.length > 0) {
         return classData.students.map((student) => ({
           type: "student",
           name: (student.first_name && student.last_name) 
             ? `${student.first_name} ${student.last_name}`.trim()
             : student.first_name || student.name || student.email || "Unknown",
           email: student.email || "",
           id: student.id || student.user_id,
           class: selectedClass,
           // Scores will be fetched separately or from student data if available
           speaking: student.speaking_score || student.speaking || 0,
           reading: student.reading_score || student.reading || 0,
           writing: student.writing_score || student.writing || 0,
           listening: student.listening_score || student.listening || 0,
         }))
       }
       // Fallback to empty if no class data
       return []
     }
     // If a skill is selected, return the skill results from API
     if (activeSkill && skillResults.length > 0) {
       return skillResults.map((result) => ({
         type: "skill-result",
         skill: activeSkill,
         ...result,
       }))
     }
     // Default: show empty
     return []
   }

  // Get teacher name for a class
  const getTeacherForClass = (className: string): string => {
    const classData = classesData[className]
    if (classData && classData.teacher) {
      return classData.teacher
    }
    // Fallback to "Unknown Teacher" if class data doesn't exist or teacher is missing
    console.warn(`No teacher found for class "${className}". Class data:`, classData)
    return "Unknown Teacher"
  }

  // Get available classes from API data (now returns class names as strings)
  const getAvailableClasses = (): string[] => {
    return Object.keys(classesData)
      .filter(key => key && key.trim() !== "")
      .sort((a, b) => {
        // Sort classes: first by numeric part, then by letter part (e.g., "9-A" before "10-A")
        const matchA = a.match(/^(\d+)-?([A-Za-z]+)?/)
        const matchB = b.match(/^(\d+)-?([A-Za-z]+)?/)
        
        if (matchA && matchB) {
          const numA = parseInt(matchA[1])
          const numB = parseInt(matchB[1])
          if (numA !== numB) {
            return numA - numB
          }
          // If numbers are same, sort by letter
          const letterA = matchA[2] || ""
          const letterB = matchB[2] || ""
          return letterA.localeCompare(letterB)
        }
        return a.localeCompare(b)
      })
  }

  // Get organization name from ID
  const getOrganizationName = (orgId: string | null | undefined): string => {
    if (!orgId || orgId === "" || orgId === "null" || orgId === "undefined") return "Not selected"
    
    // If organizations haven't loaded yet, return the ID temporarily
    if (organizationsList.length === 0) {
      return orgId
    }
    
    // Convert to string for comparison
    const searchId = String(orgId).trim()
    
    const org = organizationsList.find((o) => {
      // Try multiple ID fields and compare as strings
      const oId1 = o.id ? String(o.id).trim() : null
      const oId2 = o.organisation_id ? String(o.organisation_id).trim() : null
      const oId3 = o.organization_id ? String(o.organization_id).trim() : null
      
      return oId1 === searchId || oId2 === searchId || oId3 === searchId
    })
    
    if (org) {
      // Check organisation field first (primary field name from API)
      const orgName = org.organisation || org.name || org.organisation_name || org.organization_name
      if (orgName && orgName.trim() !== "") {
        return orgName
      }
    }
    
    // If not found, log warning and return the ID
    console.warn(`Organization name not found for ID: "${searchId}". Available org IDs:`, organizationsList.map(o => ({
      id: o.id,
      organisation_id: o.organisation_id,
      organisation: o.organisation,
      name: o.name,
      organisation_name: o.organisation_name,
      organization_name: o.organization_name
    })))
    return orgId
  }

  // Get table columns based on selected skill
  const getTableColumns = () => {
    if (!activeSkill) return []
    
    switch (activeSkill) {
      case "reading":
        return [
          { key: "date_time", label: "Date & Time" },
          { key: "module", label: "Module" },
          { key: "title", label: "Title" },
          { key: "overall_score", label: "Overall Score" },
          { key: "pronunciation", label: "Pronunciation" },
          { key: "fluency_score", label: "Fluency Score" },
          { key: "grammar_score", label: "Grammar Score" },
        ]
      case "speaking":
        return [
          { key: "user_name", label: "User Name" },
          { key: "organisation", label: "Organisation" },
          { key: "module_title", label: "Module Title" },
          { key: "email", label: "Email" },
          { key: "user_role", label: "User Role" },
          { key: "user_class", label: "User Class" },
          { key: "overall_score", label: "Overall Score" },
          { key: "pronunciation_score", label: "Pronunciation Score" },
          { key: "fluency_score", label: "Fluency Score" },
          { key: "grammar_score", label: "Grammar Score" },
          { key: "ielts_score", label: "IELTS based score" },
        ]
      case "writing":
        return [
          { key: "date_time", label: "Date & Time" },
          { key: "title", label: "Title" },
          { key: "ielts_score", label: "IELTS based score" },
        ]
      case "listening":
        return [
          { key: "date_time", label: "Date & Time" },
          { key: "conversation_type", label: "Conversation Type" },
          { key: "title", label: "Title" },
          { key: "ielts_score", label: "IELTS based score" },
        ]
      default:
        return []
    }
  }

  const chartConfig = {
    score: {
      label: "Score (%)",
      color: "#3B82F6",
    },
  }

  // API function to fetch organizations list
  const fetchOrganizationsList = async () => {
    const API_URL = "https://api.exeleratetechnology.com/api/org/list.php"
    
    try {
      setIsLoadingOrganizations(true)
      setOrganizationsError(null)

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Organizations List API Error (${response.status}):`, errorText)
        throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`)
      }

      const data = await response.json()
      console.log("Organizations List API Response (Full):", JSON.stringify(data, null, 2))

      // Parse response - handle different formats
      let organizations: Organisation[] = []
      if (data.success === true && Array.isArray(data.data)) {
        organizations = data.data
      } else if (Array.isArray(data.data)) {
        organizations = data.data
      } else if (Array.isArray(data)) {
        organizations = data
      } else if (data.success === true && Array.isArray(data.organizations)) {
        organizations = data.organizations
      } else if (Array.isArray(data.organizations)) {
        organizations = data.organizations
      } else if (data.success === true && Array.isArray(data.orgs)) {
        organizations = data.orgs
      } else if (Array.isArray(data.orgs)) {
        organizations = data.orgs
      }

      setOrganizationsList(organizations)
      console.log("Parsed organizations count:", organizations.length)
      console.log("Sample organization structure:", organizations[0] || "No organizations found")
      
      // Log all organization IDs and names for debugging
      organizations.forEach((org, index) => {
        console.log(`Organization ${index + 1}:`, {
          id: org.id,
          organisation_id: org.organisation_id,
          organisation: org.organisation,  // Primary field name from API
          name: org.name,
          organisation_name: org.organisation_name,
          organization_name: org.organization_name
        })
      })

      return organizations
    } catch (error: any) {
      console.error("Error fetching organizations list:", error)
      setOrganizationsError(error.message || "Failed to load organizations list")
      setOrganizationsList([])
      throw error
    } finally {
      setIsLoadingOrganizations(false)
    }
  }

  const skillButtons = [
    { id: "speaking" as const, label: "Speaking", icon: Mic2, color: "#3B82F6" },
    { id: "reading" as const, label: "Reading", icon: BookOpen, color: "#246BCF" },
    { id: "writing" as const, label: "Writing", icon: PenTool, color: "#00B9FC" },
    { id: "listening" as const, label: "Listening", icon: Headphones, color: "#1E3A8A" },
  ]

  const BLUE_BG: CSSProperties = {
    backgroundColor: "#1E3A8A",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  }

  const handleStudentClick = (studentName: string) => {
    setSelectedStudent(studentName)
  }

  const menuItems = [
    { id: "english-skill-ai", label: "English Skill AI", icon: Mic2, route: "/skills-home" },
    { id: "dashboard", label: "Dashboard", icon: Briefcase, route: "/edu/home", active: true },
    { id: "class-management", label: "Class Management", icon: Users, route: "/class-management" },
    { id: "license-management", label: "License Management", icon: Shield, route: "/license-management" },
  ]

  const getInitials = (name: string) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  // API Token - Use token from authentication context (from login API)
  // IMPORTANT: No hardcoded token fallback - user must be logged in to use this page
  const API_TOKEN = token || ""
  
  // Note: This component should be protected by ProtectedRoute, so token should always exist
  // If token is missing, API calls will fail (which is correct behavior)

  // API function to fetch users list
  const fetchUsersList = async (orgId?: string | null) => {
    const API_URL = "https://api.exeleratetechnology.com/api/users/list.php"
    
    try {
      setIsLoadingUsers(true)
      setUsersError(null)

      // Try GET first (most REST APIs use GET for list endpoints)
      let response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      // If GET returns 405, try POST as fallback
      if (!response.ok && response.status === 405) {
        console.log("GET returned 405, trying POST method as fallback...")
        try {
          response = await fetch(API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
            },
            body: JSON.stringify({}),
          })
        } catch (postError) {
          console.error("POST also failed:", postError)
          throw new Error(`Both GET and POST methods failed for Users List API. GET returned 405.`)
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Users List API Error (${response.status}):`, errorText)
        
        // If still 405 after trying both methods, provide helpful error
        if (response.status === 405) {
          throw new Error(
            `Method Not Allowed (405): The Users List API endpoint doesn't accept GET or POST methods. ` +
            `Please verify the correct HTTP method with the backend team. URL: ${API_URL}`
          )
        }
        
        throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`)
      }

      const data = await response.json()
      console.log("Users List API Response (successful):", data)

      // Parse response - handle different formats
      let users: ApiUser[] = []
      if (data.success === true && Array.isArray(data.data)) {
        users = data.data
      } else if (Array.isArray(data.data)) {
        users = data.data
      } else if (Array.isArray(data)) {
        users = data
      } else if (data.success === true && Array.isArray(data.users)) {
        users = data.users
      } else if (Array.isArray(data.users)) {
        users = data.users
      }

      console.log(`Parsed ${users.length} total users from API`)

       // Filter users by selected organization if an organization is selected
       const filterOrgId = orgId || selectedOrganization
       let filteredUsers = users
       if (filterOrgId) {
         filteredUsers = users.filter((user: ApiUser) => {
           const userOrgId = user.organisation_id || user.organization_id || user.org_id
           // Compare as strings or numbers
           const matches = String(userOrgId) === String(filterOrgId)
           return matches
         })
         console.log(`Filtered ${filteredUsers.length} users for organization ${filterOrgId} out of ${users.length} total users`)
         
         // Log sample users for debugging
         if (filteredUsers.length > 0) {
           console.log("Sample filtered user:", {
             id: filteredUsers[0].id,
             name: filteredUsers[0].first_name,
             role: filteredUsers[0].role,
             class: filteredUsers[0].class,
             organisation_id: filteredUsers[0].organisation_id
           })
         } else {
           console.warn(`No users found for organization ${filterOrgId}. Available users have org IDs:`, 
             users.map(u => u.organisation_id || u.organization_id || u.org_id).filter(Boolean).slice(0, 5)
           )
         }
       }

       setUsersList(filteredUsers)

       // First pass: Map teachers to their classes
       const teacherByClass: Record<string, string> = {} // class name -> teacher name
       
       filteredUsers.forEach((user: ApiUser) => {
         const userRole = (user.role || "").toLowerCase()
         
         // Check if this user is a teacher
         if (userRole === "teacher" || userRole.includes("teacher")) {
           // Get teacher's full name
           const teacherName = user.first_name && user.last_name 
             ? `${user.first_name} ${user.last_name}`.trim()
             : user.first_name || user.email?.split("@")[0] || "Teacher"
           
           // Get classes assigned to this teacher (class is an array)
           const userClasses = user.class || []
           const classArray = Array.isArray(userClasses) ? userClasses : [userClasses].filter(Boolean)
           
           // Map teacher to each of their classes
           classArray.forEach((className: any) => {
             if (className) {
               const classKey = String(className).trim()
               if (classKey && !teacherByClass[classKey]) {
                 teacherByClass[classKey] = teacherName
                 console.log(`Assigned teacher "${teacherName}" to class "${classKey}"`)
               }
             }
           })
         }
       })

       console.log("Teachers mapped to classes:", teacherByClass)

       // Initialize all classes that have teachers assigned (even if no students yet)
       const groupedByClass: Record<string, { students: ApiUser[], teacher: string }> = {}
       
       // First, create entries ONLY for classes that have teachers assigned (valid classes from API)
       Object.keys(teacherByClass).forEach((classKey) => {
         if (classKey && classKey.trim()) {
           groupedByClass[classKey] = {
             students: [],
             teacher: teacherByClass[classKey]
           }
         }
       })

       // Second pass: Group students by class, but ONLY add students to classes that have teachers (valid classes)
       filteredUsers.forEach((user: ApiUser) => {
         const userRole = (user.role || "").toLowerCase()
         
         // Skip teachers, principals, administrators from student list
         if (userRole === "teacher" || userRole === "principal" || userRole === "administrator" || userRole.includes("admin")) {
           return
         }

         // Get student's classes (class is an array)
         const userClasses = user.class || []
         const classArray = Array.isArray(userClasses) ? userClasses : [userClasses].filter(Boolean)
         
         if (classArray.length === 0) {
           return // Skip users with no class assignment
         }

         // Add student to each of their classes, but ONLY if that class has a teacher assigned (is valid)
         classArray.forEach((className: any) => {
           if (!className) return
           
           const classKey = String(className).trim()
           if (!classKey) return

           // Only add students to classes that exist in teacherByClass (have teachers assigned)
           // Skip classes that don't have teachers - they're invalid/not in API
           if (groupedByClass[classKey]) {
             // Add student to the valid class
             groupedByClass[classKey].students.push(user)
           } else {
             // Log warning for students in invalid classes (classes without teachers)
             console.warn(`Student ${user.first_name || user.email || user.id} has invalid class "${classKey}" - no teacher assigned. Skipping.`)
           }
         })
       })

       // Verify the structure before setting state
       Object.keys(groupedByClass).forEach(key => {
         const classData = groupedByClass[key]
         if (!classData || typeof classData !== 'object') {
           console.error(`Invalid class data for "${key}":`, classData)
           return
         }
         if (!classData.hasOwnProperty('teacher')) {
           console.error(`Missing teacher property for class "${key}":`, classData)
           groupedByClass[key].teacher = "Unknown Teacher"
         }
         if (!Array.isArray(classData.students)) {
           console.error(`Missing students array for class "${key}":`, classData)
           groupedByClass[key].students = []
         }
       })
       
       setClassesData(groupedByClass)
       console.log("Grouped classes data (full structure):", JSON.parse(JSON.stringify(groupedByClass)))
       console.log("Detailed grouped classes:", Object.keys(groupedByClass).map(key => ({
         class: key,
         teacher: groupedByClass[key]?.teacher || "MISSING",
         studentCount: groupedByClass[key]?.students?.length || 0,
         studentIds: groupedByClass[key]?.students?.map(s => s.id || s.user_id) || []
       })))
       
       if (Object.keys(groupedByClass).length === 0) {
         console.warn("No classes found. This could be because:")
         console.warn(`  - No users have class assignments (filtered users: ${filteredUsers.length})`)
         console.warn(`  - All users are teachers/admins (students count: ${filteredUsers.filter(u => {
           const role = (u.role || "").toLowerCase()
           return !role.includes("teacher") && !role.includes("principal") && !role.includes("administrator") && !role.includes("admin")
         }).length})`)
         console.warn(`  - Users have null/empty class fields`)
       }

      return { users, classesData: groupedByClass }
    } catch (error: any) {
      console.error("Error fetching users list:", error)
      setUsersError(error.message || "Failed to load users list")
      setUsersList([])
      setClassesData({})
      throw error
    } finally {
      setIsLoadingUsers(false)
    }
  }

  // API function to fetch Reading results
  const fetchReadingResults = async () => {
    const API_URL = "https://api.exeleratetechnology.com/api/reading/list-results.php"
    
    try {
      // Based on 405 error, the endpoint might not accept POST with empty body
      // Try GET first (most list endpoints use GET)
      console.log("Attempting Reading API with GET method...")
      let response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      // If GET returns 405, the endpoint might require POST but with specific format
      // Or the endpoint URL might be different
      if (response.status === 405) {
        console.warn("GET method returned 405. This endpoint may require a different method or URL.")
        console.warn("Please verify with the backend team:")
        console.warn("1. Correct endpoint URL")
        console.warn("2. Required HTTP method (GET/POST/PUT)")
        console.warn("3. Required query parameters or body parameters")
        
        // Still try POST as fallback, but it will likely also fail
        response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({}),
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Reading API Error (${response.status}):`, errorText)
        
        // Provide helpful error message
        if (response.status === 405) {
          throw new Error(
            `Method Not Allowed (405): The Reading API endpoint doesn't accept the current HTTP method. ` +
            `Please verify the correct method (GET/POST) and endpoint URL with the backend team. ` +
            `Current URL: ${API_URL}`
          )
        }
        
        throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`)
      }

      const data = await response.json()
      console.log("Reading API Response:", data)
      return data
    } catch (error: any) {
      console.error("Error fetching reading results:", error)
      throw error
    }
  }

  // API function to fetch Writing results
  const fetchWritingResults = async () => {
    const API_URL = "https://api.exeleratetechnology.com/api/writing/list-results.php"
    
    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Writing API Error (${response.status}):`, errorText)
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      console.log("Writing API Response:", data)
      return data
    } catch (error: any) {
      console.error("Error fetching writing results:", error)
      throw error
    }
  }

  // API function to fetch Listening results
  const fetchListeningResults = async () => {
    const API_URL = "https://api.exeleratetechnology.com/api/listening/list-results.php"
    
    try {
      // Try GET first (many APIs prefer GET for list endpoints)
      let response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      // If GET returns 405, try POST as fallback
      if (response.status === 405) {
        console.log("Listening API returned 405 with GET, trying POST...")
        response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({}),
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Listening API Error (${response.status}):`, errorText)
        
        if (response.status === 405) {
          throw new Error("Method Not Allowed (405). The listening API endpoint may not accept the current HTTP method. Please check the API documentation or test in Postman.")
        }
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      console.log("Listening API Response:", data)
      return data
    } catch (error: any) {
      console.error("Error fetching listening results:", error)
      throw error
    }
  }

  // API function to fetch Speaking results
  const fetchSpeakingResults = async () => {
    const API_URL = "https://api.exeleratetechnology.com/api/speaking/list-results.php"
    
    try {
      // Try GET first (many APIs prefer GET for list endpoints)
      let response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      // If GET returns 405, try POST as fallback
      if (response.status === 405) {
        console.log("Speaking API returned 405 with GET, trying POST...")
        response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({}),
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Speaking API Error (${response.status}):`, errorText)
        
        if (response.status === 405) {
          throw new Error("Method Not Allowed (405). The speaking API endpoint may not accept the current HTTP method. Please check the API documentation or test in Postman.")
        }
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      console.log("Speaking API Response:", data)
      return data
    } catch (error: any) {
      console.error("Error fetching speaking results:", error)
      throw error
    }
  }

  // Load skill results when skill is selected
  const loadSkillResults = async (skill: "speaking" | "reading" | "writing" | "listening") => {
    setIsLoadingResults(true)
    setResultsError(null)
    
    try {
      // Check if we have organization/class selected and might need to filter
      console.log("Loading skill results for:", skill, { selectedOrganization, selectedClass })
      
      let response
      switch (skill) {
        case "reading":
          response = await fetchReadingResults()
          break
        case "writing":
          response = await fetchWritingResults()
          break
        case "listening":
          response = await fetchListeningResults()
          break
        case "speaking":
          response = await fetchSpeakingResults()
          break
        default:
          response = { success: true, data: [] }
      }

      console.log(`${skill} API response structure:`, response)

      // Handle different response formats
      let allResults: any[] = []
      if (response && typeof response === "object") {
        // Format 1: { success: true, data: [...] }
        if (response.success === true && Array.isArray(response.data)) {
          allResults = response.data
        }
        // Format 2: { success: true, items: [...] } (Writing API format)
        else if (response.success === true && Array.isArray(response.items)) {
          allResults = response.items
        }
        // Format 3: { data: [...] }
        else if (Array.isArray(response.data)) {
          allResults = response.data
        }
        // Format 4: { items: [...] }
        else if (Array.isArray(response.items)) {
          allResults = response.items
        }
        // Format 5: { results: [...] }
        else if (Array.isArray(response.results)) {
          allResults = response.results
        }
        // Format 6: Direct array response
        else if (Array.isArray(response)) {
          allResults = response
        }
        // Format 5: { success: true, results: [...] }
        else if (response.success === true && Array.isArray(response.results)) {
          allResults = response.results
        }
        // Format 6: Empty or unexpected format
        else {
          console.warn(`Unexpected response format for ${skill}:`, response)
          allResults = []
        }
      } else if (Array.isArray(response)) {
        allResults = response
      } else {
        console.warn(`Invalid response for ${skill}:`, response)
        allResults = []
      }

      // Filter results based on activeFilter
      let filteredResults = allResults
      
      // If "My Analysis" is active, filter by logged-in user
      if (activeFilter === "My Analysis" && authData?.user) {
        const loggedInUserId = authData.user.id
        const loggedInUserEmail = authData.user.email?.toLowerCase()
        const loggedInUserFirstName = authData.user.first_name?.toLowerCase()
        const loggedInUserLastName = authData.user.last_name?.toLowerCase()
        
        console.log("Filtering results for logged-in user:", {
          userId: loggedInUserId,
          email: loggedInUserEmail,
          firstName: loggedInUserFirstName,
          lastName: loggedInUserLastName
        })
        
        filteredResults = allResults.filter((result: any) => {
          // Match by user_id
          const resultUserId = result.user_id || result.userId || result.id
          if (resultUserId && Number(resultUserId) === Number(loggedInUserId)) {
            return true
          }
          
          // Match by email
          const resultEmail = result.email?.toLowerCase()
          if (resultEmail && loggedInUserEmail && resultEmail === loggedInUserEmail) {
            return true
          }
          
          // Match by first_name and last_name
          const resultFirstName = result.first_name?.toLowerCase()
          const resultLastName = result.last_name?.toLowerCase()
          if (resultFirstName && resultLastName && 
              loggedInUserFirstName && loggedInUserLastName &&
              resultFirstName === loggedInUserFirstName && 
              resultLastName === loggedInUserLastName) {
            return true
          }
          
          return false
        })
        
        console.log(`Filtered ${filteredResults.length} results for logged-in user out of ${allResults.length} total results`)
      }
      
      setSkillResults(filteredResults)
    } catch (error: any) {
      console.error(`Error loading ${skill} results:`, error)
      const errorMessage = error.message || `Failed to load ${skill} results. Please check the console for details.`
      setResultsError(errorMessage)
      setSkillResults([])
      
      // Show alert for better visibility
      if (error.message?.includes("405")) {
        alert(`API Error: Method Not Allowed (405). The ${skill} API endpoint may not accept the current HTTP method. Please check the API documentation or test in Postman.`)
      }
    } finally {
      setIsLoadingResults(false)
    }
  }

  // API function to fetch Reading result by ID
  const fetchReadingResultById = async (id: number | string) => {
    const API_URL = `https://api.exeleratetechnology.com/api/reading/get-result.php?id=${id}`
    
    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API Error (${response.status})`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error("Error fetching reading result:", error)
      throw error
    }
  }

  // API function to fetch Writing result by ID
  const fetchWritingResultById = async (id: number | string) => {
    const API_URL = `https://api.exeleratetechnology.com/api/writing/get-result.php?id=${id}`
    
    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API Error (${response.status})`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error("Error fetching writing result:", error)
      throw error
    }
  }

  // API function to fetch Listening result by ID
  const fetchListeningResultById = async (id: number | string) => {
    const API_URL = `https://api.exeleratetechnology.com/api/listening/get-result.php?id=${id}`
    
    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API Error (${response.status})`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error("Error fetching listening result:", error)
      throw error
    }
  }

  // API function to fetch Speaking result by ID
  const fetchSpeakingResultById = async (id: number | string) => {
    const API_URL = `https://api.exeleratetechnology.com/api/speaking/get-result.php?id=${id}`
    
    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API Error (${response.status})`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error("Error fetching speaking result:", error)
      throw error
    }
  }

  // Function to handle "Show Details" click - toggle inline expansion
  const handleShowDetails = async (result: SkillResult, skill: string) => {
    if (!result.id) {
      console.error("Result ID is missing")
      return
    }

    // If already expanded, collapse it
    if (expandedResultId === result.id) {
      setExpandedResultId(null)
      setExpandedDetailedResult(null)
      return
    }

    // Expand and fetch detailed result
    try {
      setIsLoadingDetailedResult(true)
      let detailedResult

      switch (skill) {
        case "reading":
          detailedResult = await fetchReadingResultById(result.id)
          break
        case "writing":
          detailedResult = await fetchWritingResultById(result.id)
          break
        case "listening":
          detailedResult = await fetchListeningResultById(result.id)
          break
        case "speaking":
          detailedResult = await fetchSpeakingResultById(result.id)
          break
        default:
          detailedResult = { success: true, data: result }
      }

      setExpandedResultId(result.id)
      setExpandedDetailedResult({
        ...result,
        skill: skill,
        detailedResult: detailedResult,
      })
    } catch (error: any) {
      console.error("Error fetching detailed result:", error)
      alert(`Failed to load detailed result: ${error.message}`)
      setExpandedResultId(null)
      setExpandedDetailedResult(null)
    } finally {
      setIsLoadingDetailedResult(false)
    }
  }

  // Effect to fetch organizations on component mount
  useEffect(() => {
    fetchOrganizationsList().catch((error) => {
      console.error("Failed to fetch organizations on mount:", error)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Effect to handle skill selection from navigation state (e.g., when coming back from StudentDetailsPage)
  useEffect(() => {
    const state = (location as any).state
    if (state?.selectedSkill) {
      const skillToSelect = state.selectedSkill as "speaking" | "reading" | "writing" | "listening"
      setActiveSkill(skillToSelect)
      // Load the skill results
      loadSkillResults(skillToSelect).catch((error) => {
        console.error("Failed to load skill results:", error)
      })
      // Scroll to detailed analysis section
      setTimeout(() => {
        const element = document.getElementById("detailed-analysis")
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
      // Clear the location state to avoid re-triggering
      window.history.replaceState({}, document.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  // Effect to validate selectedOrganization when organizations load
  useEffect(() => {
    if (organizationsList.length > 0 && selectedOrganization) {
      // Check if the selected organization ID exists in the list
      const orgExists = organizationsList.some((org) => {
        const oId1 = org.id ? String(org.id) : null
        const oId2 = org.organisation_id ? String(org.organisation_id) : null
        const oId3 = org.organization_id ? String(org.organization_id) : null
        const searchId = String(selectedOrganization)
        return oId1 === searchId || oId2 === searchId || oId3 === searchId
      })
      
      if (!orgExists) {
        console.warn(`Selected organization ID "${selectedOrganization}" not found in organizations list. Clearing selection.`)
        setSelectedOrganization("")
        setClassesData({})
        setUsersList([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationsList])

  // Effect to load results when skill is selected
  useEffect(() => {
    if (activeSkill) {
      loadSkillResults(activeSkill)
    } else {
      setSkillResults([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSkill])

  // Reload skill results when activeFilter changes (to re-filter by user or organization)
  useEffect(() => {
    if (activeSkill) {
      loadSkillResults(activeSkill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter])

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
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
          backgroundColor: "#1E40AF",
        }}
      />
      
      {/* Sidebar */}
      <div
        style={{
          width: sidebarCollapsed ? "80px" : "280px",
          backgroundColor: "#1E3A8A",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: "24px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {!sidebarCollapsed && (
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#FFFFFF",
              }}
            >
              ENGLISH SKILL AI
            </h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: "transparent",
              border: "none",
              color: "#FFFFFF",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft
              style={{
                width: "20px",
                height: "20px",
                transform: sidebarCollapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s",
              }}
            />
          </button>
        </div>

        {/* Navigation Menu */}
        <div
          style={{
            flex: 1,
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = item.active || window.location.pathname === item.route
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.route && item.route !== "#") {
                    navigate(item.route)
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  backgroundColor: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "14px",
                  fontWeight: isActive ? "600" : "400",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }
                }}
              >
                <Icon style={{ width: "20px", height: "20px", flexShrink: 0 }} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            )}
          )}
        </div>

        {/* User Profile Section */}
        <div
          style={{
            padding: "20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: sidebarCollapsed ? "0" : "8px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#3B82F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontWeight: "bold",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              {getInitials(
                `${authData?.user?.first_name || ""} ${authData?.user?.last_name || ""}`.trim() ||
                  "User"
              )}
            </div>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#FFFFFF",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {authData?.user?.first_name || "User"} {authData?.user?.last_name || ""}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(255, 255, 255, 0.7)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {authData?.user?.email || ""}
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={logout}
              style={{
                width: "100%",
                padding: "12px 16px",
                backgroundColor: "#DC2626",
                border: "none",
                borderRadius: "8px",
                color: "#FFFFFF",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#B91C1C"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#DC2626"
              }}
            >
              <LogOut style={{ width: "16px", height: "16px" }} />
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Main Content Area */}
        <div
          style={{
            flex: 1,
            padding: "32px",
            paddingBottom: "128px",
            backgroundColor: "#1E40AF",
            minHeight: "100vh",
          }}
        >
          {/* Welcome Card */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px 32px",
              marginBottom: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div style={{ flex: 1, minWidth: "300px" }}>
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#1E3A8A",
                  margin: 0,
                  marginBottom: "12px",
                  lineHeight: "1.3",
                }}
              >
                Welcome, {authData?.user?.first_name || "User"} {authData?.user?.last_name || ""}
              </h1>
              <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)", margin: 0, marginBottom: "6px", lineHeight: "1.5" }}>
                Role: {(authData?.user?.role || "administrator").toLowerCase()}
              </p>
               <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)", margin: 0, lineHeight: "1.5" }}>
                 Organization: {getOrganizationName(selectedOrganization)}
               </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="outline"
                style={{
                  borderColor: "#1E3A8A",
                  color: "#1E3A8A",
                  padding: "10px 16px",
                }}
              >
                <RefreshCw style={{ width: "16px", height: "16px", marginRight: "8px" }} />
                Refresh Data
              </Button>
              <Button
                onClick={() => navigate("/skills-home")}
                style={{
                  background: "linear-gradient(135deg, #3B82F6 0%, #00B9FC 100%)",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "10px 16px",
                }}
              >
                <Mic2 style={{ width: "16px", height: "16px", marginRight: "8px" }} />
                English Skill AI
              </Button>
            </div>
          </div>

          {/* Organization Section */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#1E3A8A",
                margin: 0,
                marginBottom: "16px",
              }}
            >
              Organization
            </h2>
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              <Button
                onClick={() => setActiveFilter("My Analysis")}
                variant={activeFilter === "My Analysis" ? "default" : "outline"}
                style={{
                  backgroundColor: activeFilter === "My Analysis" ? "#1E3A8A" : "#FFFFFF",
                  color: activeFilter === "My Analysis" ? "#FFFFFF" : "#1E3A8A",
                  borderColor: activeFilter === "My Analysis" ? "#1E3A8A" : "rgba(30, 58, 138, 0.2)",
                  borderWidth: activeFilter === "My Analysis" ? "1px" : "1px",
                }}
              >
                My Analysis
              </Button>
              <Button
                onClick={() => setActiveFilter("Select Organization")}
                variant={activeFilter === "Select Organization" ? "default" : "outline"}
                style={{
                  backgroundColor: activeFilter === "Select Organization" ? "#1E3A8A" : "#FFFFFF",
                  color: activeFilter === "Select Organization" ? "#FFFFFF" : "#1E3A8A",
                  borderColor: activeFilter === "Select Organization" ? "#1E3A8A" : "rgba(30, 58, 138, 0.2)",
                  borderWidth: activeFilter === "Select Organization" ? "1px" : "1px",
                }}
              >
                Select Organization
              </Button>
            </div>
            <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)", margin: 0, marginBottom: "16px" }}>
              View your personal analytics and progress
            </p>
            
            {activeFilter === "Select Organization" && (
              <div style={{ marginTop: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#1E3A8A",
                    marginBottom: "8px",
                  }}
                >
                  Organization:
                </label>
                 <select
                   value={selectedOrganization}
                   onChange={(e) => {
                     const selectedValue = e.target.value
                     console.log("Organization selected:", selectedValue, "Available orgs:", organizationsList.map(o => ({
                       id: o.id,
                       organisation_id: o.organisation_id,
                       name: o.name || o.organisation_name
                     })))
                     setSelectedOrganization(selectedValue)
                     setShowClasses(false)
                     setSelectedClass(null)
                     setSelectedStudent(null)
                     // Clear classes data when organization changes
                     setClassesData({})
                     setUsersList([])
                   }}
                   disabled={isLoadingOrganizations}
                   style={{
                     width: "100%",
                     maxWidth: "400px",
                     padding: "10px 12px",
                     borderRadius: "8px",
                     border: "1px solid rgba(30, 58, 138, 0.2)",
                     fontSize: "14px",
                     color: "#1E3A8A",
                     backgroundColor: "#FFFFFF",
                     opacity: isLoadingOrganizations ? 0.6 : 1,
                     cursor: isLoadingOrganizations ? "not-allowed" : "pointer",
                   }}
                 >
                   <option value="">
                     {isLoadingOrganizations ? "Loading organizations..." : "Select Organization"}
                   </option>
                   {organizationsList.map((org) => {
                     // Check organisation field first (primary field name from API)
                     const orgName = org.organisation || org.name || org.organisation_name || org.organization_name || `Organization ${org.id}` || "Unknown"
                     // Always use ID for value, never fallback to name
                     const orgId = org.id || org.organisation_id || org.organization_id
                     if (!orgId) {
                       console.warn("Organization missing ID:", org)
                       return null // Skip organizations without ID
                     }
                     const orgIdString = String(orgId)
                     return (
                       <option key={orgIdString} value={orgIdString}>
                         {orgName}
                       </option>
                     )
                   }).filter(Boolean)}
                 </select>
                 {organizationsError && (
                   <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "8px" }}>
                     Error loading organizations: {organizationsError}
                   </p>
                 )}
              </div>
            )}

              {/* All Classes Button - shown after organization is selected */}
              {selectedOrganization && (
                <div
                  style={{
                    paddingTop: "16px",
                    borderTop: "1px solid rgba(30, 58, 138, 0.1)",
                  }}
                >
                   <Button
                     onClick={async () => {
                       if (!showClasses) {
                         // Fetch users list when opening classes for the first time
                         // Pass selectedOrganization to filter users by organization
                         try {
                           await fetchUsersList(selectedOrganization)
                         } catch (error) {
                           console.error("Failed to fetch users list:", error)
                         }
                       }
                       setShowClasses(!showClasses)
                       setSelectedStudent(null)
                     }}
                    variant={showClasses ? "default" : "outline"}
                    disabled={isLoadingUsers}
                    style={{
                      backgroundColor: showClasses ? "#3B82F6" : "#F3F4F6",
                      color: showClasses ? "#FFFFFF" : "#1E3A8A",
                      borderColor: showClasses ? "#3B82F6" : "#E5E7EB",
                      opacity: isLoadingUsers ? 0.6 : 1,
                    }}
                  >
                    <GraduationCap style={{ width: "16px", height: "16px", marginRight: "6px" }} />
                    {isLoadingUsers ? "Loading Classes..." : "All Classes"}
                  </Button>
                  {usersError && (
                    <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "8px" }}>
                      Error: {usersError}
                    </p>
                  )}
                </div>
              )}

              {/* Classes with Teachers - shown when All Classes is clicked */}
              {showClasses && (
                <div
                  style={{
                    paddingTop: "16px",
                    borderTop: "1px solid rgba(30, 58, 138, 0.1)",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#1E3A8A",
                      marginBottom: "12px",
                    }}
                  >
                    Classes
                  </h3>
                  {isLoadingUsers ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                      Loading classes...
                    </div>
                  ) : usersError ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "#EF4444" }}>
                      Error loading classes: {usersError}
                    </div>
                  ) : getAvailableClasses().length === 0 ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                      No classes found. Please ensure users have class assignments.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "12px",
                      }}
                    >
                       {getAvailableClasses().map((className) => {
                         const classData = classesData[className]
                         const teacherName = classData?.teacher || getTeacherForClass(className)
                         const studentCount = classData?.students?.length || 0
                         
                         // Debug logging
                         if (!classData || !classData.teacher) {
                           console.warn(`Class "${className}" missing teacher in UI render. Class data:`, classData)
                         }
                         
                         return (
                           <div
                             key={className}
                             onClick={() => {
                               // Toggle class: if already selected, deselect; otherwise, select
                               if (selectedClass === className) {
                                 setSelectedClass(null)
                               } else {
                                 setSelectedClass(className)
                                 setActiveSkill(null) // Clear active skill when class is selected
                                 setSkillResults([]) // Clear skill results
                               }
                               setSelectedStudent(null)
                               // Scroll to Detailed Analysis section
                               setTimeout(() => {
                                 const element = document.getElementById("detailed-analysis")
                                 if (element) {
                                   element.scrollIntoView({ behavior: "smooth", block: "start" })
                                 }
                               }, 100)
                             }}
                             style={{
                               padding: "16px",
                               backgroundColor: selectedClass === className ? "#F3F4F6" : "#FFFFFF",
                               borderRadius: "12px",
                               border: selectedClass === className ? "2px solid #3B82F6" : "1px solid rgba(30, 58, 138, 0.1)",
                               cursor: "pointer",
                               transition: "all 0.2s",
                             }}
                             onMouseEnter={(e) => {
                               if (selectedClass !== className) {
                                 e.currentTarget.style.backgroundColor = "#F3F4F6"
                                 e.currentTarget.style.borderColor = "#3B82F6"
                               }
                             }}
                             onMouseLeave={(e) => {
                               if (selectedClass !== className) {
                                 e.currentTarget.style.backgroundColor = "#FFFFFF"
                                 e.currentTarget.style.borderColor = "rgba(30, 58, 138, 0.1)"
                               }
                             }}
                           >
                             <p style={{ fontSize: "16px", color: "#1E3A8A", fontWeight: "600", marginBottom: "4px" }}>
                               Class {className} - {teacherName}
                             </p>
                             <p style={{ fontSize: "12px", color: "rgba(30, 58, 138, 0.6)" }}>
                               {studentCount} {studentCount === 1 ? "student" : "students"}
                             </p>
                           </div>
                         )
                       })}
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Skill Buttons Section */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#1E3A8A",
                marginBottom: "16px",
              }}
            >
              Skills
            </h3>
                <div
                  style={{
                    display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              {skillButtons.map((skill) => {
                const Icon = skill.icon
                const isActive = activeSkill === skill.id
                return (
                  <Button
                    key={skill.id}
                    onClick={() => {
                      // Toggle skill: if already active, deselect; otherwise, select
                      if (activeSkill === skill.id) {
                        setActiveSkill(null)
                        setSkillResults([])
                      } else {
                        setActiveSkill(skill.id)
                        setSelectedClass(null) // Clear selected class when skill is selected
                        setSelectedStudent(null) // Clear selected student
                        // Scroll to detailed analysis when skill is selected
                        setTimeout(() => {
                          const element = document.getElementById("detailed-analysis")
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "start" })
                          }
                        }, 100)
                      }
                    }}
                    variant={isActive ? "default" : "outline"}
                    style={{
                      backgroundColor: isActive ? skill.color : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : skill.color,
                      borderColor: skill.color,
                      borderWidth: "1px",
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: isActive ? "600" : "500",
                    }}
                  >
                    <Icon style={{ width: "18px", height: "18px", marginRight: "8px" }} />
                    {skill.label}
                  </Button>
                )
              })}
                </div>
              </div>

          {/* Detailed Analysis Section - Show after skill is selected or class is selected */}
          {(activeSkill || selectedClass) && (
          <div
            id="detailed-analysis"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1E3A8A",
                }}
              >
                Detailed Analysis
                  {activeSkill && ` - ${skillButtons.find(s => s.id === activeSkill)?.label || ""}`}
                {selectedClass && ` - Class ${selectedClass}`}
                {selectedStudent && ` - ${selectedStudent}`}
              </h3>
            </div>

            {/* Combined Table with Stats and Analysis */}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "800px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid rgba(30, 58, 138, 0.1)",
                      backgroundColor: "#F3F4F6",
                    }}
                  >
                    {selectedClass && !selectedStudent && !activeSkill ? (
                      <>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          NAME
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          SPEAKING
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          READING
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          WRITING
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          LISTENING
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          ACTIONS
                        </th>
                      </>
                    ) : activeSkill ? (
                      <>
                        {getTableColumns().map((col) => (
                          <th
                            key={col.key}
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#1E3A8A",
                            }}
                          >
                            {col.label}
                          </th>
                        ))}
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          Actions
                        </th>
                      </>
                    ) : (
                      <>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          Date
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          User
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          Score
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          Words
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          Sentences
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          Fluency
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          Speed
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1E3A8A",
                          }}
                        >
                          Actions
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(isLoadingResults || (selectedClass && isLoadingUsers)) ? (
                    <tr>
                      <td colSpan={selectedClass && !selectedStudent && !activeSkill ? 6 : activeSkill ? getTableColumns().length + 1 : 8} style={{ padding: "24px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                        {selectedClass && isLoadingUsers ? "Loading students..." : "Loading..."}
                      </td>
                    </tr>
                  ) : (resultsError || (selectedClass && usersError)) ? (
                    <tr>
                      <td colSpan={selectedClass && !selectedStudent && !activeSkill ? 6 : activeSkill ? getTableColumns().length + 1 : 8} style={{ padding: "24px", textAlign: "center", color: "#EF4444" }}>
                        Error: {resultsError || usersError}
                      </td>
                    </tr>
                  ) : getTableData().length === 0 ? (
                    <tr>
                      <td colSpan={selectedClass && !selectedStudent && !activeSkill ? 6 : activeSkill ? getTableColumns().length + 1 : 8} style={{ padding: "24px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                        {selectedClass ? (isLoadingUsers ? "Loading students..." : "No students found in this class") : activeSkill ? `No ${activeSkill} results available` : "Select a skill or class to view data"}
                      </td>
                    </tr>
                  ) : getTableData().map((row: any, index) => {
                    // If showing students list with scores
                    if (row.type === "student") {
                      // Use email from API data, or generate from name if not available
                      const studentEmail = row.email || `${row.name.toLowerCase().replace(/\s+/g, ".")}@xeleratelearning.com`
                      
                      return (
                        <tr
                          key={index}
                          style={{
                            borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
                            backgroundColor: "#FFFFFF",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#F3F4F6"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#FFFFFF"
                          }}
                        >
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A", fontWeight: "500" }}>
                            {row.name}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {row.speaking}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {row.reading}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {row.writing}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {row.listening}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation() // Prevent row click
                                navigate("/student-details", {
                                  state: {
                                    studentData: {
                                      email: studentEmail,
                                      class: selectedClass ? `Class ${selectedClass}` : "",
                                      transcribedText: "One day Andrew and Ferriter went to the market and you bought a bag. Later they went to a shop and bought a packet of ground and a bottle of juice.",
                                      pitch: "N/A",
                                      volume: 13.1199998855591,
                                      tone: "Neutral",
                                      hesitationWords: 0,
                                      pauses: 2,
                                      fillerWords: 0,
                                      studentName: row.name,
                                      date: new Date().toLocaleString(),
                                    },
                                  },
                                })
                              }}
                              style={{
                                color: "#3B82F6",
                                fontSize: "14px",
                              }}
                            >
                              <Eye style={{ width: "16px", height: "16px", marginRight: "4px" }} />
                              Show Details
                            </Button>
                          </td>
                        </tr>
                      )
                    }
                    // If showing skill-based results
                    if (row.type === "skill-result" && activeSkill) {
                      const columns = getTableColumns()
                      return (
                        <React.Fragment key={index}>
                        <tr
                          style={{
                            borderBottom: "1px solid rgba(30, 58, 138, 0.1)",
                            backgroundColor: "#FFFFFF",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#F3F4F6"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#FFFFFF"
                          }}
                        >
                          {columns.map((col) => {
                            let displayValue: any = undefined
                            
                            // Handle specific field name variations for Reading skill
                            if (activeSkill === "reading") {
                              if (col.key === "module") {
                                // Reading API uses module_type (STORIES, NOVEL, etc.)
                                displayValue = row.module_type || row.module || row.module_key || undefined
                              } else if (col.key === "title") {
                                // Reading API uses module_title
                                displayValue = row.module_title || row.title || undefined
                              } else if (col.key === "pronunciation") {
                                displayValue = 
                                  row.pronunciation || 
                                  row.pronunciation_score || 
                                  row.pronunciationScore ||
                                  row.pronounciation || // typo variant
                                  row.pronounciation_score ||
                                  row["pronunciation"] ||
                                  row["pronunciation_score"] ||
                                  undefined
                                // Handle string scores from API (e.g., "65.00")
                                if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
                                  displayValue = parseFloat(displayValue)
                                }
                              } else if (col.key === "grammar_score") {
                                displayValue = 
                                  row.grammar_score || 
                                  row.grammarScore ||
                                  row.grammar ||
                                  row["grammar_score"] ||
                                  row["grammar"] ||
                                  undefined
                                // Handle string scores from API (e.g., "72.00")
                                if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
                                  displayValue = parseFloat(displayValue)
                                }
                              } else if (col.key === "overall_score") {
                                // Handle string scores from API
                                displayValue = row.overall_score || row.overallScore || undefined
                                if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
                                  displayValue = parseFloat(displayValue)
                                }
                              } else if (col.key === "fluency_score") {
                                // Handle string scores from API
                                displayValue = row.fluency_score || row.fluencyScore || undefined
                                if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
                                  displayValue = parseFloat(displayValue)
                                }
                              }
                            } else if (activeSkill === "speaking") {
                              if (col.key === "user_name") {
                                // Combine first_name and last_name
                                const firstName = row.first_name || ""
                                const lastName = row.last_name || ""
                                displayValue = `${firstName} ${lastName}`.trim() || "-"
                              } else if (col.key === "organisation") {
                                // Map organisation_id to organisation name
                                const orgId = row.organisation_id || row.organization_id
                                displayValue = orgId ? getOrganizationName(orgId) : "-"
                              } else if (col.key === "module_title") {
                                displayValue = row.module_title || row.title || "-"
                              } else if (col.key === "email") {
                                displayValue = row.email || "-"
                              } else if (col.key === "user_role") {
                                const role = row.user_role || row.role || ""
                                displayValue = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : "-"
                              } else if (col.key === "user_class") {
                                // Handle user_class which might be a JSON string or array
                                let userClass = row.user_class
                                if (typeof userClass === "string" && userClass.startsWith("[")) {
                                  try {
                                    const parsed = JSON.parse(userClass)
                                    if (Array.isArray(parsed)) {
                                      displayValue = parsed.join(", ") || "-"
                                    } else {
                                      displayValue = userClass
                                    }
                                  } catch (e) {
                                    displayValue = userClass || "-"
                                  }
                                } else if (Array.isArray(userClass)) {
                                  displayValue = userClass.join(", ") || "-"
                                } else {
                                  displayValue = userClass || "-"
                                }
                              } else if (col.key === "pronunciation_score") {
                                // Handle string scores (e.g., "24.00")
                                displayValue = row.pronunciation_score || undefined
                                if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
                                  displayValue = parseFloat(displayValue)
                                }
                              } else if (col.key === "grammar_score") {
                                // Handle string scores (e.g., "0.00")
                                displayValue = row.grammar_score || undefined
                                if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
                                  displayValue = parseFloat(displayValue)
                                }
                              } else if (col.key === "overall_score") {
                                // Handle string scores (e.g., "42.00")
                                displayValue = row.overall_score || undefined
                                if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
                                  displayValue = parseFloat(displayValue)
                                }
                              } else if (col.key === "fluency_score") {
                                // Handle string scores (e.g., "60.00")
                                displayValue = row.fluency_score || undefined
                                if (typeof displayValue === "string" && !isNaN(parseFloat(displayValue))) {
                                  displayValue = parseFloat(displayValue)
                                }
                              }
                            }
                            
                            // Try multiple field name variations for better API compatibility (fallback)
                            if (displayValue === undefined) {
                              // Try multiple field name variations
                              displayValue = 
                                row[col.key] || 
                                row[col.key.toLowerCase()] || 
                                row[col.key.toUpperCase()] ||
                                row[col.key.replace(/_/g, "")] ||
                                row[col.key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] || // snake_case to camelCase
                                undefined
                              
                              // For date_time field, also check created_at, date, timestamp
                              if (col.key === "date_time" && displayValue === undefined) {
                                displayValue = row.created_at || row.date || row.timestamp || row.time || undefined
                              }
                            }
                            
                            // Default to "-" if no value found
                            if (displayValue === undefined || displayValue === null || displayValue === "") {
                              displayValue = "-"
                            }
                            
                            // Format date/time if it's a date field
                            if (col.key === "date_time" || col.key === "date") {
                              try {
                                if (displayValue && displayValue !== "-") {
                                  const date = new Date(displayValue)
                                  if (!isNaN(date.getTime())) {
                                    displayValue = date.toLocaleString()
                                  }
                                }
                              } catch (e) {
                                // Keep original value if parsing fails
                              }
                            }
                            
                            // Format scores with % if they're numeric (including pronunciation and grammar)
                            if (
                              (col.key.includes("score") || 
                               col.key.includes("Score") || 
                               col.key === "pronunciation" ||
                               col.key === "grammar_score") && 
                              typeof displayValue === "number"
                            ) {
                              displayValue = `${displayValue}%`
                            }

                            return (
                              <td key={col.key} style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                                {displayValue}
                              </td>
                            )
                          })}
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await handleShowDetails(row, activeSkill)
                              }}
                              disabled={isLoadingDetailedResult && expandedResultId !== row.id}
                              style={{
                                color: "#3B82F6",
                                fontSize: "14px",
                              }}
                            >
                              {expandedResultId === row.id ? (
                                <>
                                  <ChevronUp style={{ width: "16px", height: "16px", marginRight: "4px" }} />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronDown style={{ width: "16px", height: "16px", marginRight: "4px" }} />
                                  Show Details
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                        {/* Expanded details row */}
                        {expandedResultId === row.id && (
                          <tr>
                            <td colSpan={getTableColumns().length + 1} style={{ padding: "0", backgroundColor: "#F9FAFB" }}>
                              {isLoadingDetailedResult ? (
                                <div style={{ padding: "32px", textAlign: "center", color: "#1E3A8A" }}>
                                  Loading detailed results...
                                </div>
                              ) : expandedDetailedResult ? (
                                <div style={{ padding: "24px" }}>
                                  {activeSkill === "reading" && renderReadingDetailedView(expandedDetailedResult, getOrganizationName, activeSkill)}
                                  {activeSkill === "listening" && renderListeningDetailedView(expandedDetailedResult, getOrganizationName, activeSkill)}
                                  {activeSkill === "writing" && (
                                    <div style={{ padding: "16px", color: "#1E3A8A" }}>
                                      Writing detailed view coming soon...
                                    </div>
                                  )}
                                  {activeSkill === "speaking" && renderSpeakingDetailedView(expandedDetailedResult, getOrganizationName, activeSkill)}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      )
                    }
                    // Default fallback (shouldn't reach here often)
                    return null
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
