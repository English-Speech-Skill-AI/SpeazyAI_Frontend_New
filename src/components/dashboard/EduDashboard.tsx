"use client"

import React, { useState, useEffect, useMemo } from "react"
import type { CSSProperties } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "../ui/button"
import { PageHeader } from "./PageHeader"
import { useAuth } from "../../contexts/AuthContext"
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
  Menu,
} from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { getExelerateApiBase } from "../../config/apiConfig"

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
  // Feature flag: Temporarily disable Skills tab - can be re-enabled by setting to true
  const SHOW_SKILLS_TAB = false
  
  const navigate = useNavigate()
  const [selectedOrganization, setSelectedOrganization] = useState("")
  const [activeFilter, setActiveFilter] = useState("My Analysis")
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [activeSkill, setActiveSkill] = useState<"speaking" | "reading" | "writing" | "listening" | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false)
  const { authData, logout, token } = useAuth()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
      }
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const apiBase = getExelerateApiBase() + "/api"
  
  // State for skill-based results
  const [skillResults, setSkillResults] = useState<SkillResult[]>([])
  const [isLoadingResults, setIsLoadingResults] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [expandedResultId, setExpandedResultId] = useState<string | number | null>(null)
  const [expandedDetailedResult, setExpandedDetailedResult] = useState<any>(null)
  const [isLoadingDetailedResult, setIsLoadingDetailedResult] = useState(false)
  
  // State to store all skill results (combined from all APIs)
  const [allSkillResults, setAllSkillResults] = useState<Record<string, SkillResult[]>>({
    reading: [],
    writing: [],
    listening: [],
    speaking: []
  })
  const [isLoadingAllSkills, setIsLoadingAllSkills] = useState(false)

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
  const [classesData, setClassesData] = useState<Record<string, { students: ApiUser[], teacher: string, allUsers: ApiUser[] }>>({})
  
  // State for teacher dashboard data (overall scores per class and per user)
  const [teacherDashboardData, setTeacherDashboardData] = useState<Record<string, any>>({})
  const [teacherDashboardUserScores, setTeacherDashboardUserScores] = useState<Record<string, any>>({}) // Key: user email or ID, Value: scores
  const [isLoadingTeacherDashboard, setIsLoadingTeacherDashboard] = useState(false)
  const [teacherDashboardError, setTeacherDashboardError] = useState<string | null>(null)

  // State for current user's overall scores (My Analysis) from users/overall_results.php
  const [myOverallScores, setMyOverallScores] = useState<{
    listening: number | null
    speaking: number | null
    reading: number | null
    writing: number | null
  } | null>(null)
  const [isLoadingMyOverall, setIsLoadingMyOverall] = useState(false)
  const [myOverallError, setMyOverallError] = useState<string | null>(null)

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
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [orgSearchTerm, setOrgSearchTerm] = useState("")
  const orgDropdownRef = React.useRef<HTMLDivElement>(null)

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

   // Helper function to check if a result belongs to a specific class
   const resultBelongsToClass = (result: any, className: string): boolean => {
     if (!result || !className) return false
     
     // Check user_class field (can be string, array, or JSON string)
     let userClass = result.user_class || result.class || result.userClass
     
     if (!userClass) return false
     
     // Handle JSON string format
     if (typeof userClass === "string" && userClass.startsWith("[")) {
       try {
         const parsed = JSON.parse(userClass)
         if (Array.isArray(parsed)) {
           return parsed.some((c: any) => String(c).trim() === String(className).trim())
         }
       } catch (e) {
         // Not valid JSON, treat as string
       }
     }
     
     // Handle array format
     if (Array.isArray(userClass)) {
       return userClass.some((c: any) => String(c).trim() === String(className).trim())
     }
     
     // Handle string format
     if (typeof userClass === "string") {
       return String(userClass).trim() === String(className).trim()
     }
     
     return false
   }

   // Get table data - shows all users in the class when class is selected
   const getTableData = () => {
     // If a class is selected, show users with their scores (listening, speaking, reading, writing, overall)
     if (selectedClass) {
       const classData = classesData[selectedClass]

       if (classData && classData.allUsers && classData.allUsers.length > 0) {
         return classData.allUsers.map((user: any) => {
           const userRole = (user.role || "").toLowerCase()
           const isStudent = userRole !== "teacher" && userRole !== "principal" && userRole !== "administrator" && !userRole.includes("admin")
           
           // Get scores from user object (from teacher dashboard API)
           const scoresObj = user.scores || {}
           const speakingScore = (user.speaking !== undefined && user.speaking !== null) 
             ? user.speaking 
             : ((scoresObj.speaking !== undefined && scoresObj.speaking !== null) ? scoresObj.speaking : 0)
           const readingScore = (user.reading !== undefined && user.reading !== null) 
             ? user.reading 
             : ((scoresObj.reading !== undefined && scoresObj.reading !== null) ? scoresObj.reading : 0)
           const writingScore = (user.writing !== undefined && user.writing !== null) 
             ? user.writing 
             : ((scoresObj.writing !== undefined && scoresObj.writing !== null) ? scoresObj.writing : 0)
           const listeningScore = (user.listening !== undefined && user.listening !== null) 
             ? user.listening 
             : ((scoresObj.listening !== undefined && scoresObj.listening !== null) ? scoresObj.listening : 0)
           
           // Calculate overall score
           let overallScore: number | undefined = undefined
           const scoreValues = [listeningScore, speakingScore, readingScore, writingScore].filter(s => s > 0)
           if (scoreValues.length > 0) {
             overallScore = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
           }
           
           return {
             type: "user",
             name: user.name || (user.first_name && user.last_name) 
               ? `${user.first_name} ${user.last_name}`.trim()
               : user.first_name || user.email || "Unknown",
             email: user.email || "",
             id: user.id || user.user_id,
           class: selectedClass,
             role: user.role || "student",
             isStudent: isStudent,
             // Order: Listening, Speaking, Reading, Writing (as requested)
             listening: listeningScore,
             speaking: speakingScore,
             reading: readingScore,
             writing: writingScore,
             overall_score: overallScore,
           }
         })
       }
       
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

  // Memoize table data so the table uses one stable value (avoids multiple getTableData() calls per render)
  const tableData = useMemo(() => getTableData(), [selectedClass, activeSkill, classesData, skillResults])

  // Current user's overall scores for My Analysis: prefer users/overall_results.php, fallback to teacher dashboard
  const myAnalysisScores = useMemo(() => {
    if (myOverallScores) return myOverallScores
    if (!authData?.user) return null
    const uid = authData.user.id
    const email = (authData.user.email || "").toLowerCase()
    const byId = uid != null ? teacherDashboardUserScores[String(uid)] : null
    const byEmail = email ? teacherDashboardUserScores[email] : null
    const raw = byId || byEmail
    if (!raw) return null
    const listening = raw.listening ?? raw.listening_score ?? raw.scores?.listening
    const speaking = raw.speaking ?? raw.speaking_score ?? raw.scores?.speaking
    const reading = raw.reading ?? raw.reading_score ?? raw.scores?.reading
    const writing = raw.writing ?? raw.writing_score ?? raw.scores?.writing
    return {
      listening: typeof listening === "number" ? listening : null,
      speaking: typeof speaking === "number" ? speaking : null,
      reading: typeof reading === "number" ? reading : null,
      writing: typeof writing === "number" ? writing : null,
    }
  }, [authData?.user, teacherDashboardUserScores, myOverallScores])

  // Get teacher name for a class
  const getTeacherForClass = (className: string): string => {
    const classData = classesData[className]
    if (classData && classData.teacher) {
      return classData.teacher
    }
    // Fallback to "Unknown Teacher" if class data doesn't exist or teacher is missing
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

  // Get organization name from ID (from list or fallback to id)
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
    
    return orgId
  }

  // Prefer organisation_name from login.php when showing the current user's org
  const getDisplayOrganizationName = (orgId: string | null | undefined): string => {
    const userOrgId = getUserOrganizationId()
    if (orgId && userOrgId && String(orgId).trim() === String(userOrgId).trim()) {
      const fromLogin = authData?.user?.organisation_name
      if (fromLogin && typeof fromLogin === "string" && fromLogin.trim() !== "") {
        return fromLogin.trim()
      }
    }
    return getOrganizationName(orgId)
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

  // API function to fetch organizations list (requires auth token)
  // API function to fetch organization from teacher dashboard (for teachers/principals)
  const fetchOrganizationFromTeacherDashboard = async () => {
    if (!isTeacherOrPrincipal()) {
      return null
    }

    const API_URL = `${apiBase}/teacher/dashboard.php`
    
    try {

      // Try GET first
      let response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      // If GET returns 405, try POST as fallback
      if (!response.ok && response.status === 405) {
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
        console.error(`Teacher Dashboard API Error (${response.status}):`, errorText)
        throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`)
      }

      const data = await response.json()

      // Extract organization information from response
      let orgId: string | null = null
      let orgName: string | null = null

      // Try to extract from various possible response formats
      if (data.organisation_id || data.organization_id || data.org_id) {
        orgId = String(data.organisation_id || data.organization_id || data.org_id)
        orgName = data.organisation || data.organization || data.organisation_name || data.organization_name || `Organization ${orgId}`
      } else if (data.data) {
        const dataObj = data.data
        if (dataObj.organisation_id || dataObj.organization_id || dataObj.org_id) {
          orgId = String(dataObj.organisation_id || dataObj.organization_id || dataObj.org_id)
          orgName = dataObj.organisation || dataObj.organization || dataObj.organisation_name || dataObj.organization_name || `Organization ${orgId}`
        }
      } else if (Array.isArray(data) && data.length > 0) {
        // If array, get organization from first item
        const firstItem = data[0]
        if (firstItem.organisation_id || firstItem.organization_id || firstItem.org_id) {
          orgId = String(firstItem.organisation_id || firstItem.organization_id || firstItem.org_id)
          orgName = firstItem.organisation || firstItem.organization || firstItem.organisation_name || firstItem.organization_name || `Organization ${orgId}`
        }
      }

      // If still no org found, try to get from user's auth data
      if (!orgId) {
        const userOrgId = getUserOrganizationId()
        if (userOrgId) {
          orgId = userOrgId
          orgName = `Organization ${orgId}`
        }
      }

      if (orgId) {
        return {
          id: orgId,
          organisation_id: orgId,
          organization_id: orgId,
          organisation: orgName || undefined,
          name: orgName || undefined,
          organisation_name: orgName || undefined,
          organization_name: orgName || undefined
        }
      }

      return null
    } catch (error: any) {
      console.error("Error fetching organization from teacher dashboard:", error)
      // Don't throw error, just return null - we'll fall back to user's org_id
      return null
    }
  }

  const fetchOrganizationsList = async () => {
    const authToken = token || ""
    if (!authToken) {
      setOrganizationsError("Authentication required. Please log in.")
      setIsLoadingOrganizations(false)
      return
    }

    try {
      setIsLoadingOrganizations(true)
      setOrganizationsError(null)

      // Try org/list.php for all roles first (so we get real org names for teacher/principal/student)
      const API_URL = `${apiBase}/org/list.php`
      let organizations: Organisation[] = []

      try {
        const response = await fetch(API_URL, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
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
        }
      } catch (_) {
        // org/list.php may not be allowed for non-admin; fall back below
      }

      // For teacher/principal/student: if we have a list, keep it (names will show). If empty, use fallback so at least ID shows.
      if (organizations.length === 0 && (isTeacherOrPrincipal() || isStudent())) {
        const userOrgId = getUserOrganizationId()
        if (isTeacherOrPrincipal()) {
          const orgFromDashboard = await fetchOrganizationFromTeacherDashboard()
          if (orgFromDashboard) {
            organizations = [orgFromDashboard]
          } else if (userOrgId) {
            organizations = [{
              id: userOrgId,
              organisation_id: userOrgId,
              organization_id: userOrgId,
              organisation: `Organization ${userOrgId}`,
              name: `Organization ${userOrgId}`,
              organisation_name: `Organization ${userOrgId}`,
              organization_name: `Organization ${userOrgId}`,
            }]
          }
        } else if (isStudent() && userOrgId) {
          organizations = [{
            id: userOrgId,
            organisation_id: userOrgId,
            organization_id: userOrgId,
            organisation: `Organization ${userOrgId}`,
            name: `Organization ${userOrgId}`,
            organisation_name: `Organization ${userOrgId}`,
            organization_name: `Organization ${userOrgId}`,
          }]
        }
      }

      setOrganizationsList(organizations)
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
    { id: "dashboard", label: "Dashboard", icon: Briefcase, route: "/progress-dashboard", active: true },
    { id: "class-management", label: "Class Management", icon: Users, route: "/progress-dashboard/classes" },
    { id: "license-management", label: "License Management", icon: Shield, route: "/progress-dashboard/license" },
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
  
  // Check if logged-in user is teacher or principal
  const isTeacherOrPrincipal = () => {
    if (!authData?.user?.role) return false
    const userRole = (authData.user.role || "").toLowerCase()
    return userRole === "teacher" || userRole === "principal" || userRole.includes("teacher") || userRole.includes("principal")
  }

  // Check if logged-in user is administrator
  const isAdministrator = () => {
    if (!authData?.user?.role) return false
    const userRole = (authData.user.role || "").toLowerCase()
    return userRole === "administrator" || userRole.includes("admin")
  }

  // Check if logged-in user is student (hide Organization tab for them)
  const isStudent = () => {
    if (!authData?.user?.role) return false
    const userRole = (authData.user.role || "").toLowerCase()
    return userRole === "student" || userRole.includes("student")
  }

  // Get user's organization ID from auth data
  const getUserOrganizationId = () => {
    if (!authData?.user) return null
    return authData.user.organisation_id ? String(authData.user.organisation_id) : null
  }
  
  // Note: This component should be protected by ProtectedRoute, so token should always exist
  // If token is missing, API calls will fail (which is correct behavior)

  // API function to fetch users list
  const fetchUsersList = async (orgId?: string | null) => {
    const API_URL = `${apiBase}/users/list.php`
    
    try {
      setIsLoadingUsers(true)
      setUsersError(null)

      // Try GET first (most REST APIs use GET for list endpoints)
      let response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      // If GET returns 405, try POST as fallback
      if (!response.ok && response.status === 405) {
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
       }

       setUsersList(filteredUsers)

       // Initialize groupedByClass - will collect all classes from ALL users (students, teachers, etc.)
       const groupedByClass: Record<string, { students: ApiUser[], teacher: string, allUsers: ApiUser[] }> = {}
       const teacherByClass: Record<string, string> = {} // class name -> teacher name
       
       // First pass: Collect ALL unique classes from ALL users (students, teachers, etc.) and create class entries
       filteredUsers.forEach((user: ApiUser) => {
         // Get user's classes (class is an array)
         const userClasses = user.class || []
         const classArray = Array.isArray(userClasses) ? userClasses : [userClasses].filter(Boolean)
         
         if (classArray.length === 0) {
           return // Skip users with no class assignment
         }

         // Create class entries for all classes that have any users
         classArray.forEach((className: any) => {
           if (!className) return
           
           const classKey = String(className).trim()
           if (!classKey) return

           // Create class entry if it doesn't exist (with default "No teacher assigned")
           if (!groupedByClass[classKey]) {
             groupedByClass[classKey] = {
               students: [],
               teacher: "No teacher assigned",
               allUsers: []
             }
           }
         })
       })

       // Second pass: Map teachers to their classes (update teacher name if teacher exists)
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
               if (classKey) {
                 // Store teacher mapping
                 if (!teacherByClass[classKey]) {
                 teacherByClass[classKey] = teacherName
                 }
                 
                 // Update class entry with teacher name (create if doesn't exist from students)
                 if (!groupedByClass[classKey]) {
                   groupedByClass[classKey] = {
                     students: [],
                     teacher: teacherName,
                     allUsers: []
                   }
                 } else {
                   groupedByClass[classKey].teacher = teacherName
                 }
               }
             }
           })
         }
       })

       // Third pass: Add ALL users (students, teachers, etc.) to their classes
       let usersAddedCount = 0
       filteredUsers.forEach((user: ApiUser) => {
         const userRole = (user.role || "").toLowerCase()
         
         // Get user's classes (class is an array)
         const userClasses = user.class || []
         const classArray = Array.isArray(userClasses) ? userClasses : [userClasses].filter(Boolean)
         
         if (classArray.length === 0) {
           return // Skip users with no class assignment
         }

         // Add user to each of their classes (all classes now exist)
         classArray.forEach((className: any) => {
           if (!className) return
           
           const classKey = String(className).trim()
           if (!classKey) return

           // Add user to the class (class should exist from first pass)
           if (groupedByClass[classKey]) {
             // Add to allUsers array
             groupedByClass[classKey].allUsers.push(user)
             usersAddedCount++
             
             // Also add to students array if user is a student
             if (userRole !== "teacher" && userRole !== "principal" && userRole !== "administrator" && !userRole.includes("admin")) {
             groupedByClass[classKey].students.push(user)
           } else {
             }
           } else {
             // This should rarely happen, but handle edge case
             const isStudent = userRole !== "teacher" && userRole !== "principal" && userRole !== "administrator" && !userRole.includes("admin")
             groupedByClass[classKey] = {
               students: isStudent ? [user] : [],
               teacher: "No teacher assigned",
               allUsers: [user]
             }
             usersAddedCount++
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
         // Ensure students is always an array (defensive check)
         if (!Array.isArray(classData.students)) {
           console.error(`Missing or invalid students array for class "${key}". Current value:`, classData.students, "Type:", typeof classData.students)
           // Only reset if it's truly invalid - preserve existing array if it exists
           if (classData.students === null || classData.students === undefined) {
           groupedByClass[key].students = []
           } else {
             // Try to convert to array if it's not null/undefined
             groupedByClass[key].students = Array.isArray(classData.students) ? classData.students : []
           }
         }
         if (!Array.isArray(classData.allUsers)) {
           console.error(`Missing allUsers array for class "${key}":`, classData)
           if (classData.allUsers === null || classData.allUsers === undefined) {
             groupedByClass[key].allUsers = []
           } else {
             groupedByClass[key].allUsers = Array.isArray(classData.allUsers) ? classData.allUsers : []
           }
         }
       })
       
       setClassesData(groupedByClass)

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

  // API function to fetch teacher dashboard data (for admins with org, and for teachers/principals without param)
  const fetchTeacherDashboard = async (orgId?: string | null) => {
    const isAdmin = isAdministrator()
    const isTeacherOrPrincipalRole = isTeacherOrPrincipal()
    if (!isAdmin && !isTeacherOrPrincipalRole) return
    if (isAdmin && !orgId) return

    // Use token from login (from auth context)
    const authToken = token || ""
    if (!authToken) {
      console.error("No authentication token available. User must be logged in.")
      setTeacherDashboardError("Authentication required. Please log in.")
      return
    }

    // For admin: pass organisation_id as query param. For teacher/principal: no param (API uses their org)
    const API_URL = isAdmin && orgId
      ? `${apiBase}/teacher/dashboard.php?organisation_id=${encodeURIComponent(orgId)}`
      : `${apiBase}/teacher/dashboard.php`

    try {
      setIsLoadingTeacherDashboard(true)
      setTeacherDashboardError(null)


      // Try GET first
      let response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      })

      // If GET returns 405, try POST as fallback
      if (!response.ok && response.status === 405) {
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
        console.error(`Teacher Dashboard API Error (${response.status}):`, errorText)
        throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`)
      }

      const data = await response.json()

      // Parse response - handle different formats
      // The API response structure: { success: true, classes: [{ class_name: "9-A", students: [...] }] }
      let dashboardData: any = null
      if (data.success === true && data.classes) {
        // Direct structure: { success: true, classes: [...] }
        dashboardData = data
      } else if (data.success === true && data.data) {
        dashboardData = data.data
      } else if (data.data) {
        dashboardData = data.data
      } else if (data.success === true && data.dashboard) {
        dashboardData = data.dashboard
      } else if (data.dashboard) {
        dashboardData = data.dashboard
      } else if (data.classes) {
        // Direct classes array
        dashboardData = data
      } else {
        dashboardData = data
      }

      // Filter by organization only when we did NOT pass organisation_id in URL (e.g. legacy or multi-org response)
      const alreadyScopedByOrg = isAdmin && orgId
      if (orgId && dashboardData && !alreadyScopedByOrg) {
        if (Array.isArray(dashboardData)) {
          dashboardData = dashboardData.filter((item: any) => {
            const itemOrgId = item.organisation_id || item.organization_id || item.org_id
            return String(itemOrgId) === String(orgId)
          })
        } else if (dashboardData.classes && Array.isArray(dashboardData.classes)) {
          dashboardData = {
            ...dashboardData,
            classes: dashboardData.classes.filter((item: any) => {
              const itemOrgId = item.organisation_id || item.organization_id || item.org_id
              return String(itemOrgId) === String(orgId)
            })
          }
        }
      }

      // Store dashboard data organized by class and by user
      const classScores: Record<string, any> = {}
      const userScores: Record<string, any> = {}
      const classStudents: Record<string, any[]> = {} // Store students by class_name
      const classTeachers: Record<string, any[]> = {} // Store teachers by class_name (from API teachers array)

      // Helper function to extract scores from item
      const extractScores = (item: any) => {
        // Check if scores are in a nested "scores" object
        if (item.scores && typeof item.scores === "object") {
          return {
            speaking: (item.scores.speaking !== undefined && item.scores.speaking !== null) ? item.scores.speaking : (item.scores.speaking_score !== undefined && item.scores.speaking_score !== null ? item.scores.speaking_score : 0),
            reading: (item.scores.reading !== undefined && item.scores.reading !== null) ? item.scores.reading : (item.scores.reading_score !== undefined && item.scores.reading_score !== null ? item.scores.reading_score : 0),
            writing: (item.scores.writing !== undefined && item.scores.writing !== null) ? item.scores.writing : (item.scores.writing_score !== undefined && item.scores.writing_score !== null ? item.scores.writing_score : 0),
            listening: (item.scores.listening !== undefined && item.scores.listening !== null) ? item.scores.listening : (item.scores.listening_score !== undefined && item.scores.listening_score !== null ? item.scores.listening_score : 0),
          }
        }
        // Check for direct score properties
        return {
          speaking: (item.speaking !== undefined && item.speaking !== null) ? item.speaking : ((item.speaking_score !== undefined && item.speaking_score !== null) ? item.speaking_score : ((item.speakingScore !== undefined && item.speakingScore !== null) ? item.speakingScore : 0)),
          reading: (item.reading !== undefined && item.reading !== null) ? item.reading : ((item.reading_score !== undefined && item.reading_score !== null) ? item.reading_score : ((item.readingScore !== undefined && item.readingScore !== null) ? item.readingScore : 0)),
          writing: (item.writing !== undefined && item.writing !== null) ? item.writing : ((item.writing_score !== undefined && item.writing_score !== null) ? item.writing_score : ((item.writingScore !== undefined && item.writingScore !== null) ? item.writingScore : 0)),
          listening: (item.listening !== undefined && item.listening !== null) ? item.listening : ((item.listening_score !== undefined && item.listening_score !== null) ? item.listening_score : ((item.listeningScore !== undefined && item.listeningScore !== null) ? item.listeningScore : 0)),
        }
      }
      
      // Handle the structure: { classes: [{ class_name: "9-A", students: [...] }] }
      if (dashboardData.classes && Array.isArray(dashboardData.classes)) {
        dashboardData.classes.forEach((classItem: any) => {
          const className = classItem.class_name || classItem.class || classItem.className
          if (className && classItem.students && Array.isArray(classItem.students)) {
            const classKey = String(className).trim()
            
            // Store students for this class
            classStudents[classKey] = classItem.students.map((student: any) => {
              // Extract scores from the nested scores object
              const extractedScores = extractScores(student)
              const fullName = student.name || `${student.first_name || ""} ${student.last_name || ""}`.trim()
              // Generate email if not provided (for display purposes)
              const email = student.email || `${fullName.toLowerCase().replace(/\s+/g, ".")}@xeleratelearning.com`
              
              
              // Create student object with scores at top level
              // IMPORTANT: Set scores AFTER spread to ensure they override any existing values
              const studentObj: any = {
                ...student,
                id: student.id,
                first_name: student.first_name,
                last_name: student.last_name,
                name: fullName,
                email: email,
                role: student.role || "student",
                // Store the original scores object
                scores: student.scores || extractedScores,
                // CRITICAL: Set scores at top level - these must come AFTER spread to override
                // Use extracted scores directly (they handle undefined/null properly)
                speaking: extractedScores.speaking,
                reading: extractedScores.reading,
                writing: extractedScores.writing,
                listening: extractedScores.listening,
              }
              
              // Verify scores are set correctly
              return studentObj
            })
            
            // Store class-level data
            if (!classScores[classKey]) {
              classScores[classKey] = {
                class_name: className,
                student_count: classItem.students.length,
                ...classItem
              }
            }
            
            // Store user scores by ID
            classItem.students.forEach((student: any) => {
              const userId = student.id
              if (userId) {
                const scores = extractScores(student)
                userScores[String(userId)] = {
                  speaking: scores.speaking,
                  reading: scores.reading,
                  writing: scores.writing,
                  listening: scores.listening,
                  ...student
                }
              }
            })
          }
        })
        // Process teachers array from same API response: { class_name, teachers: [{ id, name, scores }] }
        if (dashboardData.teachers && Array.isArray(dashboardData.teachers)) {
          dashboardData.teachers.forEach((item: any) => {
            const className = item.class_name || item.class || item.className
            if (!className || !item.teachers || !Array.isArray(item.teachers)) return
            const classKey = String(className).trim()
            if (!classTeachers[classKey]) classTeachers[classKey] = []
            item.teachers.forEach((teacher: any) => {
              const extractedScores = extractScores(teacher)
              const fullName = teacher.name || `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim()
              const teacherObj: any = {
                ...teacher,
                id: teacher.id,
                first_name: teacher.first_name,
                last_name: teacher.last_name,
                name: fullName,
                email: teacher.email || "",
                role: "teacher",
                scores: teacher.scores || extractedScores,
                speaking: extractedScores.speaking,
                reading: extractedScores.reading,
                writing: extractedScores.writing,
                listening: extractedScores.listening,
              }
              classTeachers[classKey].push(teacherObj)
              const userId = teacher.id
              if (userId) {
                userScores[String(userId)] = {
                  speaking: extractedScores.speaking,
                  reading: extractedScores.reading,
                  writing: extractedScores.writing,
                  listening: extractedScores.listening,
                  ...teacherObj,
                }
              }
            })
          })
        }
      } else if (Array.isArray(dashboardData)) {
        dashboardData.forEach((item: any) => {
          const className = item.class || item.class_name || item.className
          const userEmail = item.email || item.user_email
          const userId = item.id || item.user_id || item.userId
          
          // Store by class
          if (className) {
            const classKey = String(className).trim()
            if (!classScores[classKey]) {
              const scores = extractScores(item)
              classScores[classKey] = {
                overall_score: item.overall_score || item.overallScore || 0,
                speaking_score: scores.speaking,
                reading_score: scores.reading,
                writing_score: scores.writing,
                listening_score: scores.listening,
                student_count: item.student_count || item.studentCount || 0,
                ...item
              }
            }
          }
          
          // Store by user (email or ID)
          if (userEmail || userId) {
            const userKey = userEmail ? String(userEmail).toLowerCase() : String(userId)
            const scores = extractScores(item)
            userScores[userKey] = {
              speaking: scores.speaking,
              reading: scores.reading,
              writing: scores.writing,
              listening: scores.listening,
              overall_score: item.overall_score || item.overallScore || 0,
              ...item
            }
          }
        })
      } else if (dashboardData && typeof dashboardData === "object") {
        // Handle object format - might have classes array or direct class data
        if (dashboardData.classes && Array.isArray(dashboardData.classes)) {
          dashboardData.classes.forEach((item: any) => {
            const className = item.class || item.class_name || item.className
            const userEmail = item.email || item.user_email
            const userId = item.id || item.user_id || item.userId
            
            if (className) {
              const classKey = String(className).trim()
              const scores = extractScores(item)
              classScores[classKey] = {
                overall_score: item.overall_score || item.overallScore || 0,
                speaking_score: scores.speaking,
                reading_score: scores.reading,
                writing_score: scores.writing,
                listening_score: scores.listening,
                student_count: item.student_count || item.studentCount || 0,
                ...item
              }
            }
            
            // Store by user
            if (userEmail || userId) {
              const userKey = userEmail ? String(userEmail).toLowerCase() : String(userId)
              const scores = extractScores(item)
              userScores[userKey] = {
                speaking: scores.speaking,
                reading: scores.reading,
                writing: scores.writing,
                listening: scores.listening,
                overall_score: item.overall_score || item.overallScore || 0,
                ...item
              }
            }
          })
        } else if (dashboardData.students && Array.isArray(dashboardData.students)) {
          // Handle students array format
          dashboardData.students.forEach((item: any) => {
            const userEmail = item.email || item.user_email
            const userId = item.id || item.user_id || item.userId
            const className = item.class || item.class_name || item.className
            
            // Store by class
            if (className) {
              const classKey = String(className).trim()
              if (!classScores[classKey]) {
                const scores = extractScores(item)
                classScores[classKey] = {
                  overall_score: item.overall_score || item.overallScore || 0,
                  speaking_score: scores.speaking,
                  reading_score: scores.reading,
                  writing_score: scores.writing,
                  listening_score: scores.listening,
                  student_count: dashboardData.students.length || 0,
                }
              }
            }
            
            // Store by user
            if (userEmail || userId) {
              const userKey = userEmail ? String(userEmail).toLowerCase() : String(userId)
              const scores = extractScores(item)
              userScores[userKey] = {
                speaking: scores.speaking,
                reading: scores.reading,
                writing: scores.writing,
                listening: scores.listening,
                overall_score: item.overall_score || item.overallScore || 0,
                ...item
              }
            }
          })
        } else {
          // Direct class data in object format
          Object.keys(dashboardData).forEach((key) => {
            const item = dashboardData[key]
            if (item && typeof item === "object") {
              const className = item.class || item.class_name || item.className || key
              const classKey = String(className).trim()
              const scores = extractScores(item)
              classScores[classKey] = {
                overall_score: item.overall_score || item.overallScore || 0,
                speaking_score: scores.speaking,
                reading_score: scores.reading,
                writing_score: scores.writing,
                listening_score: scores.listening,
                student_count: item.student_count || item.studentCount || 0,
                ...item
              }
            }
          })
        }
      }

      setTeacherDashboardData(classScores)
      setTeacherDashboardUserScores(userScores)
      
      // Store students and teachers by class for direct table display
      const allClassKeys = new Set([...Object.keys(classStudents), ...Object.keys(classTeachers)])
      if (allClassKeys.size > 0) {
        // Update classesData with students and teachers from teacher dashboard
        const updatedClassesData: Record<string, { students: ApiUser[], teacher: string, allUsers: ApiUser[] }> = {}
        allClassKeys.forEach((classKey) => {
          const students = classStudents[classKey] || []
          const teachers = classTeachers[classKey] || []
          const allUsers = [...students, ...teachers]
          updatedClassesData[classKey] = {
            students: students,
            teacher: teachers.length > 0 ? (teachers[0].name || "Teacher") : "Teacher", // Will be updated from users list if available
            allUsers: allUsers
          }
        })
        // Merge with existing classesData (preserve teacher info from users list)
        Object.keys(updatedClassesData).forEach((classKey) => {
          if (classesData[classKey]) {
            updatedClassesData[classKey].teacher = classesData[classKey].teacher || "Teacher"
          }
        })
        setClassesData(prev => {
          // Merge properly: preserve existing allUsers and students, but update with teacher dashboard data
          const merged: Record<string, any> = { ...prev }
          
          Object.keys(updatedClassesData).forEach(classKey => {
            const newClassData = updatedClassesData[classKey]
            const existingClassData = prev[classKey]
            
            if (existingClassData) {
              // Merge: combine existing allUsers with new students from teacher dashboard
              const existingAllUsers = existingClassData.allUsers || []
              const newStudents = newClassData.allUsers || []
              
              // Create a map to avoid duplicates (by ID or email)
              const userMap = new Map()
              
              // Add existing users first
              existingAllUsers.forEach((user: any) => {
                const key = user.id || user.user_id || user.email
                if (key) userMap.set(String(key), user)
              })
              
              // Add/update with teacher dashboard users (they have scores)
              newStudents.forEach((user: any) => {
                const key = user.id || user.user_id || user.email
                if (key) {
                  // If user exists, merge scores; otherwise add new user
                  const existing = userMap.get(String(key))
                  if (existing) {
                    // Merge: keep existing data but update scores
                    userMap.set(String(key), {
                      ...existing,
                      ...user, // Teacher dashboard data (with scores) takes precedence
                      speaking: user.speaking !== undefined ? user.speaking : existing.speaking,
                      reading: user.reading !== undefined ? user.reading : existing.reading,
                      writing: user.writing !== undefined ? user.writing : existing.writing,
                      listening: user.listening !== undefined ? user.listening : existing.listening,
                      scores: user.scores || existing.scores,
                    })
                  } else {
                    userMap.set(String(key), user)
                  }
                }
              })
              
              merged[classKey] = {
                ...existingClassData,
                ...newClassData,
                allUsers: Array.from(userMap.values()),
                students: Array.from(userMap.values()).filter((u: any) => {
                  const role = (u.role || "").toLowerCase()
                  return role !== "teacher" && role !== "principal" && role !== "administrator" && !role.includes("admin")
                }),
                teacher: newClassData.teacher || existingClassData.teacher,
              }
            } else {
              // New class, just add it
              merged[classKey] = newClassData
            }
          })
          
          return merged
        })
      }
      
      return classScores
    } catch (error: any) {
      console.error("Error fetching teacher dashboard:", error)
      setTeacherDashboardError(error.message || "Failed to load teacher dashboard data")
      setTeacherDashboardData({})
      setTeacherDashboardUserScores({})
      throw error
    } finally {
      setIsLoadingTeacherDashboard(false)
    }
  }

  // Fetch current user's overall scores for My Analysis (users/overall_results.php)
  const fetchMyOverallResults = async () => {
    const userId = authData?.user?.id
    if (!userId || !API_TOKEN) return
    const API_URL = `${apiBase}/users/overall_results.php?user_id=${encodeURIComponent(String(userId))}`
    setIsLoadingMyOverall(true)
    setMyOverallError(null)
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
      // API returns { scores_percent: { listening, speaking, reading, writing } }; also support data/scores/flat
      const raw = data?.scores_percent ?? data?.data?.scores ?? data?.data ?? data?.scores ?? data
      const listening = raw?.listening ?? raw?.listening_score
      const speaking = raw?.speaking ?? raw?.speaking_score
      const reading = raw?.reading ?? raw?.reading_score
      const writing = raw?.writing ?? raw?.writing_score
      setMyOverallScores({
        listening: typeof listening === "number" ? listening : null,
        speaking: typeof speaking === "number" ? speaking : null,
        reading: typeof reading === "number" ? reading : null,
        writing: typeof writing === "number" ? writing : null,
      })
    } catch (error: any) {
      console.error("Error fetching my overall results:", error)
      setMyOverallError(error.message || "Failed to load overall scores")
      setMyOverallScores(null)
    } finally {
      setIsLoadingMyOverall(false)
    }
  }

  // API function to fetch Reading results
  const fetchReadingResults = async () => {
    const API_URL = `${apiBase}/reading/list-results.php`
    
    try {
      // Based on 405 error, the endpoint might not accept POST with empty body
      // Try GET first (most list endpoints use GET)
      let response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      // If GET returns 405, try POST with empty body (similar to listening/get-result.php pattern)
      if (response.status === 405) {
        response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
          },
          body: "",
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
      return data
    } catch (error: any) {
      console.error("Error fetching reading results:", error)
      throw error
    }
  }

  // API function to fetch Writing results
  const fetchWritingResults = async () => {
    const API_URL = `${apiBase}/writing/list-results.php`
    
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
      return data
    } catch (error: any) {
      console.error("Error fetching writing results:", error)
      throw error
    }
  }

  // API function to fetch Listening results
  const fetchListeningResults = async () => {
    const API_URL = `${apiBase}/listening/list-results.php`
    
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
      return data
    } catch (error: any) {
      console.error("Error fetching listening results:", error)
      throw error
    }
  }

  // API function to fetch Speaking results
  const fetchSpeakingResults = async () => {
    const API_URL = `${apiBase}/speaking/list-results.php`
    
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
      return data
    } catch (error: any) {
      console.error("Error fetching speaking results:", error)
      throw error
    }
  }

  // Combined API function to fetch all skill results in parallel
  const fetchAllSkillResults = async () => {
    setIsLoadingAllSkills(true)
    
    try {
      
      // Fetch all skills in parallel using Promise.allSettled to handle partial failures
      const [readingResult, writingResult, listeningResult, speakingResult] = await Promise.allSettled([
        fetchReadingResults().catch(err => {
          return { success: false, data: [], error: err.message }
        }),
        fetchWritingResults().catch(err => {
          return { success: false, data: [], error: err.message }
        }),
        fetchListeningResults().catch(err => {
          return { success: false, data: [], error: err.message }
        }),
        fetchSpeakingResults().catch(err => {
          return { success: false, data: [], error: err.message }
        })
      ])

      // Helper function to extract results from response
      const extractResults = (result: PromiseSettledResult<any>): any[] => {
        if (result.status === 'rejected') {
          console.error("Promise rejected:", result.reason)
          return []
        }
        
        const response = result.value
        if (!response || typeof response !== "object") {
          return []
        }

      // Handle different response formats
        if (response.success === true && Array.isArray(response.data)) {
          return response.data
        } else if (response.success === true && Array.isArray(response.items)) {
          return response.items
        } else if (Array.isArray(response.data)) {
          return response.data
        } else if (Array.isArray(response.items)) {
          return response.items
        } else if (Array.isArray(response.results)) {
          return response.results
        } else if (Array.isArray(response)) {
          return response
        }
        
        return []
      }

      // Extract results from each skill
      const readingResults = extractResults(readingResult)
      const writingResults = extractResults(writingResult)
      const listeningResults = extractResults(listeningResult)
      const speakingResults = extractResults(speakingResult)

      // Store all results
      const combinedResults = {
        reading: readingResults,
        writing: writingResults,
        listening: listeningResults,
        speaking: speakingResults
      }

      setAllSkillResults(combinedResults)
      
      return combinedResults
    } catch (error: any) {
      console.error("Error fetching all skill results:", error)
      // Set empty results on error
      setAllSkillResults({
        reading: [],
        writing: [],
        listening: [],
        speaking: []
      })
      throw error
    } finally {
      setIsLoadingAllSkills(false)
    }
  }

  // Load skill results when skill is selected (uses cached results from fetchAllSkillResults)
  const loadSkillResults = async (skill: "speaking" | "reading" | "writing" | "listening") => {
    setIsLoadingResults(true)
    setResultsError(null)
    
    try {
      // Check if we have organization/class selected and might need to filter
      
      // Check if we have cached results, if not fetch all skills first
      let allResults: any[] = []
      
      if (allSkillResults[skill] && allSkillResults[skill].length >= 0) {
        // Use cached results
        allResults = allSkillResults[skill]
      } else {
        // Fetch all skills if not cached
        await fetchAllSkillResults()
        allResults = allSkillResults[skill] || []
      }

      // Filter results based on activeFilter
      let filteredResults = allResults
      
      // If "My Analysis" is active, filter by logged-in user
      if (activeFilter === "My Analysis" && authData?.user) {
        const loggedInUserId = authData.user.id
        const loggedInUserEmail = authData.user.email?.toLowerCase()
        const loggedInUserFirstName = authData.user.first_name?.toLowerCase()
        const loggedInUserLastName = authData.user.last_name?.toLowerCase()

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
    const API_URL = `${apiBase}/reading/get-result.php?id=${id}`
    
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
    const API_URL = `${apiBase}/writing/get-result.php?id=${id}`
    
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
      console.error("Error fetching writing result:", error)
      throw error
    }
  }

  // API function to fetch Listening result by ID
  const fetchListeningResultById = async (id: number | string) => {
    const API_URL = `${apiBase}/listening/get-result.php?id=${id}`
    
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
    const API_URL = `${apiBase}/speaking/get-result.php?id=${id}`
    
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

  // Effect to fetch organizations when we have a token (required for API auth)
  useEffect(() => {
    if (!token) return
    fetchOrganizationsList().catch((error) => {
      console.error("Failed to fetch organizations on mount:", error)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Effect to restore dashboard state when coming back from StudentDetailsPage (org, class, skill, fromSection)
  useEffect(() => {
    const state = (location as any).state || {}
    let fromStorage: { selectedOrganization?: string; selectedClass?: string; fromSection?: "my-analysis" | "organization" } = {}
    try {
      const stored = sessionStorage.getItem("progressDashboardReturnState")
      if (stored) {
        fromStorage = JSON.parse(stored)
        sessionStorage.removeItem("progressDashboardReturnState")
      }
    } catch (_) {}

    const restoredOrg = state.selectedOrganization ?? fromStorage.selectedOrganization
    const restoredClass = state.selectedClass ?? fromStorage.selectedClass
    const selectedSkill = state.selectedSkill
    const fromSection = state.fromSection ?? fromStorage.fromSection

    let didRestore = false

    if (restoredOrg) {
      setSelectedOrganization(restoredOrg)
      didRestore = true
    }
    if (restoredClass !== undefined && restoredClass !== null) {
      setSelectedClass(restoredClass)
      didRestore = true
    }
    // Restore the tab we came from: My Analysis vs Select Organization
    if (fromSection === "my-analysis") {
      setActiveFilter("My Analysis")
    } else if (restoredOrg != null || restoredClass !== undefined) {
      setActiveFilter("Select Organization")
    }
    if (selectedSkill) {
      const skillToSelect = selectedSkill as "speaking" | "reading" | "writing" | "listening"
      setActiveSkill(skillToSelect)
      loadSkillResults(skillToSelect).catch((error) => {
        console.error("Failed to load skill results:", error)
      })
      setTimeout(() => {
        const element = document.getElementById("detailed-analysis")
        if (element) element.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
      didRestore = true
    }

    if (didRestore) {
      setTimeout(() => window.history.replaceState({}, document.title), 0)
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
        setSelectedOrganization("")
        setClassesData({})
        setUsersList([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationsList])

  // Effect to auto-select organization for teachers/principals/students (so header and dropdown show org name)
  useEffect(() => {
    if (!selectedOrganization && organizationsList.length > 0) {
      const userOrgId = getUserOrganizationId()
      if (userOrgId) {
        const orgExists = organizationsList.some((org) => {
          const oId1 = org.id ? String(org.id) : null
          const oId2 = org.organisation_id ? String(org.organisation_id) : null
          const oId3 = org.organization_id ? String(org.organization_id) : null
          return oId1 === userOrgId || oId2 === userOrgId || oId3 === userOrgId
        })
        if (orgExists) {
          setSelectedOrganization(userOrgId)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData?.user, organizationsList])

  // Effect to automatically fetch users when organization is selected
  useEffect(() => {
    if (selectedOrganization && organizationsList.length > 0) {
      // Verify organization exists before fetching
      const orgExists = organizationsList.some((org) => {
        const oId1 = org.id ? String(org.id) : null
        const oId2 = org.organisation_id ? String(org.organisation_id) : null
        const oId3 = org.organization_id ? String(org.organization_id) : null
        const searchId = String(selectedOrganization)
        return oId1 === searchId || oId2 === searchId || oId3 === searchId
      })
      
      if (orgExists) {
        fetchUsersList(selectedOrganization).catch((error) => {
          console.error("Failed to fetch users list:", error)
        })
        
        // Pre-fetch all skill results when organization is selected
        fetchAllSkillResults().catch((error) => {
          console.error("Failed to fetch all skill results:", error)
        })
        
        // Fetch teacher dashboard: for admin pass org_id; for teacher/principal no param (API uses their org)
        if (isAdministrator()) {
          fetchTeacherDashboard(selectedOrganization).catch((error) => {
            console.error("Failed to fetch teacher dashboard:", error)
          })
        } else if (isTeacherOrPrincipal()) {
          fetchTeacherDashboard(selectedOrganization).catch((error) => {
            console.error("Failed to fetch teacher dashboard:", error)
          })
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganization, organizationsList])

  // Effect to refresh data when class is selected (so table shows teacher/student scores, not 0)
  useEffect(() => {
    if (selectedClass && selectedOrganization) {
      const needsData = !classesData[selectedClass]?.allUsers?.length
      if (needsData) {
        fetchUsersList(selectedOrganization).catch((error) => {
          console.error("Failed to fetch users list for class:", error)
        })
      }
      // Always refetch teacher dashboard when class is selected so scores are present (admin + teacher/principal)
      fetchTeacherDashboard(selectedOrganization).catch((error) => {
        console.error("Failed to fetch teacher dashboard for class:", error)
      })
      fetchAllSkillResults().catch((error) => {
        console.error("Failed to refresh skill results for class:", error)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedOrganization])

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

  // When My Analysis is active (or user is student), fetch current user's overall scores from users/overall_results.php
  useEffect(() => {
    if (!authData?.user?.id) return
    const shouldFetch = activeFilter === "My Analysis" || isStudent()
    if (!shouldFetch) return
    fetchMyOverallResults().catch((error) => {
      console.error("Failed to fetch my overall results:", error)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, authData?.user?.id])

  // When My Analysis is active, also ensure teacher dashboard is loaded (fallback for scores)
  useEffect(() => {
    if (activeFilter !== "My Analysis" || !authData?.user) return
    const orgId = isAdministrator()
      ? (authData.user.organisation_id != null ? String(authData.user.organisation_id) : selectedOrganization)
      : selectedOrganization
    if (orgId) {
      fetchTeacherDashboard(orgId).catch((error) => {
        console.error("Failed to fetch teacher dashboard for My Analysis:", error)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, authData?.user?.id, authData?.user?.organisation_id, selectedOrganization])

  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .edu-sidebar {
              position: fixed !important;
              left: ${sidebarCollapsed ? "-280px" : "0"} !important;
              z-index: 1000 !important;
              height: 100vh !important;
              overflow-y: auto !important;
            }
            .edu-main-content {
              margin-left: 0 !important;
              width: 100% !important;
            }
            .edu-overlay {
              display: ${sidebarCollapsed ? "none" : "block"} !important;
            }
          }
        `}
      </style>
      <div
        className="edu-overlay"
        onClick={() => setSidebarCollapsed(true)}
        style={{
          display: isMobile && !sidebarCollapsed ? "block" : "none",
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 999,
        }}
      />
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
        className="edu-sidebar"
        style={{
          width: sidebarCollapsed ? "80px" : "280px",
          backgroundColor: "#1E3A8A",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease, left 0.3s ease",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: isMobile ? (sidebarCollapsed ? "-280px" : "0") : "auto",
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
                cursor: "pointer",
              }}
              onClick={() => navigate("/skills-home")}
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
          {menuItems.filter((item) => {
            const userRole = (authData?.user?.role || "").toLowerCase()
            if (item.id === "license-management") {
              return userRole === "administrator" || userRole.includes("admin")
            }
            if (item.id === "class-management") {
              return userRole === "principal" || userRole.includes("principal") ||
                userRole === "teacher" || userRole.includes("teacher") ||
                userRole === "administrator" || userRole.includes("admin")
            }
            return true
          }).map((item) => {
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
        className="edu-main-content"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          marginLeft: isMobile ? 0 : undefined,
          transition: "margin-left 0.3s ease",
          width: isMobile ? "100%" : undefined,
        }}
      >
        {isMobile && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            style={{
              position: "fixed",
              top: "16px",
              left: "16px",
              zIndex: 1001,
              backgroundColor: "#1E3A8A",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "10px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Menu style={{ width: "24px", height: "24px" }} />
          </button>
        )}
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
                 Organization: {getDisplayOrganizationName(getUserOrganizationId())}
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

          {/* My Analysis Section - for Student role only (no tabs, no organization selector) */}
          {isStudent() && (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#1E3A8A", margin: 0, marginBottom: "16px" }}>
              My Analysis
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)", margin: 0, marginBottom: "16px" }}>
              View your personal analytics and progress
            </p>
            <div style={{ marginTop: "16px", marginBottom: "24px" }}>
              {isLoadingMyOverall && (
                <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)", marginBottom: "12px" }}>
                  Loading overall scores...
                </p>
              )}
              {myOverallError && !isLoadingMyOverall && (
                <p style={{ fontSize: "14px", color: "#DC2626", marginBottom: "12px" }}>{myOverallError}</p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                {[
                  { key: "listening", label: "Listening", icon: Headphones, value: myAnalysisScores?.listening },
                  { key: "speaking", label: "Speaking", icon: Mic2, value: myAnalysisScores?.speaking },
                  { key: "reading", label: "Reading", icon: BookOpen, value: myAnalysisScores?.reading },
                  { key: "writing", label: "Writing", icon: PenTool, value: myAnalysisScores?.writing },
                ].map(({ key, label, icon: Icon, value }) => (
                  <div
                    key={key}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid rgba(30, 58, 138, 0.2)",
                      backgroundColor: "#FFFFFF",
                      textAlign: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                  >
                    <Icon style={{ width: "24px", height: "24px", color: "#1E3A8A", margin: "0 auto 8px", display: "block" }} />
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "rgba(30, 58, 138, 0.8)", marginBottom: "4px" }}>{label}</div>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "#1E3A8A" }}>
                      {isLoadingMyOverall ? "…" : typeof value === "number" ? `${value}%` : "—"}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => {
                  if (!authData?.user) return
                  const u = authData.user
                  const studentDataToPass = {
                    id: u.id,
                    user_id: u.id,
                    userId: u.id,
                    email: u.email,
                    first_name: u.first_name,
                    last_name: u.last_name,
                    name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "User",
                    studentName: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "User",
                    listening: myAnalysisScores?.listening,
                    speaking: myAnalysisScores?.speaking,
                    reading: myAnalysisScores?.reading,
                    writing: myAnalysisScores?.writing,
                    skill: "speaking" as const,
                  }
                  const returnState = { selectedOrganization: selectedOrganization || undefined, selectedClass: selectedClass || undefined }
                  const fromSection = "my-analysis"
                  try {
                    sessionStorage.setItem("progressDashboardReturnState", JSON.stringify({ ...returnState, fromSection }))
                  } catch (_) {}
                  const studentId = u.id ?? u.user_id
                  navigate(studentId ? `/progress-dashboard/students/${studentId}` : "/progress-dashboard/students", {
                    state: { studentData: studentDataToPass, returnState, fromSection },
                  })
                }}
                style={{ backgroundColor: "#1E3A8A", color: "#FFFFFF", border: "none" }}
              >
                <Eye style={{ width: "18px", height: "18px", marginRight: "8px", verticalAlign: "middle" }} />
                View my details
              </Button>
            </div>
          </div>
          )}

          {/* Organization Section - for Teacher, Principal, Administrator (tabs: My Analysis / Select Organization) */}
          {!isStudent() && (
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

            {activeFilter === "My Analysis" && (
              <div style={{ marginTop: "16px", marginBottom: "24px" }}>
                {isLoadingMyOverall && (
                  <p style={{ fontSize: "14px", color: "rgba(30, 58, 138, 0.7)", marginBottom: "12px" }}>
                    Loading overall scores...
                  </p>
                )}
                {myOverallError && !isLoadingMyOverall && (
                  <p style={{ fontSize: "14px", color: "#DC2626", marginBottom: "12px" }}>
                    {myOverallError}
                  </p>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "16px",
                    marginBottom: "20px",
                  }}
                >
                  {[
                    { key: "listening", label: "Listening", icon: Headphones, value: myAnalysisScores?.listening },
                    { key: "speaking", label: "Speaking", icon: Mic2, value: myAnalysisScores?.speaking },
                    { key: "reading", label: "Reading", icon: BookOpen, value: myAnalysisScores?.reading },
                    { key: "writing", label: "Writing", icon: PenTool, value: myAnalysisScores?.writing },
                  ].map(({ key, label, icon: Icon, value }) => (
                    <div
                      key={key}
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(30, 58, 138, 0.2)",
                        backgroundColor: "#FFFFFF",
                        textAlign: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <Icon style={{ width: "24px", height: "24px", color: "#1E3A8A", margin: "0 auto 8px", display: "block" }} />
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "rgba(30, 58, 138, 0.8)", marginBottom: "4px" }}>
                        {label}
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: "#1E3A8A" }}>
                        {isLoadingMyOverall ? "…" : typeof value === "number" ? `${value}%` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    if (!authData?.user) return
                    const u = authData.user
                    const studentDataToPass = {
                      id: u.id,
                      user_id: u.id,
                      userId: u.id,
                      email: u.email,
                      first_name: u.first_name,
                      last_name: u.last_name,
                      name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "User",
                      studentName: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "User",
                      listening: myAnalysisScores?.listening,
                      speaking: myAnalysisScores?.speaking,
                      reading: myAnalysisScores?.reading,
                      writing: myAnalysisScores?.writing,
                      skill: "speaking" as const,
                    }
                    const returnState = { selectedOrganization: selectedOrganization || undefined, selectedClass: selectedClass || undefined }
                    const fromSection = "my-analysis"
                    try {
                      sessionStorage.setItem("progressDashboardReturnState", JSON.stringify({ ...returnState, fromSection }))
                    } catch (_) {}
                    const studentId = u.id ?? u.user_id
                    navigate(studentId ? `/progress-dashboard/students/${studentId}` : "/progress-dashboard/students", {
                      state: { studentData: studentDataToPass, returnState, fromSection },
                    })
                  }}
                  style={{
                    backgroundColor: "#1E3A8A",
                    color: "#FFFFFF",
                    border: "none",
                  }}
                >
                  <Eye style={{ width: "18px", height: "18px", marginRight: "8px", verticalAlign: "middle" }} />
                  View my details
                </Button>
              </div>
            )}
            
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
                 {isTeacherOrPrincipal() ? (
                   // For teachers/principals, show their organization (read-only)
                   <div
                     style={{
                       padding: "10px 12px",
                       borderRadius: "8px",
                       border: "1px solid rgba(30, 58, 138, 0.2)",
                       fontSize: "14px",
                       color: "#1E3A8A",
                       backgroundColor: "#F3F4F6",
                       fontWeight: "500",
                     }}
                   >
                     {selectedOrganization ? getDisplayOrganizationName(selectedOrganization) : "Loading organization..."}
                   </div>
                 ) : (
                   // For administrators, show search-and-select organization dropdown
                   <div
                     ref={orgDropdownRef}
                     style={{ position: "relative", width: "100%", maxWidth: "400px" }}
                   >
                     <input
                       type="text"
                       value={orgDropdownOpen ? orgSearchTerm : (selectedOrganization ? getDisplayOrganizationName(selectedOrganization) : "")}
                       onChange={(e) => {
                         setOrgSearchTerm(e.target.value)
                         setOrgDropdownOpen(true)
                       }}
                       onFocus={() => {
                         setOrgDropdownOpen(true)
                         setOrgSearchTerm("")
                       }}
                       placeholder={isLoadingOrganizations ? "Loading organizations..." : "Search or select organization"}
                       disabled={isLoadingOrganizations}
                       style={{
                         width: "100%",
                         padding: "10px 12px 10px 36px",
                         borderRadius: "8px",
                         border: "1px solid rgba(30, 58, 138, 0.2)",
                         fontSize: "14px",
                         color: "#1E3A8A",
                         backgroundColor: "#FFFFFF",
                         opacity: isLoadingOrganizations ? 0.6 : 1,
                         cursor: isLoadingOrganizations ? "not-allowed" : "text",
                         boxSizing: "border-box",
                       }}
                     />
                     <span
                       style={{
                         position: "absolute",
                         left: "12px",
                         top: "50%",
                         transform: "translateY(-50%)",
                         pointerEvents: "none",
                         color: "rgba(30, 58, 138, 0.5)",
                       }}
                     >
                       <ChevronDown style={{ width: "16px", height: "16px" }} />
                     </span>
                     {orgDropdownOpen && !isLoadingOrganizations && (() => {
                       const options = organizationsList
                         .map((org) => {
                           const orgId = org.id || org.organisation_id || org.organization_id
                           if (!orgId) return null
                           const orgName = org.organisation || org.name || org.organisation_name || org.organization_name || org.org_name || org.title || null
                           const displayName = !orgName || !orgName.trim() || orgName === String(orgId) ? `Organization ${orgId}` : orgName
                           return { orgId: String(orgId), displayName }
                         })
                         .filter((x): x is { orgId: string; displayName: string } => x !== null)
                         .filter(({ displayName }) => !orgSearchTerm || displayName.toLowerCase().includes(orgSearchTerm.toLowerCase()))
                       return (
                         <ul
                           style={{
                             position: "absolute",
                             top: "100%",
                             left: 0,
                             right: 0,
                             margin: 0,
                             marginTop: "4px",
                             padding: 0,
                             listStyle: "none",
                             maxHeight: "240px",
                             overflowY: "auto",
                             backgroundColor: "#FFFFFF",
                             border: "1px solid rgba(30, 58, 138, 0.2)",
                             borderRadius: "8px",
                             boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                             zIndex: 50,
                           }}
                         >
                           {options.length === 0 ? (
                             <li style={{ padding: "12px", fontSize: "14px", color: "rgba(30, 58, 138, 0.6)" }}>
                               No organizations match your search
                             </li>
                           ) : (
                             options.map(({ orgId, displayName }) => (
                               <li
                                 key={orgId}
                                 onClick={async () => {
                                   setSelectedOrganization(orgId)
                                   setSelectedClass(null)
                                   setSelectedStudent(null)
                                   setClassesData({})
                                   setUsersList([])
                                   setOrgDropdownOpen(false)
                                   setOrgSearchTerm("")
                                   try {
                                     await fetchUsersList(orgId)
                                   } catch (error) {
                                     console.error("Failed to fetch users list:", error)
                                   }
                                 }}
                                 style={{
                                   padding: "10px 12px",
                                   fontSize: "14px",
                                   color: "#1E3A8A",
                                   cursor: "pointer",
                                   borderBottom: "1px solid rgba(30, 58, 138, 0.08)",
                                 }}
                                 onMouseEnter={(e) => {
                                   e.currentTarget.style.backgroundColor = "rgba(30, 58, 138, 0.08)"
                                 }}
                                 onMouseLeave={(e) => {
                                   e.currentTarget.style.backgroundColor = "transparent"
                                 }}
                               >
                                 {displayName}
                               </li>
                             ))
                           )}
                         </ul>
                       )
                     })()}
                   </div>
                 )}
                 {organizationsError && (
                   <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "8px" }}>
                     Error loading organizations: {organizationsError}
                   </p>
                 )}
              </div>
            )}

              {/* Classes - only in Select Organization view */}
              {activeFilter === "Select Organization" && selectedOrganization && (
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
                         const teacherDashboardScores = teacherDashboardData[className] || {}
                         const overallScore = isTeacherOrPrincipal() && teacherDashboardScores.overall_score !== undefined 
                           ? teacherDashboardScores.overall_score 
                           : null
                         
                         // Debug logging
                         if (!classData) {
                         } else if (!Array.isArray(classData.students)) {
                         } else {
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
                             {isTeacherOrPrincipal() && overallScore !== null && (
                               <p style={{ fontSize: "14px", color: "#3B82F6", fontWeight: "600", marginTop: "8px" }}>
                                 Overall Score: {typeof overallScore === "number" ? `${overallScore.toFixed(1)}%` : overallScore}
                               </p>
                             )}
                           </div>
                         )
                       })}
                    </div>
                  )}
                </div>
              )}
          </div>
          )}

          {/* Skill Buttons Section - only in Select Organization view */}
          {SHOW_SKILLS_TAB && activeFilter === "Select Organization" && (
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
          )}

          {/* Detailed Analysis Section - only in Select Organization view when skill or class is selected */}
          {activeFilter === "Select Organization" && (activeSkill || selectedClass) && (
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
                          ROLE
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
                  {(isLoadingResults || (selectedClass && isLoadingUsers) || (selectedClass && isLoadingAllSkills)) ? (
                    <tr>
                      <td colSpan={(() => {
                        if (selectedClass && !selectedStudent && !activeSkill) {
                          const hasSkillResults = tableData.length > 0 && tableData[0]?.type === "skill-result"
                          return hasSkillResults ? 6 : (isTeacherOrPrincipal() ? 8 : 7)
                        }
                        return activeSkill ? getTableColumns().length + 1 : 7
                      })()} style={{ padding: "24px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                        {selectedClass && (isLoadingUsers || isLoadingAllSkills) ? "Loading data..." : "Loading..."}
                      </td>
                    </tr>
                  ) : (resultsError || (selectedClass && usersError)) ? (
                    <tr>
                      <td colSpan={(() => {
                        if (selectedClass && !selectedStudent && !activeSkill) {
                          const hasSkillResults = tableData.length > 0 && tableData[0]?.type === "skill-result"
                          return hasSkillResults ? 6 : (isTeacherOrPrincipal() ? 8 : 7)
                        }
                        return activeSkill ? getTableColumns().length + 1 : 7
                      })()} style={{ padding: "24px", textAlign: "center", color: "#EF4444" }}>
                        Error: {resultsError || usersError}
                      </td>
                    </tr>
                  ) : tableData.length === 0 ? (
                    <tr>
                      <td colSpan={(() => {
                        if (selectedClass && !selectedStudent && !activeSkill) {
                          return isTeacherOrPrincipal() ? 8 : 7
                        }
                        return activeSkill ? getTableColumns().length + 1 : 7
                      })()} style={{ padding: "24px", textAlign: "center", color: "rgba(30, 58, 138, 0.6)" }}>
                        {selectedClass ? (isLoadingUsers || isLoadingAllSkills ? "Loading data..." : "No data found for this class") : activeSkill ? `No ${activeSkill} results available` : "Select a skill or class to view data"}
                      </td>
                    </tr>
                  ) : tableData.map((row: any, index) => {
                    // If showing skill results for a selected class
                    if (selectedClass && !selectedStudent && !activeSkill && row.type === "skill-result") {
                      const skillLabel = skillButtons.find(s => s.id === row.skill)?.label || row.skill?.toUpperCase() || "Unknown"
                      const skillColor = skillButtons.find(s => s.id === row.skill)?.color || "#1E3A8A"
                      const studentName = row.user_name || row.name || (row.first_name && row.last_name) 
                        ? `${row.first_name} ${row.last_name}`.trim()
                        : row.first_name || row.email || "Unknown"
                      const dateTime = row.date_time || row.created_at || row.date || "-"
                      const score = row.overall_score || row.score || row.total_score || "-"
                      const moduleTitle = row.module_title || row.title || row.module || row.module_type || "-"
                      
                      return (
                        <tr
                          key={`skill-result-${row.skill}-${row.id}-${index}`}
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
                          <td style={{ padding: "12px", fontSize: "14px", color: skillColor, fontWeight: "600" }}>
                            {skillLabel}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A", fontWeight: "500" }}>
                            {studentName}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {dateTime}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A", fontWeight: "500" }}>
                            {typeof score === "number" ? `${score.toFixed(2)}%` : score}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A" }}>
                            {moduleTitle}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleShowDetails(row, row.skill)
                              }}
                              style={{
                                color: skillColor,
                                padding: "4px 8px",
                              }}
                            >
                              <Eye style={{ width: "16px", height: "16px" }} />
                            </Button>
                          </td>
                        </tr>
                      )
                    }
                    
                    // If showing all users for a selected class
                    if (selectedClass && !selectedStudent && !activeSkill && row.type === "user") {
                      const userEmail = row.email || `${row.name.toLowerCase().replace(/\s+/g, ".")}@xeleratelearning.com`
                      const roleColor = row.isStudent ? "#3B82F6" : row.role?.toLowerCase() === "teacher" ? "#10B981" : "#6B7280"
                      
                      return (
                        <tr
                          key={`user-${row.id}-${index}`}
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
                          <td style={{ padding: "12px", fontSize: "14px", color: roleColor, fontWeight: "500" }}>
                            {row.role}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A", fontWeight: "500" }}>
                            {row.listening !== undefined && row.listening !== null ? (typeof row.listening === "number" ? row.listening.toFixed(2) : row.listening) : "0"}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A", fontWeight: "500" }}>
                            {row.speaking !== undefined && row.speaking !== null ? (typeof row.speaking === "number" ? row.speaking.toFixed(2) : row.speaking) : "0"}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A", fontWeight: "500" }}>
                            {row.reading !== undefined && row.reading !== null ? (typeof row.reading === "number" ? row.reading.toFixed(2) : row.reading) : "0"}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1E3A8A", fontWeight: "500" }}>
                            {row.writing !== undefined && row.writing !== null ? (typeof row.writing === "number" ? row.writing.toFixed(2) : row.writing) : "0"}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Get the actual user object from classesData to ensure we have complete user data
                                const classData = classesData[selectedClass || ""]
                                const actualUser = classData?.allUsers?.find((u: any) => {
                                  const userId = u.id || u.user_id
                                  const rowUserId = row.id
                                  // Match by ID to get the correct user
                                  return userId === rowUserId || String(userId) === String(rowUserId)
                                })
                                
                                // Use the actual user data if found, otherwise use row data
                                const userData = actualUser || {}
                                
                                // Prepare the user/student data object (works for both students and teachers)
                                const studentDataToPass = {
                                  // CRITICAL: Set row data FIRST to ensure correct user info
                                  id: row.id,
                                  user_id: row.id,
                                  userId: row.id,
                                  name: row.name,
                                  studentName: row.name,
                                  user_name: row.name,
                                  user: row.name,
                                  email: row.email || userEmail,
                                  class: selectedClass ? `Class ${selectedClass}` : "",
                                  date: new Date().toLocaleString(),
                                  listening: row.listening,
                                  speaking: row.speaking,
                                  reading: row.reading,
                                  writing: row.writing,
                                  overall_score: row.overall_score,
                                  first_name: userData.first_name || row.name.split(" ")[0] || row.name,
                                  last_name: userData.last_name || row.name.split(" ").slice(1).join(" ") || "",
                                  ...Object.fromEntries(
                                    Object.entries(userData).filter(([key]) => 
                                      !['id', 'user_id', 'userId', 'name', 'studentName', 'user_name', 'user', 'email'].includes(key)
                                    )
                                  ),
                                }
                                
                                const returnState = {
                                  selectedOrganization: selectedOrganization || undefined,
                                  selectedClass: selectedClass || undefined,
                                }
                                const fromSection = "organization"
                                try {
                                  sessionStorage.setItem("progressDashboardReturnState", JSON.stringify({ ...returnState, fromSection }))
                                } catch (_) {}
                                const studentId = studentDataToPass.id ?? studentDataToPass.user_id
                                navigate(studentId ? `/progress-dashboard/students/${studentId}` : "/progress-dashboard/students", {
                                  state: {
                                    studentData: studentDataToPass,
                                    returnState,
                                    fromSection,
                                  },
                                })
                              }}
                              style={{
                                color: "#3B82F6",
                                padding: "4px 8px",
                              }}
                            >
                              <Eye style={{ width: "16px", height: "16px" }} />
                            </Button>
                          </td>
                        </tr>
                      )
                    }
                    
                    // If showing students list with scores (legacy support)
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
                                const studentId = row.id ?? row.user_id ?? row.userId
                                const studentDataLegacy = {
                                  id: studentId,
                                  user_id: studentId,
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
                                }
                                const rs = {
                                  selectedOrganization: selectedOrganization || undefined,
                                  selectedClass: selectedClass || undefined,
                                }
                                const fromSection = "organization" as const
                                try {
                                  sessionStorage.setItem("progressDashboardReturnState", JSON.stringify({ ...rs, fromSection }))
                                } catch (_) {}
                                navigate(studentId ? `/progress-dashboard/students/${studentId}` : "/progress-dashboard/students", {
                                  state: {
                                    studentData: studentDataLegacy,
                                    returnState: rs,
                                    fromSection,
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
    </>
  )
}
