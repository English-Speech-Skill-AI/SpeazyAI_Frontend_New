"use client"

import type React from "react"

// file: HomePage.tsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { motion } from "motion/react"
import {
  Mic2,
  Star,
  Sparkles,
  Play,
  BookOpen,
  Menu,
  Languages,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet"
import { useIsMobile } from "./ui/use-mobile"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { useLanguage, useLocalizedPath } from "./LocaleLayout"
import { useTranslation } from "react-i18next"

const getNavItems = (t: (key: string) => string, getPath: (p: string) => string) => [
  { label: t("home.nav.home") },
  { label: t("home.nav.about"), onClick: getPath("/about") },
  { label: t("home.nav.courses") },
  { label: t("home.nav.features") },
  { label: t("home.nav.contact"), onClick: getPath("/contact") },
]

const LANGUAGE_OPTIONS = [
  { value: "en" as const, label: "English" },
  { value: "ar" as const, label: "العربية" },
]

export function HomePage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { t } = useTranslation()
  const { locale, setLocale } = useLanguage()
  const getPath = useLocalizedPath()
  const NAV_ITEMS = getNavItems(t, getPath)
  const [isBlinking, setIsBlinking] = useState(false)
  const [eyeScale, setEyeScale] = useState(1)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const blinkInterval = setInterval(
      () => {
        setIsBlinking(true)
        setTimeout(() => setIsBlinking(false), 150)
      },
      3000 + Math.random() * 2000,
    )
    return () => clearInterval(blinkInterval)
  }, [])

  useEffect(() => {
    const sparkleInterval = setInterval(() => {
      setEyeScale(1.1)
      setTimeout(() => setEyeScale(1), 200)
    }, 4000)
    return () => clearInterval(sparkleInterval)
  }, [])

  const TEXT_LIGHT = "#F2F6FF"
  const TEXT_MUTED = "rgba(242,246,255,0.78)"
  const CARD_TEXT = "#0F1F47"
  const fontFamily = locale === "ar" ? "'Noto Sans Arabic', sans-serif" : "'DM Sans', sans-serif"

  // UPDATED: removed the first white glow gradient. Blues only.
  const BLURRY_BLUE_BG: React.CSSProperties = {
    backgroundColor: "#123A8A",
    backgroundImage: `
      radial-gradient(900px 700px at 78% 28%, rgba(21,86,197,0.75) 0%, rgba(21,86,197,0.10) 55%, rgba(21,86,197,0) 70%),
      radial-gradient(880px 680px at 20% 20%, rgba(18,59,150,0.75) 0%, rgba(18,59,150,0.10) 55%, rgba(18,59,150,0) 70%),
      radial-gradient(900px 700px at 80% 78%, rgba(13,52,152,0.80) 0%, rgba(13,52,152,0.10) 55%, rgba(13,52,152,0) 70%),
      radial-gradient(820px 640px at 18% 82%, rgba(0,185,252,0.35) 0%, rgba(0,185,252,0.06) 55%, rgba(0,185,252,0) 70%),
      radial-gradient(700px 560px at 60% 12%, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0.06) 55%, rgba(59,130,246,0) 72%),
      radial-gradient(900px 700px at 92% 50%, rgba(8,44,132,0.85) 0%, rgba(8,44,132,0.10) 55%, rgba(8,44,132,0) 75%)
    `,
    backgroundBlendMode: "normal",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  }

  return (
    <div style={{ height: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: -10, ...BLURRY_BLUE_BG }} />

      <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
            {/* Desktop nav links - hidden on mobile */}
            <div style={{ display: isMobile ? "none" : "flex", alignItems: "center", gap: 24 }}>
              {NAV_ITEMS.map((item, i) => (
                <button
                  key={i}
                  onClick={() => item.onClick && (navigate(item.onClick), setMobileMenuOpen(false))}
                  style={{ color: "#3B82F6", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Mobile menu trigger - only show on mobile; hide entirely on desktop */}
            <div style={{ display: isMobile ? "block" : "none" }}>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  style={{ color: "white", width: 40, height: 40 }}
                  aria-label={t("home.nav.openMenu")}
                >
                  <Menu style={{ width: 24, height: 24 }} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" style={{ width: 280, backgroundColor: "#1E3A8A", borderColor: "rgba(255,255,255,0.1)", padding: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", paddingTop: 24 }}>
                  <div style={{ padding: "0 24px 16px" }}>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 6, display: "block" }}>{t("home.language")}</span>
                    <Select value={locale} onValueChange={(v) => setLocale(v as "en" | "ar")}>
                      <SelectTrigger className="w-full min-h-[44px] px-4 py-3 border-white/20 bg-white/10 text-white [&>span]:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{ backgroundColor: "#1E3A8A", color: "#F2F6FF", borderColor: "rgba(255,255,255,0.2)", width: "var(--radix-select-trigger-width)", minWidth: "var(--radix-select-trigger-width)" }}
                        viewportStyle={{ padding: 8, height: "auto", display: "flex", flexDirection: "column", gap: 4, width: "var(--radix-select-trigger-width)", minWidth: "var(--radix-select-trigger-width)" }}
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
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "0 0 8px" }} />
                  {NAV_ITEMS.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (item.onClick) navigate(item.onClick)
                        setMobileMenuOpen(false)
                      }}
                      style={{ textAlign: "left", padding: "12px 24px", color: "white", background: "none", border: "none", cursor: "pointer" }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "8px 0" }} />
                  <button
                    onClick={() => { navigate(getPath("/contact")); setMobileMenuOpen(false) }}
                    style={{ textAlign: "left", padding: "12px 24px", color: "rgba(255,255,255,0.9)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {t("home.nav.contactUs")}
                  </button>
                  <button
                    onClick={() => { navigate(getPath("/login")); setMobileMenuOpen(false) }}
                    style={{ margin: "8px 24px", padding: "12px", borderRadius: 12, background: "linear-gradient(to right, #3B82F6, #00B9FC)", color: "white", fontWeight: 600, border: "none", cursor: "pointer" }}
                  >
                    {t("home.nav.signIn")}
                  </button>
                </div>
              </SheetContent>
            </Sheet>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 16 }}>
              <Select value={locale} onValueChange={(v) => setLocale(v as "en" | "ar")}>
                <SelectTrigger
                  className="w-[130px] h-10 px-4 py-2.5 gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20 [&>span]:text-white"
                  style={{ height: isMobile ? 40 : 44 }}
                >
                  <Languages className="w-4 h-4 shrink-0 opacity-80" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  style={{ backgroundColor: "#1E3A8A", color: "#F2F6FF", borderColor: "rgba(255,255,255,0.2)", width: "var(--radix-select-trigger-width)", minWidth: "var(--radix-select-trigger-width)" }}
                  viewportStyle={{ padding: 8, height: "auto", display: "flex", flexDirection: "column", gap: 4, width: "var(--radix-select-trigger-width)", minWidth: "var(--radix-select-trigger-width)" }}
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
              <button
                onClick={() => navigate(getPath("/contact"))}
                style={{ display: isMobile ? "none" : "block", color: TEXT_LIGHT, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
              >
                {t("home.nav.contactUs")}
              </button>
              <Button
                onClick={() => navigate(getPath("/login"))}
                style={{
                  height: isMobile ? 40 : 48,
                  paddingLeft: isMobile ? 16 : 32,
                  paddingRight: isMobile ? 16 : 32,
                  background: "linear-gradient(to right, #3B82F6, #00B9FC)",
                  color: "white",
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: isMobile ? 14 : 16,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("home.nav.signIn")}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div data-mello-scroll style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 16px 32px" : "32px 24px 32px", paddingTop: isMobile ? 120 : 160, width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 32, alignItems: "center", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
              {/* Mello Logo and English Skill AI */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ position: "relative" }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #3B82F6, #00B9FC)", borderRadius: "50%", filter: "blur(24px)", transform: "scale(1.5)" }}
                  />
                  <svg
                    width={isMobile ? 64 : 120}
                    height={isMobile ? 64 : 120}
                    viewBox="0 0 120 120"
                    style={{ position: "relative", zIndex: 10 }}
                  >
                    <defs>
                      <radialGradient id="logoBodyGradient" cx="50%" cy="40%">
                        <stop offset="0%" stopColor="#E0F2FE" />
                        <stop offset="50%" stopColor="#BAE6FD" />
                        <stop offset="100%" stopColor="#7DD3FC" />
                      </radialGradient>
                    </defs>
                    {/* Cloud Body */}
                    <g>
                      <ellipse cx="60" cy="65" rx="45" ry="40" fill="url(#logoBodyGradient)" />
                      <circle cx="35" cy="55" r="20" fill="url(#logoBodyGradient)" />
                      <circle cx="85" cy="55" r="20" fill="url(#logoBodyGradient)" />
                      <circle cx="60" cy="45" r="22" fill="url(#logoBodyGradient)" />
                      <circle cx="45" cy="75" r="18" fill="url(#logoBodyGradient)" />
                      <circle cx="75" cy="75" r="18" fill="url(#logoBodyGradient)" />
                    </g>
                    {/* Eyes */}
                    <ellipse
                      cx="48"
                      cy="58"
                      rx="8"
                      ry={isBlinking ? "1" : "10"}
                      fill="#1E3A8A"
                      style={{
                        transform: `scale(${eyeScale})`,
                        transformOrigin: "48px 58px",
                        transition: "all 0.15s ease",
                      }}
                    />
                    {!isBlinking && (
                      <>
                        <circle cx="50" cy="55" r="3" fill="white" opacity="0.9" />
                        <circle cx="46" cy="60" r="1.5" fill="white" opacity="0.6" />
                      </>
                    )}
                    <ellipse
                      cx="72"
                      cy="58"
                      rx="8"
                      ry={isBlinking ? "1" : "10"}
                      fill="#1E3A8A"
                      style={{
                        transform: `scale(${eyeScale})`,
                        transformOrigin: "72px 58px",
                        transition: "all 0.15s ease",
                      }}
                    />
                    {!isBlinking && (
                      <>
                        <circle cx="74" cy="55" r="3" fill="white" opacity="0.9" />
                        <circle cx="70" cy="60" r="1.5" fill="white" opacity="0.6" />
                      </>
                    )}
                    {/* Smile */}
                    <path
                      d="M 45 75 Q 60 85 75 75"
                      stroke="#1E3A8A"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Blush - Left cheek */}
                    <ellipse
                      cx="40"
                      cy="72"
                      rx="8"
                      ry="6"
                      fill="#FFB6C1"
                      opacity="0.6"
                    >
                      <animate
                        attributeName="opacity"
                        values="0.4;0.7;0.4"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </ellipse>
                    {/* Blush - Right cheek */}
                    <ellipse
                      cx="80"
                      cy="72"
                      rx="8"
                      ry="6"
                      fill="#FFB6C1"
                      opacity="0.6"
                    >
                      <animate
                        attributeName="opacity"
                        values="0.4;0.7;0.4"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </ellipse>
                  </svg>
                </motion.div>
                <span style={{ color: TEXT_LIGHT, fontFamily, fontSize: isMobile ? 28 : 48, fontWeight: 400 }}>
                  {t("home.brand")}
                </span>
              </div>

              <div id="heading-section">
                <h1 style={{ color: TEXT_LIGHT, fontFamily, fontSize: isMobile ? 24 : 42, lineHeight: 1.2, fontWeight: 400, margin: 0 }}>
                  {t("home.heading")}
                </h1>

                <p style={{ color: TEXT_MUTED, fontFamily, fontSize: isMobile ? 16 : 18, lineHeight: 1.6, marginTop: isMobile ? 12 : 16, margin: 0 }}>
                  {t("home.subheading")}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, marginTop: 24 }}>
                <Button
                  variant="outline"
                  style={{ height: 48, paddingLeft: 24, paddingRight: 24, border: "2px solid rgba(255,255,255,0.6)", color: "white", borderRadius: 16, background: "transparent", fontSize: 16 }}
                >
                  <Play style={{ width: 16, height: 16, marginRight: 8 }} /> {t("home.watchDemo")}
                </Button>
              </div>
            </div>

            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div className="relative w-full flex items-center justify-center">
                <Card className="relative z-10 w-full max-w-sm bg-white border-0 shadow-2xl" style={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div className="w-16 h-16 mx-auto linear-gradient-primary rounded-3xl flex items-center justify-center shadow-xl">
                        <Mic2 className="w-8 h-8 text-white" />
                      </div>

                      <div className="flex items-center justify-center gap-1 h-12">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="w-2 rounded-full bg-gradient-to-t from-[#3B82F6] to-[#00B9FC]"
                            style={{
                              height: `${20 + Math.random() * 40}px`,
                              animationName: "pulse",
                              animationDuration: `${1 + Math.random()}s`,
                              animationTimingFunction: "ease-in-out",
                              animationIterationCount: "infinite",
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>

                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-2 text-sm" style={{ color: "#3B82F6" }}>
                          <div className="w-2 h-2 bg-[#00B9FC] rounded-full animate-pulse" />
                          <span>{t("home.recording")}</span>
                        </div>
                        <p className="text-xl font-semibold" style={{ color: CARD_TEXT }}>
                          {t("home.practiceMakesPerfect")}
                        </p>
                        <p
                          className="text-sm"
                          style={{
                            color: "rgba(15,31,71,0.65)",
                          }}
                        >
                          {t("home.aiAnalyzing")}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-4">
                        {[
                          { label: t("home.clarity"), value: "95%", color: "#3B82F6" },
                          { label: t("home.pace"), value: "88%", color: "#3B82F6" },
                          { label: t("home.tone"), value: "92%", color: "#FFD600" },
                        ].map((m, i) => (
                          <div key={i} className="text-center">
                            <div className="text-2xl mb-1 font-semibold" style={{ color: m.color }}>
                              {m.value}
                            </div>
                            <div
                              className="text-xs"
                              style={{
                                color: "rgba(15,31,71,0.65)",
                              }}
                            >
                              {m.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div
                  className="absolute -top-12 right-0 bg-white border border-[#3B82F6]/20 shadow-lg px-4 py-2 rounded-full"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#3B82F6]" />
                    <span className="text-sm" style={{ color: CARD_TEXT }}>
                      {t("home.lessonsCount")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
