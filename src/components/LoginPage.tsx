"use client"

import React, { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardHeader } from "./ui/card"
import { Alert, AlertDescription } from "./ui/alert"
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { useLocalizedPath } from "./LocaleLayout"

export function LoginPage() {
  const { t } = useTranslation()
  const getPath = useLocalizedPath()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, loading } = useAuth()
  // Where to redirect after login: the page user was trying to open, or default dashboard
  const fromState = (location.state as { from?: { pathname?: string } })?.from
  const fromPath = (fromState?.pathname && (fromState.pathname.startsWith("/en") || fromState.pathname.startsWith("/ar")))
    ? fromState.pathname
    : getPath("/skills-home")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Basic validation
    if (!email.trim()) {
      setError(t("login.validationEmail"))
      return
    }
    
    if (!password.trim()) {
      setError(t("login.validationPassword"))
      return
    }

    setIsLoading(true)
    
    try {
      await login(email.trim(), password)
      // Login successful - show success toast
      toast.success("Login successful! 🎉", {
        description: "Welcome back! Redirecting to your dashboard...",
        duration: 3000,
        style: {
          background: "linear-gradient(135deg, #3B82F6 0%, #00B9FC 100%)",
          color: "#FFFFFF",
          border: "none",
        },
      })
      // Navigate back to the page user was trying to open (e.g. /progress-dashboard) or default dashboard
      setTimeout(() => {
        navigate(fromPath, { replace: true })
      }, 500)
    } catch (err) {
      // Handle login error - show error toast
      const rawMessage = err instanceof Error ? err.message : t("login.toastErrorDefault")
      const errorMessage = rawMessage?.includes("Invalid email or password") ? t("login.invalidCredentials") : rawMessage
      setError(errorMessage)
      toast.error(t("login.toastError"), {
        description: errorMessage,
        duration: 4000,
        style: {
          background: "#EF4444",
          color: "#FFFFFF",
          border: "none",
        },
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#1E3A8A",
        }}
      >
        <div
          style={{
            color: "#FFFFFF",
            fontSize: "18px",
          }}
        >
          {t("login.loading")}
        </div>
      </div>
    )
  }

  return (
    <div
      data-mello-scroll
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#1E3A8A" }}
    >
      <style>
        {`
          .typewriter {
            overflow: hidden;
            white-space: nowrap;
            animation: typing 2s steps(40, end);
          }
          @keyframes typing {
            from { width: 0; }
            to { width: 100%; }
          }
          .kid-pulse {
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}
      </style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-pulse"
            style={{
              background: "#FFD600",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card
            className="shadow-2xl border-0 overflow-hidden"
            style={{
              borderRadius: "24px",
              background: "#FFFFFF",
              boxShadow: "0 8px 32px rgba(59, 130, 246, 0.15)",
            }}
          >
            <CardHeader className="text-center pb-6 bg-gradient-to-br from-[#3B82F6] to-[#00B9FC] text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/20 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#3B82F6]/20 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg kid-pulse">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl text-white mb-2">{t("login.welcomeBack")}</h1>
                <p className="text-sm text-white/90">{t("login.signInSubheading")}</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6" style={{ padding: "24px 16px", paddingBottom: 32, paddingTop: 24 }}>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div
                    style={{
                      backgroundColor: "#FEE2E2",
                      borderColor: "#EF4444",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <AlertCircle
                      style={{
                        width: "18px",
                        height: "18px",
                        color: "#DC2626",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    />
                    <span
                      style={{
                        color: "#991B1B",
                        fontSize: "14px",
                        fontWeight: "500",
                        lineHeight: "1.5",
                      }}
                    >
                      {error}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" style={{ color: "#1E3A8A" }}>
                    {t("login.emailOrUsername")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    lang="en"
                    placeholder={t("login.enterEmail")}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError(null) // Clear error when user types
                    }}
                    disabled={isLoading}
                    className="h-12 bg-[#F2F6FF] border-0 text-[#1E3A8A] placeholder:text-[#1E3A8A]/40 focus:ring-2 focus:ring-[#3B82F6] rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" style={{ color: "#1E3A8A" }}>
                    {t("login.password")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      dir="ltr"
                      lang="en"
                      placeholder={t("login.enterPassword")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setError(null) // Clear error when user types
                      }}
                      disabled={isLoading}
                      className="h-12 bg-[#F2F6FF] border-0 text-[#1E3A8A] placeholder:text-[#1E3A8A]/40 focus:ring-2 focus:ring-[#3B82F6] rounded-xl pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#1E3A8A]/60 hover:text-[#3B82F6] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => navigate(getPath("/forgot-password"))}
                    disabled={isLoading}
                    className="text-sm text-[#3B82F6] hover:text-[#1E3A8A] transition-colors disabled:opacity-50"
                  >
                    {t("login.forgotPassword")}
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#3B82F6] to-[#00B9FC] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("login.signingIn")}
                    </>
                  ) : (
                    t("login.signIn")
                  )}
                </Button>
              </form>

            </CardContent>
          </Card>
        </motion.div>

        <p className="text-center text-[#F2F6FF]/60 text-sm mt-6">{t("login.secureLogin")}</p>
      </div>

    </div>
  )
}
