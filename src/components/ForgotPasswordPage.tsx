"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardHeader } from "./ui/card"
import { ThemeToggle } from "./ThemeToggle"
import { Mic, ArrowLeft, Mail, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic validation
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("https://api.intelliviq.com/api/auth/forgot_password.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          app_url: typeof window !== "undefined" ? window.location.origin : "https://exeleratetechnology.com"
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error response
        const errorMessage = data.message || data.error || `Request failed with status ${response.status}`
        throw new Error(errorMessage)
      }

      // Success - show success message
      setSubmitted(true)
      toast.success("Reset link sent!", {
        description: "Please check your email for password reset instructions.",
        duration: 5000,
        style: {
          background: "linear-gradient(135deg, #7A3CF4 0%, #4B8BFF 100%)",
          color: "#FFFFFF",
          border: "none",
        },
      })
    } catch (err) {
      // Handle error
      const errorMessage = err instanceof Error ? err.message : "Failed to send reset email. Please try again."
      setError(errorMessage)
      toast.error("Failed to send reset link", {
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

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* AI gradient overlays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#7A3CF4] to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#4B8BFF] to-transparent rounded-full blur-3xl" />
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/login")}
        className="absolute top-4 left-4 text-[#B9C2D0] hover:text-[#7A3CF4]"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        BACK
      </Button>

      <div className="w-full max-w-md relative z-10">
        <Card className="w-full shadow-2xl border border-[#273043] bg-[#141A2A]/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#7A3CF4] to-[#4B8BFF] rounded-2xl flex items-center justify-center shadow-xl shadow-[#7A3CF4]/50">
                <Mic className="w-10 h-10 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-wider">Reset Password</h1>
            <p className="text-[#B9C2D0] text-sm">Enter your email to receive reset instructions</p>
          </CardHeader>

          <CardContent>
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#7A3CF4] to-[#4B8BFF] rounded-full flex items-center justify-center shadow-lg shadow-[#7A3CF4]/50">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider">Email Sent</h3>
                <p className="text-[#B9C2D0] mb-6">Check your inbox for password reset instructions</p>
                <Button
                  onClick={() => navigate("/login")}
                  variant="outline"
                  className="border-[#273043] text-[#7A3CF4] hover:bg-[#0B0F19] hover:border-[#7A3CF4] uppercase tracking-wider"
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div
                    style={{
                      backgroundColor: "#1F2937",
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
                        color: "#EF4444",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    />
                    <span
                      style={{
                        color: "#FCA5A5",
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
                  <Label htmlFor="email" className="text-[#7A3CF4] uppercase text-xs tracking-wider">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#3E2C78]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError(null) // Clear error when user types
                      }}
                      disabled={isLoading}
                      required
                      className="h-12 pl-12 bg-[#0B0F19] border-[#273043] text-white placeholder:text-[#3E2C78] focus:border-[#7A3CF4] focus:ring-[#7A3CF4]/20 rounded-lg disabled:opacity-50"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#7A3CF4] to-[#4B8BFF] hover:from-[#6C5CE7] hover:to-[#7A3CF4] text-white rounded-lg font-medium transition-all duration-200 uppercase tracking-wider shadow-lg shadow-[#7A3CF4]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate("/login")}
                    className="text-[#7A3CF4] hover:text-[#4B8BFF] transition-colors uppercase text-xs tracking-wider"
                  >
                    Remember your password? Sign In
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-[#3E2C78] text-sm uppercase tracking-wider">Professional Speech Training Platform</p>
        </div>
      </div>
    </div>
  )
}
