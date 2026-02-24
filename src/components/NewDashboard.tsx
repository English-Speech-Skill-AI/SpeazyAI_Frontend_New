"use client"

import React, { useState, useEffect } from "react"
import type { CSSProperties } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { MelloAssistant } from "./MelloAssistant"
import { SupportChatbot } from "./SupportChatbot"
import { PageHeader } from "./PageHeader"
import { useAuth } from "../contexts/AuthContext"
import { fetchStreakData } from "../utils/streakApi"
import { fetchUsageTime, formatUsageTime, shouldRefreshUsageTime } from "../utils/usageTimeApi"
import { fetchImprovementData } from "../utils/improvementApi"
import {
  BookOpen,
  PenTool,
  Mic2,
  MessageCircle,
  Star,
  TrendingUp,
  Headphones,
  Award,
  Clock,
} from "lucide-react"

export function NewDashboard() {
  const navigate = useNavigate()
  const [isLoaded, setIsLoaded] = useState(false)
  const [showMelloMessage, setShowMelloMessage] = useState(false)
  const [supportChatbotOpen, setSupportChatbotOpen] = useState(false)
  const { authData, token } = useAuth()
  const [streakDays, setStreakDays] = useState<number>(0)
  const [loadingStreak, setLoadingStreak] = useState(true)
  const [usageTimeSeconds, setUsageTimeSeconds] = useState<number | null>(null)
  const [loadingUsageTime, setLoadingUsageTime] = useState(true)
  const [improvementDisplay, setImprovementDisplay] = useState<string>("0")
  const [loadingImprovement, setLoadingImprovement] = useState(true)
  const [speakingTimeDisplay, setSpeakingTimeDisplay] = useState<string>("0m")
  const [loadingSpeakingTime, setLoadingSpeakingTime] = useState(true)

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100)
  }, [])

  // Fetch streak data on mount and when token changes
  useEffect(() => {
    const loadStreakData = async () => {
      if (!token) {
        setLoadingStreak(false)
        return
      }

      try {
        setLoadingStreak(true)
        const streakData = await fetchStreakData(token)
        if (streakData) {
          setStreakDays(streakData.current_streak || streakData.streak_days || 0)
        }
      } catch (error) {
        console.error('Error loading streak data:', error)
      } finally {
        setLoadingStreak(false)
      }
    }

    loadStreakData()
  }, [token])

  // Fetch usage time on mount and when token changes
  useEffect(() => {
    const loadUsageTime = async () => {
      if (!token) {
        setLoadingUsageTime(false)
        return
      }

      try {
        setLoadingUsageTime(true)
        const totalSeconds = await fetchUsageTime(token)
        if (totalSeconds !== null) {
          setUsageTimeSeconds(totalSeconds)
        }
      } catch (error) {
        console.error('Error loading usage time:', error)
      } finally {
        setLoadingUsageTime(false)
      }
    }

    loadUsageTime()

    // Set up polling to check every minute if usage time should be refreshed
    // Only refresh if 10 minutes have passed since the last usage-time.php call
    const pollingInterval = setInterval(() => {
      if (shouldRefreshUsageTime()) {
        loadUsageTime()
      }
    }, 60 * 1000) // Check every minute

    // Cleanup interval on unmount or token change
    return () => {
      clearInterval(pollingInterval)
    }
  }, [token])

  // Fetch improvement data on mount and when token changes
  useEffect(() => {
    const loadImprovementData = async () => {
      if (!token) {
        setLoadingImprovement(false)
        return
      }

      try {
        setLoadingImprovement(true)
        const display = await fetchImprovementData(token)
        setImprovementDisplay(display)
      } catch (error) {
        console.error('Error loading improvement data:', error)
      } finally {
        setLoadingImprovement(false)
      }
    }

    loadImprovementData()
  }, [token])

  // Fetch total speaking time on mount and when token changes
  useEffect(() => {
    const loadSpeakingTime = async () => {
      if (!token) {
        setLoadingSpeakingTime(false)
        return
      }
      try {
        setLoadingSpeakingTime(true)
        const res = await fetch("https://api.intelliviq.com/api/speaking/total_speaking_time.php", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        })
        const data = await res.json()
        if (data?.success && data?.total_speaking_time) {
          const t = data.total_speaking_time
          const hhmmss = t.hhmmss || "00:00:00"
          const [h = 0, m = 0, s = 0] = hhmmss.split(":").map(Number)
          if (h > 0) {
            setSpeakingTimeDisplay(`${h}h ${m}m`)
          } else if (m > 0 || s > 0) {
            setSpeakingTimeDisplay(s > 0 ? `${m}m ${s}s` : `${m}m`)
          } else {
            setSpeakingTimeDisplay("0m")
          }
        } else {
          setSpeakingTimeDisplay("0m")
        }
      } catch (error) {
        console.error("Error loading speaking time:", error)
        setSpeakingTimeDisplay("0m")
      } finally {
        setLoadingSpeakingTime(false)
      }
    }
    loadSpeakingTime()
  }, [token])

  // Main learning modules (6 tiles in order: Speaking, Writing, Reading, Listening, IELTS, AI Tutor)
  const modules = [
    {
      id: "speaking",
      title: "Speaking",
      description: "Practice speaking with confidence",
      icon: Mic2,
      color: "#3B82F6",
      progress: 60,
    },
    {
      id: "writing",
      title: "Writing",
      description: "Improve your writing skills",
      icon: PenTool,
      color: "#00B9FC",
      progress: 45,
    },
    {
      id: "reading",
      title: "Reading",
      description: "Enhance reading comprehension",
      icon: BookOpen,
      color: "#246BCF",
      progress: 75,
    },
    {
      id: "listening-practice",
      title: "Listening",
      description: "Develop listening skills",
      icon: Headphones,
      color: "#1E3A8A",
      progress: 30,
    },
    {
      id: "ielts",
      title: "IELTS Preparation",
      description: "Complete IELTS test preparation",
      icon: Award,
      color: "#00B9FC",
      progress: 0,
    },
    {
      id: "chat",
      title: "AI Tutor",
      description: "Get personalized coaching",
      icon: MessageCircle,
      color: "#3B82F6",
      progress: 0,
    },
  ]


  const handleModuleClick = (moduleId: string) => {
    // Handle navigation based on module ID
    const navigationMap: Record<string, string> = {
      "reading": "/reading-modules",
      "speaking": "/speaking-modules",
      "writing": "/writing-modules",
      "listening-practice": "/listening-modules",
      "ielts": "/ielts",
      "chat": "/chat",
      "connect-teacher": "/connect-teacher",
    }
    
    const route = navigationMap[moduleId]
    if (route) {
      navigate(route)
    }
  }


  // Stats cards from old dashboard
  const stats = [
    {
      label: "Speaking Time",
      value: loadingSpeakingTime ? "..." : speakingTimeDisplay,
      icon: Mic2,
      color: "#3B82F6",
    },
    {
      label: "App Usage Time",
      value: loadingUsageTime 
        ? "..." 
        : usageTimeSeconds !== null 
          ? formatUsageTime(usageTimeSeconds)
          : "0m",
      icon: Clock,
      color: "#00B9FC",
    },
    {
      label: "Streak Days",
      value: loadingStreak ? "..." : streakDays.toString(),
      icon: Star,
      color: "#FFD600",
    },
    {
      label: "Improvement",
      value: loadingImprovement 
        ? "..." 
        : improvementDisplay,
      icon: TrendingUp,
      color: "#246BCF",
    },
  ]

  const renderMainDashboard = () => (
    <>
      {/* Welcome Section */}
      <div style={{ marginBottom: "32px" }}>
        <h2
          style={{
            fontSize: "30px",
            fontWeight: "bold",
            color: "#FFFFFF",
            marginBottom: "8px",
          }}
        >
          Welcome back, {authData?.user?.first_name || "User"}! 👋
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "rgba(255, 255, 255, 0.8)",
          }}
        >
          Ready to practice your speaking skills today?
        </p>
      </div>

      {/* Stats Section */}
      <style>
        {`
          @media (min-width: 1024px) {
            .stats-grid {
              grid-template-columns: repeat(4, 1fr) !important;
            }
            .modules-grid {
              grid-template-columns: repeat(3, 1fr) !important;
            }
          }
          @media (min-width: 768px) and (max-width: 1023px) {
            .modules-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
        `}
      </style>
      <div
        className="stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {stats.map((stat, index) => (
          <div
            key={index}
            style={{
              backgroundColor: "#FFFFFF",
              border: "none",
              borderRadius: "24px",
              cursor: "pointer",
              transition: "all 0.3s",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)"
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.15)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ padding: "16px", textAlign: "center" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  margin: "0 auto 8px",
                  borderRadius: "16px",
                  backgroundColor: stat.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                <stat.icon
                  style={{
                    width: "20px",
                    height: "20px",
                    color: "#FFFFFF",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1E3A8A",
                  marginBottom: "4px",
                }}
              >
                {stat.value}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(30, 58, 138, 0.7)",
                }}
              >
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Learning Modules - 6 Tiles */}
      <div style={{ marginBottom: "24px" }}>
        <h3
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#FFFFFF",
            marginBottom: "24px",
          }}
        >
          Your Learning Modules
        </h3>
      </div>

      <div
        className="modules-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(1, 1fr)",
          gap: "24px",
        }}
      >
        {modules.map((module) => (
          <div
            key={module.id}
            style={{
              backgroundColor: "#FFFFFF",
              border: "none",
              borderRadius: "24px",
              cursor: "pointer",
              transition: "all 0.3s",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
            }}
            onClick={() => handleModuleClick(module.id)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)"
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.15)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ paddingBottom: "16px", paddingTop: "24px", paddingLeft: "24px", paddingRight: "24px" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  backgroundColor: module.color,
                  borderRadius: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  transition: "all 0.3s",
                }}
              >
                <module.icon
                  style={{
                    width: "32px",
                    height: "32px",
                    color: "#FFFFFF",
                  }}
                />
              </div>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1E3A8A",
                  marginBottom: "8px",
                }}
              >
                {module.title}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(30, 58, 138, 0.7)",
                }}
              >
                {module.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  )


  const BLUE_BG: CSSProperties = {
    backgroundColor: "#1E3A8A",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
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
          flex: 1,
          overflowY: "auto",
        }}
      >
        <div
          data-mello-scroll
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "32px 16px",
            paddingBottom: "128px",
          }}
        >
          {renderMainDashboard()}
        </div>
      </div>

      <MelloAssistant
        state="waving"
        message={`Hi! Welcome back, ${authData?.user?.first_name || "User"}! ${streakDays > 0 ? `You're on a ${streakDays}-day streak! Keep it up! 👋🎉` : "Ready to start your learning journey? 👋"}`}
        showMessage={showMelloMessage}
        onMessageDismiss={() => setShowMelloMessage(false)}
        onClick={() => setShowMelloMessage((prev) => !prev)}
        position="bottom-right"
        showConnectTeacher={true}
        supportEmail="support@exeleratetechnology.com"
        onSupportClick={() => {
          setShowMelloMessage(false);
          // Open support panel next tick so portal mounts after popup closes
          requestAnimationFrame(() => {
            setSupportChatbotOpen(true);
          });
        }}
      />
      <SupportChatbot
        open={supportChatbotOpen}
        onOpenChange={setSupportChatbotOpen}
        userEmail={authData?.user?.email}
      />
    </div>
  )
}
