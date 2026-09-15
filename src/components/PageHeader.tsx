"use client"

import { useLocalizedNavigate } from "./LocaleLayout"
import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Button } from "./ui/button"
import { MelloEyes } from "./MelloEyes"
import { Star, LogOut, LayoutDashboard, Languages } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useLanguage } from "./LocaleLayout"
import { useTranslation } from "react-i18next"
import { fetchStreakData } from "../utils/streakApi"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

const LANGUAGE_OPTIONS = [
  { value: "en" as const, label: "English" },
  { value: "ar" as const, label: "العربية" },
]

export function PageHeader() {
  const { t } = useTranslation()
  const { locale, setLocale } = useLanguage()
  const navigate = useLocalizedNavigate()
  const location = useLocation()
  const isResultsPage = location.pathname.includes("/results")
  const { authData, logout, token } = useAuth()
  const [streakDays, setStreakDays] = useState<number>(0)
  const [loadingStreak, setLoadingStreak] = useState(true)

  // Get user initials from auth data
  const userInitials = authData?.user
    ? `${authData.user.first_name?.[0] || ""}${authData.user.last_name?.[0] || ""}`.toUpperCase() || "U"
    : "U"

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true } as { replace?: boolean })
  }

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

  return (
    <>
      <style>
        {`
          @media (max-width: 640px) {
            .streak-badge {
              display: none !important;
            }
          }
        `}
      </style>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(4px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          flexShrink: 0,
        }}
      >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "64px",
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ animation: "none" }}>
                <MelloEyes />
              </div>
            </div>
            <h1
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#FFFFFF",
              }}
            >
              {t("home.brand")}
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {!isResultsPage && (
            <Select value={locale} onValueChange={(v) => setLocale(v as "en" | "ar")}>
              <SelectTrigger
                style={{
                  width: 120,
                  height: 36,
                  padding: "0 12px",
                  gap: 8,
                  border: "1px solid rgba(255,255,255,0.2)",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: "#FFFFFF",
                }}
              >
                <Languages style={{ width: 16, height: 16, opacity: 0.9 }} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{ backgroundColor: "#1E3A8A", color: "#F2F6FF", borderColor: "rgba(255,255,255,0.2)" }}
                viewportStyle={{ padding: 8, height: "auto", display: "flex", flexDirection: "column", gap: 4 }}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    style={{ padding: "8px 12px", paddingRight: 32, fontSize: 14, color: "#F2F6FF", borderRadius: 6 }}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
            <div
              className="streak-badge"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                padding: "4px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <Star
                style={{
                  width: "16px",
                  height: "16px",
                  color: "#FFD600",
                  fill: "#FFD600",
                }}
              />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#FFFFFF",
                }}
              >
                {loadingStreak ? "..." : streakDays === 1 ? t("dashboard.dayStreak", { count: streakDays }) : t("dashboard.daysStreak", { count: streakDays })}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/progress-dashboard")}
              title={t("dashboard.progressDashboard")}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              <LayoutDashboard
                style={{
                  width: "20px",
                  height: "20px",
                  color: "#FFFFFF",
                }}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              title={t("dashboard.profile")}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#3B82F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                {userInitials}
              </div>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              style={{
                color: "#FFFFFF",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              <LogOut
                style={{
                  width: "16px",
                  height: "16px",
                }}
              />
            </Button>
          </div>
        </div>
      </div>
    </header>
    </>
  )
}

