"use client"

import { useState, useRef, useEffect, CSSProperties } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Dialog, DialogContent } from "./ui/dialog"
import {
  ArrowLeft,
  Pause,
  BookOpen,
  Star,
  Trophy,
  Clock,
  Mic,
  Volume2,
  CheckCircle,
  Sparkles,
  Square,
  GraduationCap,
  School,
  BookMarked,
  Notebook,
  BookCheck,
  BookA,
  BookX,
  Book,
  Award,
  Rocket,
  Globe,
  Lightbulb,
  Target,
  Zap,
  FileText,
  Trash2,
} from "lucide-react"
import { AudioRecorder } from "./audioRecorder"
import { useLocation } from "react-router-dom"
import { useLocalizedNavigate } from "./LocaleLayout"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "sonner"
import { PdfLoadingScreen } from "./PdfLoadingScreen"
import { getPdfTextForLesson, getPdfText, truncateTextToWords } from "../utils/pdfTextExtractor"

interface MyLessonsProps {
  onBack: () => void
}

type View = "lesson-list" | "lesson-detail"

interface ContentItem {
  id: string
  title: string
  className: string
  chapter: string
  pdfUrl: string
  uploadDate: string
}

// Array of icons for random assignment
const contentIcons = [
  BookOpen,
  GraduationCap,
  School,
  BookMarked,
  Notebook,
  BookCheck,
  BookA,
  Book,
  FileText,
  Award,
  Star,
  Rocket,
  Globe,
  Lightbulb,
  Target,
  Zap,
]

// Array of gradient colors for icon backgrounds
const iconGradients = [
  "from-[#3B82F6] to-[#00B9FC]",
  "from-[#1E3A8A] to-[#3B82F6]",
  "from-[#00B9FC] to-[#3B82F6]",
  "from-[#6366F1] to-[#8B5CF6]",
  "from-[#EC4899] to-[#F43F5E]",
  "from-[#F59E0B] to-[#EF4444]",
  "from-[#10B981] to-[#059669]",
  "from-[#8B5CF6] to-[#EC4899]",
]

// Get icon and gradient based on item ID (consistent per item)
const getItemIcon = (itemId: string) => {
  let hash = 0
  for (let i = 0; i < itemId.length; i++) {
    hash = itemId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % contentIcons.length
  return contentIcons[index]
}

const getItemGradient = (itemId: string) => {
  let hash = 0
  for (let i = 0; i < itemId.length; i++) {
    hash = itemId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % iconGradients.length
  return iconGradients[index]
}

export function MyLessons() {
  const navigate = useLocalizedNavigate()
  const location = useLocation()
  const backRoute = (location.state as any)?.backRoute || "/reading-modules"
  const { token, userRole } = useAuth()
  const isTeacher = userRole?.toLowerCase() === "teacher"
  const [currentView, setCurrentView] = useState<View>("lesson-list")
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [isLoadingContent, setIsLoadingContent] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<ContentItem | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [showRecordingModal, setShowRecordingModal] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [showFloatingMic, setShowFloatingMic] = useState(false)
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)

  const resultRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number | null>(null)
  const audioDataRef = useRef<number[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Helper function to map API response to ContentItem
  const mapApiItemToContentItem = (item: any): ContentItem => ({
    id: item.id?.toString() || item.content_id?.toString() || Date.now().toString(),
    title: item.title || "",
    className: item.class_name || item.className || "",
    chapter: item.chapterName || item.chapter_name || item.chapter || "",
    pdfUrl: item.pdf_url || item.pdfUrl || "",
    uploadDate: item.upload_date || item.uploadDate || item.created_at || new Date().toISOString().split("T")[0],
  })

  // Fetch content items from API on component mount
  useEffect(() => {
    const fetchContentItems = async () => {
      if (!token) {
        setIsLoadingContent(false)
        return
      }

      try {
        setIsLoadingContent(true)
        const response = await fetch("https://api.intelliviq.com/api/content/list.php", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status}`)
        }

        const data = await response.json()

        // Handle different response formats
        let items: ContentItem[] = []
        
        if (data.success && Array.isArray(data.data)) {
          items = data.data.map(mapApiItemToContentItem)
        } else if (Array.isArray(data)) {
          items = data.map(mapApiItemToContentItem)
        }

        setContentItems(items)
      } catch (error) {
        toast.error("Failed to load lessons. Please try again.")
        setContentItems([])
      } finally {
        setIsLoadingContent(false)
      }
    }

    fetchContentItems()
  }, [token])

  const handleDeleteLesson = async (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation()
    if (!token) return
    try {
      const numericId = typeof item.id === "string" ? parseInt(item.id, 10) : item.id
      if (Number.isNaN(numericId)) {
        toast.error("Invalid lesson id.")
        return
      }
      const response = await fetch("https://api.intelliviq.com/api/content/delete.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ id: numericId }),
      })
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || `Delete failed: ${response.status}`)
      }
      setContentItems((prev) => prev.filter((i) => i.id !== item.id))
      toast.success("Lesson deleted.")
    } catch (err) {
      console.error("Delete lesson error:", err)
      toast.error("Failed to delete lesson. Please try again.")
    }
  }

  const handleLessonSelect = async (lesson: ContentItem) => {
    // If PDF URL exists, extract text (with automatic caching)
    if (lesson.pdfUrl) {
      try {
        setIsExtractingPdf(true)
        
        // Use the reusable function - it handles caching, extraction, and storage
        await getPdfTextForLesson(lesson.id, lesson.pdfUrl, {
          useChatGPT: true, // Use ChatGPT for processing (falls back to raw text if unavailable)
          onProgress: (stage) => {
            // Optional: You can track progress here if needed
            if (stage === 'complete') {
              setIsExtractingPdf(false)
            }
          }
        })

        // Proceed to lesson detail view
        setSelectedLesson(lesson)
        setCurrentView("lesson-detail")
        setReadingProgress(0)
        setIsRecording(false)
        setShowRecordingModal(false)
        setShowFloatingMic(false)
      } catch (error) {
        console.error('Error extracting PDF text:', error)
        // Only show error toast for actual extraction failures, not connection issues
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (!errorMessage.includes('Failed to fetch') && !errorMessage.includes('ERR_CONNECTION_REFUSED')) {
          toast.error('Failed to process PDF. Showing lesson anyway.')
        }
        // Still proceed to show the lesson even if extraction fails
        setSelectedLesson(lesson)
        setCurrentView("lesson-detail")
        setReadingProgress(0)
        setIsRecording(false)
        setShowRecordingModal(false)
        setShowFloatingMic(false)
      } finally {
        setIsExtractingPdf(false)
      }
    } else {
      // No PDF URL, proceed normally
      setSelectedLesson(lesson)
      setCurrentView("lesson-detail")
      setReadingProgress(0)
      setIsRecording(false)
      setShowRecordingModal(false)
      setShowFloatingMic(false)
    }
  }

  const startRecording = () => {
    setShowRecordingModal(true)
    setIsRecording(true)
    audioDataRef.current = []
    startWaveformAnimation() // Waveform starts
  }

  const stopRecording = () => {
    setIsRecording(false)
    setShowRecordingModal(false)
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
    setTimeout(() => {
      setReadingProgress(100)
      scrollToResult()
    }, 800)
  }

  // Fixed Waveform Animation
  const startWaveformAnimation = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 300
    canvas.height = 100

    const barWidth = 4
    const barGap = 2
    const bars = Math.floor(canvas.width / (barWidth + barGap))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Simulate audio input
      if (Math.random() > 0.3) {
        const level = Math.random() * 0.8 + 0.2
        audioDataRef.current.push(level)
      }

      if (audioDataRef.current.length > bars) {
        audioDataRef.current.shift()
      }

      const data = audioDataRef.current

      data.forEach((level, i) => {
        const height = level * canvas.height * 0.8
        const x = i * (barWidth + barGap)
        const y = (canvas.height - height) / 2

        const gradient = ctx.createLinearGradient(x, y, x, y + height)
        gradient.addColorStop(0, "#3B82F6")
        gradient.addColorStop(1, "#00B9FC")

        ctx.fillStyle = gradient
        ctx.shadowBlur = 12
        ctx.shadowColor = "#3B82F6"
        ctx.fillRect(x, y, barWidth, height)
      })

      // Center line
      ctx.shadowBlur = 0
      ctx.strokeStyle = "#BFDBFE"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, canvas.height / 2)
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()

      animationIdRef.current = requestAnimationFrame(animate)
    }

    animate()
  }

  const scrollToResult = () => {
    setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      setShowFloatingMic(true)
    }, 100)
  }

  const handleListen = () => {
    setIsListening(!isListening)
    if (!isListening) {
      setTimeout(() => setIsListening(false), 5000)
    }
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || readingProgress !== 100) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const resultTop = resultRef.current?.offsetTop || 0
      const viewportHeight = container.clientHeight

      if (scrollTop + viewportHeight > resultTop + 100) {
        setShowFloatingMic(true)
      } else if (scrollTop < resultTop - viewportHeight) {
        setShowFloatingMic(false)
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [readingProgress])

  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [])

  const BLURRY_BLUE_BG: CSSProperties = {
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

  const TEXT_LIGHT = "#F2F6FF"
  const TEXT_MUTED = "rgba(242,246,255,0.78)"
  const CARD_TEXT = "#0F1F47"

  const renderLessonList = () => (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10" style={BLURRY_BLUE_BG} />

      <style>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
          }
        }
        .animated-star {
          animation: float 3s ease-in-out infinite;
        }
        .glow-blue {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-3 h-3 bg-[#3B82F6] rounded-full opacity-70 animated-star glow-blue" />
        <div className="absolute top-32 right-20 w-2 h-2 bg-[#00B9FC] rounded-full opacity-60 animated-star" />
        <Sparkles className="absolute top-20 left-1/3 w-6 h-6 text-[#00B9FC] opacity-70 animated-star" />
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-sm bg-white/10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backRoute)}
              className="text-white hover:text-[#CFE2FF] hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-white">My Lessons Book</h1>
            <div />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px', position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ 
            fontSize: '36px', 
            fontWeight: '700', 
            color: '#FFFFFF', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            Practice Stories & Lessons
            <BookOpen style={{ width: '40px', height: '40px', color: '#00B9FC' }} />
          </h2>
          <p style={{ fontSize: '20px', color: TEXT_MUTED, fontWeight: '400' }}>
            Read amazing stories and improve your speaking skills!
          </p>
        </div>

        {isLoadingContent ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '500' }}>Loading lessons...</p>
          </div>
        ) : contentItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '500' }}>No lessons available yet.</p>
          </div>
        ) : (
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '32px',
              width: '100%'
            }}
          >
            {contentItems.map((item) => {
              const IconComponent = getItemIcon(item.id)
              const gradient = getItemGradient(item.id)
              
              // Extract gradient colors for inline style
              const gradientMap: { [key: string]: { from: string; to: string } } = {
                "from-[#3B82F6] to-[#00B9FC]": { from: "#3B82F6", to: "#00B9FC" },
                "from-[#1E3A8A] to-[#3B82F6]": { from: "#1E3A8A", to: "#3B82F6" },
                "from-[#00B9FC] to-[#3B82F6]": { from: "#00B9FC", to: "#3B82F6" },
                "from-[#6366F1] to-[#8B5CF6]": { from: "#6366F1", to: "#8B5CF6" },
                "from-[#EC4899] to-[#F43F5E]": { from: "#EC4899", to: "#F43F5E" },
                "from-[#F59E0B] to-[#EF4444]": { from: "#F59E0B", to: "#EF4444" },
                "from-[#10B981] to-[#059669]": { from: "#10B981", to: "#059669" },
                "from-[#8B5CF6] to-[#EC4899]": { from: "#8B5CF6", to: "#EC4899" },
              }
              const gradientColors = gradientMap[gradient] || { from: "#3B82F6", to: "#00B9FC" }
              
              return (
                <Card
                  key={item.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: 'none',
                    borderRadius: '20px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-12px) scale(1.02)'
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.3), 0 8px 16px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)'
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)'
                  }}
                  onClick={() => handleLessonSelect(item)}
                >
                  {isTeacher && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteLesson(e, item)}
                      aria-label="Delete lesson"
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 10,
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#EF4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'
                        e.currentTarget.style.transform = 'scale(1.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <Trash2 style={{ width: '18px', height: '18px' }} />
                    </button>
                  )}
                  <CardHeader style={{ padding: '24px 24px 16px 24px' }}>
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        background: `linear-gradient(135deg, ${gradientColors.from} 0%, ${gradientColors.to} 100%)`,
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px auto',
                        boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.5s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.25) rotate(6deg)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
                      }}
                    >
                      <IconComponent 
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          color: '#FFFFFF',
                          display: 'block'
                        }} 
                      />
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: '#3B82F6',
                          display: 'inline-block',
                        }}
                      >
                        Chapter {item.chapter || "1"}
                      </span>
                    </div>
                    <CardTitle
                      style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        textAlign: 'center',
                        color: CARD_TEXT,
                        marginTop: '8px',
                        marginBottom: '8px',
                        lineHeight: '1.4',
                        transition: 'color 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#3B82F6'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = CARD_TEXT
                      }}
                    >
                      {item.title}
                    </CardTitle>
                    <p
                      style={{
                        fontSize: '14px',
                        textAlign: 'center',
                        marginTop: '8px',
                        color: 'rgba(15, 31, 71, 0.75)',
                        fontWeight: '500',
                      }}
                    >
                      {item.className}
                    </p>
                  </CardHeader>
                  <CardContent style={{ padding: '0 24px 24px 24px', textAlign: 'center' }}>
                    <button
                      style={{
                        background: `linear-gradient(135deg, ${gradientColors.from} 0%, ${gradientColors.to} 100%)`,
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '25px',
                        padding: '10px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                        transition: 'all 0.2s ease',
                        width: '100%',
                        minHeight: '40px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9'
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1'
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLessonSelect(item)
                      }}
                    >
                      Start Reading!
                    </button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const renderLessonDetail = () => {
    if (!selectedLesson) return null

    const IconComponent = getItemIcon(selectedLesson.id)
    const gradient = getItemGradient(selectedLesson.id)
    
    // Get extracted PDF text for this lesson
    const fullPdfText = getPdfText(selectedLesson.id) || ""
    
    // Truncate to 300 words max (API requirement) while preserving sentences
    const extractedPdfText = fullPdfText ? truncateTextToWords(fullPdfText, 300) : ""
    
    // Always use scripted endpoint (license requirement)
    const speechEndpoint = "https://apis.languageconfidence.ai/speech-assessment/scripted/uk"

    // Extract gradient colors for lessonColor prop
    const gradientMap: { [key: string]: string } = {
      "from-[#3B82F6] to-[#00B9FC]": "from-blue-500 to-cyan-400",
      "from-[#1E3A8A] to-[#3B82F6]": "from-blue-700 to-blue-500",
      "from-[#00B9FC] to-[#3B82F6]": "from-cyan-400 to-blue-500",
      "from-[#6366F1] to-[#8B5CF6]": "from-indigo-500 to-purple-500",
      "from-[#EC4899] to-[#F43F5E]": "from-pink-500 to-rose-500",
      "from-[#F59E0B] to-[#EF4444]": "from-amber-500 to-red-500",
      "from-[#10B981] to-[#059669]": "from-emerald-500 to-emerald-600",
      "from-[#8B5CF6] to-[#EC4899]": "from-purple-500 to-pink-500",
    }
    const lessonColor = gradientMap[gradient] || "from-blue-500 to-cyan-400"

    const handleApiResponse = (responseData: any) => {
      console.log("AudioRecorder API response:", responseData)
      const apiResponse = responseData?.apiResponse || responseData
      const audioUrl = responseData?.audioUrl || null
      
      // Navigate to SpeechAssessmentResults page with the API response and audio URL
      if (apiResponse && !apiResponse.error) {
        navigate("/my-lessons/results", {
          state: {
            apiResponse: apiResponse,
            audioUrl,
            backRoute: location.pathname || "/my-lessons",
            lessonTitle: selectedLesson?.title,
            lessonId: selectedLesson?.id,
          }
        })
      }
    }

    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={BLURRY_BLUE_BG} />

        <style>{`
          @keyframes float {
            0%,
            100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          @keyframes glow {
            0%,
            100% {
              box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
            }
            50% {
              box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
            }
          }
          .animated-star {
            animation: float 3s ease-in-out infinite;
          }
          .glow-blue {
            animation: glow 2s ease-in-out infinite;
          }
          @media (max-width: 768px) {
            .lesson-content-wrapper {
              flex-direction: column !important;
              gap: 1rem !important;
              padding-bottom: 120px !important;
            }
            .lesson-pdf-wrapper {
              width: 100% !important;
              padding-right: 0 !important;
            }
            .desktop-audio-recorder {
              display: none !important;
            }
          }
        `}</style>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-3 h-3 bg-[#3B82F6] rounded-full opacity-70 animated-star" />
          <Sparkles className="absolute top-20 left-1/3 w-6 h-6 text-[#00B9FC] opacity-70 animated-star" />
        </div>

        <header className="sticky top-0 z-50 backdrop-blur-sm bg-white/10 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("lesson-list")}
                className="text-white hover:text-[#CFE2FF] hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Lessons
              </Button>
              <h1 className="text-xl font-bold text-white truncate max-w-md">{selectedLesson.title}</h1>
              <div className="w-32"></div>
            </div>
          </div>
        </header>

        <div>
          <ScrollArea className="h-[calc(100vh-64px)]">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
              <div className="flex gap-12 items-center lesson-content-wrapper min-h-[calc(100vh-64px)]">
                {/* PDF Viewer and Header - Left side (flex-1, takes most space) */}
                <div className="flex-1 min-w-0 pr-4 lesson-pdf-wrapper">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-white/20">
                    {/* Header Card */}
                    <Card className="bg-white neumorphic-card border-0 shadow-xl mb-6">
                      <CardHeader className="text-center">
                        <div
                          className={`w-15 h-15 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center mb-5 mx-auto shadow-lg glow-blue animated-star`}
                        >
                          <IconComponent className="w-12 h-12 text-white" />
                        </div>
                        <div className="mb-2">
                          <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6]">
                            Chapter {selectedLesson.chapter || "N/A"}
                          </span>
                        </div>
                        <CardTitle className="text-2xl mb-2" style={{ color: CARD_TEXT }}>
                          {selectedLesson.title}
                        </CardTitle>
                        <p style={{ color: "rgba(15,31,71,0.75)" }}>{selectedLesson.className}</p>
                      </CardHeader>
                    </Card>

                    {/* PDF Viewer */}
                    <Card className="bg-white neumorphic-card border-0 shadow-xl">
                      <CardContent className="p-6">
                        {selectedLesson.pdfUrl ? (
                          <div className="w-full" style={{ height: "calc(100vh - 350px)", minHeight: "600px" }}>
                            <iframe
                              src={`${selectedLesson.pdfUrl}#toolbar=0&navpanes=0&zoom=100&scrollbar=1&view=FitH`}
                              className="w-full h-full border-0 rounded-lg"
                              title={selectedLesson.title}
                            />
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <p style={{ color: "rgba(15,31,71,0.75)" }}>PDF not available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* AudioRecorder - Right side, fixed width, centered */}
                <div className="w-[400px] flex-shrink-0 desktop-audio-recorder">
                  <div className="bg-white/95 rounded-2xl shadow-2xl p-8 border-0 audio-recorder-card w-full">
                    <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6 text-center audio-recorder-title">Practice Your Speaking</h2>
                    <AudioRecorder 
                      expectedText={extractedPdfText}
                      lessonColor={lessonColor}
                      endpoint={speechEndpoint}
                      onApiResponse={handleApiResponse}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  }

  return (
    <>
      {isExtractingPdf && (
        <PdfLoadingScreen lessonTitle={selectedLesson?.title} />
      )}
      {currentView === "lesson-list" ? renderLessonList() : renderLessonDetail()}
    </>
  )
}
