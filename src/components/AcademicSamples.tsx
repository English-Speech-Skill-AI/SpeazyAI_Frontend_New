"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeft } from "lucide-react"
import { ClassCard } from "./ClassCard"
import { PDFViewer } from "./PDFViewer"
import { RecordingSection } from "./RecordingSection"
import { ResultsSection } from "./ResultsSection"
import { generateClassesData } from "./data"
import type { RecordingState, ClassData, Chapter } from "./types"
import { useLocalizedNavigate } from "./LocaleLayout"
import { PageHeader } from "./PageHeader"
import type { CSSProperties } from "react"
import { useAuth } from "../contexts/AuthContext"

interface AcademicSamplesProps {
  onBack?: () => void
}

export function AcademicSamples({ onBack }: AcademicSamplesProps) {
  const navigate = useLocalizedNavigate()
  const { authData } = useAuth()
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<{
    classData: ClassData
    chapter: Chapter
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [audioLevel, setAudioLevel] = useState<number[]>([])
  const [recordingScore, setRecordingScore] = useState<number | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const allClassesData = generateClassesData()

  // Filter classes based on user's classes from API response
  const classesData = useMemo(() => {
    const userClass = authData?.user?.class
    
    // If no user classes specified, return all classes
    if (!userClass) {
      return allClassesData
    }

    // Normalize userClass to array format (API can return string or array)
    const userClasses = Array.isArray(userClass) ? userClass : [userClass]

    // If empty array, return all classes
    if (userClasses.length === 0) {
      return allClassesData
    }

    // Extract class numbers from user's classes (e.g., "10-D" -> 10)
    const userClassNumbers = userClasses.map((userClass: string) => {
      // Extract number from class string (e.g., "10-D" -> 10, "Class 5" -> 5)
      const match = userClass.match(/\d+/)
      return match ? parseInt(match[0], 10) : null
    }).filter((num: number | null) => num !== null) as number[]

    // Filter classes that match user's class numbers
    return allClassesData.filter((classItem) => {
      // Extract class number from class title (e.g., "Class 10" -> 10)
      const classMatch = classItem.title.match(/\d+/)
      const classNumber = classMatch ? parseInt(classMatch[0], 10) : null
      
      // Check if this class number is in the user's classes
      return classNumber !== null && userClassNumbers.includes(classNumber)
    })
  }, [authData?.user?.class, allClassesData])

  // Simulate audio levels for waveform
  useEffect(() => {
    if (recordingState === "recording") {
      const interval = setInterval(() => {
        const newLevels = Array.from({ length: 40 }, () => Math.random() * 100)
        setAudioLevel(newLevels)
      }, 80)
      return () => clearInterval(interval)
    }
  }, [recordingState])

  const handleClassToggle = (classId: string) => {
    setExpandedClass(expandedClass === classId ? null : classId)
  }

  const handleChapterSelect = (classData: ClassData, chapter: Chapter) => {
    navigate(`/academic-samples/chapter/${chapter.id}`, {
      state: { classData, chapter },
    })
  }

  const handleBackToClasses = () => {
    navigate("/academic-samples")
  }

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 10, 150))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 10, 70))
  }

  const handleResetZoom = () => {
    setZoomLevel(100)
  }

  const handleNextPage = () => {
    if (selectedChapter && currentPage < selectedChapter.chapter.pages.length - 1) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1)
    }
  }

  const handleRecord = () => {
    if (recordingState === "idle") {
      setRecordingState("recording")
      setRecordingScore(null)
    }
  }

  const handleStop = () => {
    setRecordingState("stopped")
    const score = Math.floor(Math.random() * 30) + 70
    setRecordingScore(score)

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 300)
  }

  const handleTryAgain = () => {
    setRecordingState("idle")
    setRecordingScore(null)
    setAudioLevel([])
  }

  const BLUE_BG: CSSProperties = {
    backgroundColor: "#1E3A8A",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  }

  // Main Class Selection View
  if (!selectedChapter) {
    return (
      <div className="h-screen flex flex-col relative overflow-x-hidden w-full">
        <div className="absolute inset-0 -z-10" style={BLUE_BG} />
        <PageHeader />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (onBack) {
                  onBack()
                } else {
                  const backRoute = "/speaking-modules"
                  navigate(backRoute)
                }
              }}
              className="text-white hover:bg-white/10 mb-4 rounded-2xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
              <h2 className="text-5xl text-white mb-4">Choose Your Class</h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Explore engaging content tailored to your grade level
              </p>
            </motion.div>

            <div className="space-y-4">
              {classesData.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ClassCard
                    classData={classItem}
                    isExpanded={expandedClass === classItem.id}
                    onToggle={() => handleClassToggle(classItem.id)}
                    onChapterSelect={(chapter) => handleChapterSelect(classItem, chapter)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Chapter Content View
  const { classData, chapter } = selectedChapter

  return (
    <div className="h-screen flex flex-col relative overflow-x-hidden w-full">
      <div className="absolute inset-0 -z-10" style={BLUE_BG} />
      <PageHeader />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToClasses}
            className="text-white hover:bg-white/10 mb-4 rounded-2xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Classes
          </Button>

          {/* PDF Viewer */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <PDFViewer
              classData={classData}
              chapter={chapter}
              currentPage={currentPage}
              zoomLevel={zoomLevel}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
              onPageSelect={setCurrentPage}
            />
          </motion.div>

          {/* Recording Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <RecordingSection
              recordingState={recordingState}
              audioLevel={audioLevel}
              gradient={classData.gradient}
              onRecord={handleRecord}
              onStop={handleStop}
            />
          </motion.div>

          {/* Results Section */}
          <AnimatePresence>
            {recordingScore !== null && (
              <ResultsSection ref={resultRef} score={recordingScore} onTryAgain={handleTryAgain} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
