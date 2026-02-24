"use client"

import { useState, useEffect, useRef, CSSProperties } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "./ui/dialog"
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Sparkles,
  Star,
  Book,
  Upload,
  CheckCircle2,
  XCircle,
  BookOpen,
  GraduationCap,
  School,
  BookMarked,
  Notebook,
  BookCheck,
  BookA,
  BookX,
  Award,
  Rocket,
  Globe,
  Lightbulb,
  Target,
  Zap,
} from "lucide-react"
import { ScrollArea } from "./ui/scroll-area"
import { AudioRecorder } from "./audioRecorder"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "sonner"
import { PdfLoadingScreen } from "./PdfLoadingScreen"
import { getPdfTextForLesson, getPdfText, truncateTextToWords } from "../utils/pdfTextExtractor"

interface CustomContentProps {
  onBack?: () => void
}

type View = "list" | "detail"

interface CustomContentItem {
  id: string
  title: string
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

export function CustomContent({ onBack }: CustomContentProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const backRoute = (location.state as any)?.backRoute || "/speaking-modules"
  const { token, authData } = useAuth()
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(backRoute)
    }
  }
  
  const [currentView, setCurrentView] = useState<View>("list")
  const [contentItems, setContentItems] = useState<CustomContentItem[]>([])
  const [isLoadingContent, setIsLoadingContent] = useState(true)
  const [selectedItem, setSelectedItem] = useState<CustomContentItem | null>(null)
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)

  // Upload dialog state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")

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

  // Helper function to map API response to CustomContentItem
  const mapApiItemToContentItem = (item: any): CustomContentItem => {
    console.log("Mapping item:", item)
    const mapped = {
      id: item.id?.toString() || item.content_id?.toString() || item.custom_pdf_id?.toString() || Date.now().toString(),
      title: item.title || item.name || "",
      pdfUrl: item.pdf_url || item.pdfUrl || item.pdf_url || "",
      uploadDate: item.upload_date || item.uploadDate || item.created_at || item.date_created || new Date().toISOString().split("T")[0],
    }
    console.log("Mapped result:", mapped)
    return mapped
  }

  // Fetch custom content items from API
  useEffect(() => {
    const fetchContentItems = async () => {
      if (!token) {
        setIsLoadingContent(false)
        return
      }

      try {
        setIsLoadingContent(true)
        // Use the custom PDF list API endpoint
        const response = await fetch("https://api.intelliviq.com/api/speaking/custom-pdf/list.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status}`)
        }

        const data = await response.json()
        console.log("Custom PDF list API response (full):", JSON.stringify(data, null, 2))

        // Handle different response formats
        let items: CustomContentItem[] = []
        let rawItems: any[] = []
        
        // Try different possible response structures
        if (data.success && Array.isArray(data.data)) {
          rawItems = data.data
        } else if (Array.isArray(data)) {
          rawItems = data
        } else if (data.data && Array.isArray(data.data)) {
          rawItems = data.data
        } else if (data.custom_pdfs && Array.isArray(data.custom_pdfs)) {
          rawItems = data.custom_pdfs
        } else if (data.items && Array.isArray(data.items)) {
          rawItems = data.items
        } else if (data.result && Array.isArray(data.result)) {
          rawItems = data.result
        } else {
          // If it's an object with keys that might be arrays, try to find any array
          console.warn("Unexpected response format, trying to find array in:", Object.keys(data))
          for (const key in data) {
            if (Array.isArray(data[key])) {
              console.log(`Found array in key: ${key}`)
              rawItems = data[key]
              break
            }
          }
        }

        console.log("Raw items found:", rawItems.length, rawItems)
        
        if (rawItems.length > 0) {
          items = rawItems.map(mapApiItemToContentItem)
        }

        // Don't filter - show all items even if pdfUrl is missing for debugging
        console.log("All mapped items (before filter):", items)
        
        // Filter out items without PDF URL but log them
        const validItems = items.filter(item => {
          if (!item.pdfUrl) {
            console.warn("Item without pdfUrl (will be filtered):", item)
            return false
          }
          return true
        })

        console.log("Final valid items:", validItems.length, validItems)
        setContentItems(validItems)
        
        if (validItems.length === 0 && rawItems.length > 0) {
          console.error("All items were filtered out! Check pdfUrl field names.")
          toast.error("Items found but pdfUrl field is missing. Check console for details.")
        }
      } catch (error) {
        console.error("Error fetching custom content:", error)
        toast.error("Failed to load custom content. Please try again.")
        setContentItems([])
      } finally {
        setIsLoadingContent(false)
      }
    }

    fetchContentItems()
  }, [token])

  // Debug: Log when contentItems changes
  useEffect(() => {
    console.log("Content items updated:", contentItems.length, "items", contentItems)
  }, [contentItems])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please select a PDF file only")
        event.target.value = ""
        setSelectedFile(null)
        return
      }
      setSelectedFile(file)
      setErrorMessage("")
    }
  }

  // Smooth progress animation helper
  const animateProgress = (targetProgress: number, duration: number = 1000) => {
    return new Promise<void>((resolve) => {
      const startProgress = uploadProgress
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const currentProgress = startProgress + (targetProgress - startProgress) * progress
        setUploadProgress(currentProgress)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }
      animate()
    })
  }

  const handleUpload = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a title")
      return
    }
    if (!selectedFile) {
      toast.error("Please select a PDF file")
      return
    }

    if (selectedFile.type !== "application/pdf") {
      toast.error("Only PDF files are allowed")
      return
    }

    setIsUploading(true)
    setUploadStatus("uploading")
    setUploadProgress(0)
    setErrorMessage("")

    try {
      await animateProgress(30, 800)
      
      const formData = new FormData()
      formData.append("file", selectedFile)
      // Add folder path for Custom-Content (pdfs/Custom-Content in DigitalOcean Spaces)
      formData.append("folder", "pdfs/Custom-Content")

      const uploadResponse = await fetch("https://api.intelliviq.com/upload-pdf", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("PDF upload failed")
      }

      const { publicUrl } = await uploadResponse.json()

      await animateProgress(70, 800)

      if (!token) {
        throw new Error("Authentication token not available. Please log in again.")
      }

      // Use the custom PDF save endpoint
      const saveMetadataResponse = await fetch("https://api.intelliviq.com/api/speaking/custom-pdf/save.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          pdf_url: publicUrl,
        }),
      })

      if (!saveMetadataResponse.ok) {
        const errorText = await saveMetadataResponse.text()
        console.error("Save error:", errorText)
        throw new Error("Failed to save custom PDF metadata")
      }

      await animateProgress(100, 800)

      const savedData = await saveMetadataResponse.json()
      console.log("Save API response:", savedData)

      setUploadStatus("success")
      
      const newItem: CustomContentItem = {
        id: savedData.id?.toString() || savedData.data?.id?.toString() || Date.now().toString(),
        title: newTitle.trim(),
        pdfUrl: publicUrl,
        uploadDate: savedData.created_at || savedData.upload_date || new Date().toISOString().split("T")[0],
      }
      
      console.log("New item created:", newItem)
      
      setContentItems(prevItems => {
        const exists = prevItems.some(item => item.id === newItem.id)
        if (exists) {
          console.log("Item already exists, not adding duplicate")
          return prevItems
        }
        console.log("Adding new item to list, current items:", prevItems.length)
        return [newItem, ...prevItems]
      })
      
      toast.success("Content uploaded successfully!")
      
      // Refresh the list from API after a short delay
      setTimeout(async () => {
        if (!token) return
        
        try {
          const response = await fetch("https://api.intelliviq.com/api/speaking/custom-pdf/list.php", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log("Refresh - Custom PDF list API response (full):", JSON.stringify(data, null, 2))
            
            // Handle different response formats (same as initial fetch)
            let items: CustomContentItem[] = []
            let rawItems: any[] = []
            
            if (data.success && Array.isArray(data.data)) {
              rawItems = data.data
            } else if (Array.isArray(data)) {
              rawItems = data
            } else if (data.data && Array.isArray(data.data)) {
              rawItems = data.data
            } else if (data.custom_pdfs && Array.isArray(data.custom_pdfs)) {
              rawItems = data.custom_pdfs
            } else if (data.items && Array.isArray(data.items)) {
              rawItems = data.items
            } else if (data.result && Array.isArray(data.result)) {
              rawItems = data.result
            } else {
              // Try to find any array in the response
              for (const key in data) {
                if (Array.isArray(data[key])) {
                  console.log(`Refresh - Found array in key: ${key}`)
                  rawItems = data[key]
                  break
                }
              }
            }

            console.log("Refresh - Raw items found:", rawItems.length, rawItems)
            
            if (rawItems.length > 0) {
              items = rawItems.map(mapApiItemToContentItem)
            }
            
            console.log("Refresh - All mapped items (before filter):", items)
            
            const validItems = items.filter(item => {
              if (!item.pdfUrl) {
                console.warn("Refresh - Item without pdfUrl (will be filtered):", item)
                return false
              }
              return true
            })
            
            console.log("Refresh - Final valid items:", validItems.length, validItems)
            
            // Only update if we got valid items from the API
            // This ensures we don't clear the optimistic update if the API hasn't synced yet
            if (validItems.length > 0) {
              console.log("Refresh - Updating content items from API")
              setContentItems(validItems)
            } else if (rawItems.length > 0) {
              console.error("Refresh - All items were filtered out! Keeping current items.")
              // Don't clear items if they were filtered out - keep the optimistic update
            } else {
              console.warn("Refresh - No items found in response, keeping current items")
              // Don't clear items - keep the optimistic update
            }
          } else {
            console.error("Refresh - API call failed:", response.status, response.statusText)
            // Don't clear items on API failure
          }
        } catch (error) {
          console.error("Error refreshing content list:", error)
          // Don't clear items on error
        }
      }, 2000) // Increased delay to ensure backend has processed the upload
      
    setTimeout(() => {
        resetForm()
      }, 2000)

    } catch (error) {
      setUploadStatus("error")
      setUploadProgress(0)
      const errorMsg = error instanceof Error ? error.message : "Upload failed. Please try again."
      setErrorMessage(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setNewTitle("")
    setSelectedFile(null)
    setUploadProgress(0)
    setUploadStatus("idle")
    setErrorMessage("")
    setIsUploadDialogOpen(false)
  }

  const handleItemSelect = async (item: CustomContentItem) => {
    if (item.pdfUrl) {
      try {
        setIsExtractingPdf(true)
        
        await getPdfTextForLesson(item.id, item.pdfUrl, {
          onProgress: (stage) => {
            if (stage === 'complete') {
              setIsExtractingPdf(false)
            }
          }
        })

        setSelectedItem(item)
        setCurrentView("detail")
      } catch (error) {
        console.error('Error extracting PDF text:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (!errorMessage.includes('Failed to fetch') && !errorMessage.includes('ERR_CONNECTION_REFUSED')) {
          toast.error('Failed to process PDF. Showing content anyway.')
        }
        setSelectedItem(item)
        setCurrentView("detail")
        setIsExtractingPdf(false)
      }
    } else {
      setSelectedItem(item)
      setCurrentView("detail")
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) {
      return
    }

    try {
      if (!token) {
        toast.error("Authentication required")
        return
      }

      const response = await fetch("https://api.intelliviq.com/api/speaking/custom-pdf/delete.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: parseInt(id) || id,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Delete error:", errorText)
        throw new Error("Failed to delete content")
      }

      setContentItems(prevItems => prevItems.filter(item => item.id !== id))
      toast.success("Content deleted successfully!")
    } catch (error) {
      console.error("Error deleting content:", error)
      toast.error("Failed to delete content. Please try again.")
    }
  }

  const handleApiResponse = (responseData: any) => {
    console.log("AudioRecorder API response:", responseData)
    const apiResponse = responseData?.apiResponse || responseData
    const audioUrl = responseData?.audioUrl || null
    
    if (apiResponse && !apiResponse.error) {
      navigate("/custom-content/results", {
        state: {
          apiResponse: apiResponse,
          audioUrl,
          backRoute: location.pathname || "/custom-content",
          lessonTitle: selectedItem?.title,
          lessonId: selectedItem?.id,
        }
      })
    }
  }

  const renderList = () => (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10" style={BLURRY_BLUE_BG} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.8); }
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
              onClick={handleBack}
              className="text-white hover:text-[#CFE2FF] hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
                    </Button>
            <h1 className="text-xl font-bold text-white">Custom Content</h1>
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
            Your Custom Content
            <BookOpen style={{ width: '40px', height: '40px', color: '#00B9FC' }} />
          </h2>
          <p style={{ fontSize: '20px', color: TEXT_MUTED, fontWeight: '400' }}>
            Upload PDFs and practice your speaking skills!
          </p>
                </div>

        <div className="mb-8 text-center">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
                <Button
                style={{
                  background: "linear-gradient(135deg, #3B82F6 0%, #00B9FC 100%)",
                  color: "#FFFFFF",
                  borderRadius: "12px",
                  padding: "18px 36px",
                  fontSize: "18px",
                  boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontWeight: 600,
                  minHeight: "56px",
                }}
              >
                <Upload style={{ width: "24px", height: "24px" }} />
                Upload PDF
                </Button>
            </DialogTrigger>
            <DialogContent style={{
              backgroundColor: "#FFFFFF",
              maxWidth: "600px",
              width: "90vw",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: "16px",
            }}>
              <DialogHeader>
                <DialogTitle style={{ color: "#0F1F47", fontSize: "20px", fontWeight: 600 }}>
                  <Upload style={{ width: "20px", height: "20px", color: "#3B82F6", display: "inline", marginRight: "12px" }} />
                  Upload Custom Content
                </DialogTitle>
                <DialogDescription style={{ color: "rgba(15, 31, 71, 0.7)", fontSize: "14px", marginTop: "8px" }}>
                  Upload a PDF file to practice your speaking skills
                </DialogDescription>
              </DialogHeader>
              
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <Label htmlFor="title" style={{ color: "#0F1F47", fontWeight: 500, fontSize: "14px" }}>
                    Title <span style={{ color: "#EF4444" }}>*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter content title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    disabled={isUploading}
            style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      height: "44px",
                      padding: "0 12px",
                      fontSize: "14px",
                      backgroundColor: isUploading ? "#F3F4F6" : "#FFFFFF",
                      color: "#0F1F47",
                    }}
                  />
      </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <Label htmlFor="file" style={{ color: "#0F1F47", fontWeight: 500, fontSize: "14px" }}>
                    PDF File <span style={{ color: "#EF4444" }}>*</span>
            </Label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="file"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={isUploading}
        style={{
                        position: "absolute",
                        width: "0.1px",
                        height: "0.1px",
                        opacity: 0,
                        overflow: "hidden",
                        zIndex: -1,
                      }}
                    />
                    <label
                      htmlFor="file"
        style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "44px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        padding: "0 16px",
                        fontSize: "14px",
                        backgroundColor: isUploading ? "#F3F4F6" : "#FFFFFF",
                        cursor: isUploading ? "not-allowed" : "pointer",
                        color: selectedFile ? "#0F1F47" : "rgba(15, 31, 71, 0.6)",
                        fontWeight: selectedFile ? 500 : 400,
                      }}
                    >
                      {selectedFile ? selectedFile.name : (
                        <>
                          <Upload style={{ width: "16px", height: "16px", marginRight: "8px", color: "#3B82F6" }} />
                          Choose file
                        </>
                      )}
                    </label>
            </div>
          </div>

                {isUploading && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px" }}>
                      <span style={{ color: "#0F1F47", fontWeight: 500 }}>Upload Progress</span>
                      <span style={{ color: "#3B82F6", fontWeight: 600 }}>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div style={{
                      position: "relative",
                      height: "12px",
                      width: "100%",
                      backgroundColor: "#E5E7EB",
                      borderRadius: "9999px",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        background: "linear-gradient(90deg, #3B82F6 0%, #00B9FC 100%)",
                        borderRadius: "9999px",
                        transition: "width 0.3s ease-out",
                        width: `${uploadProgress}%`,
                      }} />
                    </div>
                  </div>
                )}

                {uploadStatus === "error" && errorMessage && (
                  <div style={{
                    padding: "16px",
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "8px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <XCircle style={{ width: "20px", height: "20px", color: "#EF4444", flexShrink: 0, marginTop: "2px" }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "14px", fontWeight: 500, color: "#991B1B", margin: "0 0 4px 0" }}>
                          Upload Failed
                        </p>
                        <p style={{ fontSize: "12px", color: "#B91C1C", margin: 0 }}>
                          {errorMessage}
            </p>
            </div>
          </div>
                  </div>
                )}

                {uploadStatus === "success" && (
                  <div style={{
                    padding: "16px",
                    backgroundColor: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    borderRadius: "8px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <CheckCircle2 style={{ width: "20px", height: "20px", color: "#10B981", flexShrink: 0, marginTop: "2px" }} />
                      <p style={{ fontSize: "14px", fontWeight: 500, color: "#065F46", margin: 0 }}>
                        Content uploaded successfully!
                      </p>
                    </div>
                  </div>
                )}
          </div>

              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                padding: "16px 24px 24px 24px",
                borderTop: "1px solid #E5E7EB",
              }}>
            <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={isUploading}
                  style={{
                    border: "1px solid #E5E7EB",
                    color: "#0F1F47",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: isUploading ? "not-allowed" : "pointer",
                    opacity: isUploading ? 0.5 : 1,
                  }}
                >
                  {uploadStatus === "success" ? "Close" : "Cancel"}
            </Button>
            <Button
                  onClick={handleUpload}
                  disabled={isUploading || !newTitle.trim() || !selectedFile || uploadStatus === "success"}
                  style={{
                    background: "linear-gradient(135deg, #3B82F6 0%, #00B9FC 100%)",
                    color: "#FFFFFF",
                    borderRadius: "12px",
                    padding: "8px 20px",
                    boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: (isUploading || !newTitle.trim() || !selectedFile || uploadStatus === "success") ? "not-allowed" : "pointer",
                    opacity: (isUploading || !newTitle.trim() || !selectedFile || uploadStatus === "success") ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isUploading ? (
                    <>
                      <Upload style={{ width: "16px", height: "16px" }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload style={{ width: "16px", height: "16px" }} />
                      Upload
                    </>
                  )}
            </Button>
          </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoadingContent ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '500' }}>Loading content...</p>
          </div>
        ) : contentItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Book style={{ width: '64px', height: '64px', color: '#FFFFFF', opacity: 0.5, margin: '0 auto 16px' }} />
            <p style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '500' }}>No custom content yet.</p>
            <p style={{ color: TEXT_MUTED, fontSize: '14px', marginTop: '8px' }}>Upload your first PDF to get started!</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '32px',
            width: '100%'
          }}>
            {contentItems.map((item) => {
              const IconComponent = getItemIcon(item.id)
              const gradient = getItemGradient(item.id)
              
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
                  onClick={() => handleItemSelect(item)}
                >
                  <CardHeader style={{ padding: '24px 24px 16px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div
        style={{
                          width: '80px',
                          height: '80px',
                          background: `linear-gradient(135deg, ${gradientColors.from} 0%, ${gradientColors.to} 100%)`,
                          borderRadius: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
                          transition: 'all 0.5s ease',
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteItem(item.id)
                        }}
          style={{
                          color: '#EF4444',
                          padding: '4px 8px',
          }}
        >
                        <Trash2 style={{ width: '16px', height: '16px' }} />
                      </Button>
            </div>
            <CardTitle
                      style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: CARD_TEXT,
                        marginTop: '8px',
                        marginBottom: '8px',
                        lineHeight: '1.4',
                      }}
                    >
                      {item.title}
            </CardTitle>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'rgba(15, 31, 71, 0.6)',
                        marginTop: '8px',
                      }}
                    >
                      {new Date(item.uploadDate).toLocaleDateString()}
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleItemSelect(item)
                      }}
                    >
                      Start Practicing!
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

  const renderDetail = () => {
    if (!selectedItem) return null

    const IconComponent = getItemIcon(selectedItem.id)
    const gradient = getItemGradient(selectedItem.id)
    
    // Get extracted PDF text for this item
    const fullPdfText = getPdfText(selectedItem.id) || ""
    
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

  return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={BLURRY_BLUE_BG} />

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.4); }
            50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.8); }
          }
          .animated-star {
            animation: float 3s ease-in-out infinite;
          }
          .glow-blue {
            animation: glow 2s ease-in-out infinite;
          }
          @media (max-width: 768px) {
            .content-wrapper {
              flex-direction: column !important;
              gap: 1rem !important;
              padding-bottom: 120px !important;
            }
            .pdf-wrapper {
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
                onClick={() => setCurrentView("list")}
                className="text-white hover:text-[#CFE2FF] hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Content
              </Button>
              <h1 className="text-xl font-bold text-white truncate max-w-md">{selectedItem.title}</h1>
              <div className="w-32"></div>
            </div>
          </div>
        </header>

        <div>
          <ScrollArea className="h-[calc(100vh-64px)]">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
              <div className="flex gap-12 items-center content-wrapper min-h-[calc(100vh-64px)]">
                {/* PDF Viewer - Left side */}
                <div className="flex-1 min-w-0 pr-4 pdf-wrapper">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-white/20">
                    {/* Header Card */}
                    <Card className="bg-white border-0 shadow-xl mb-6">
                      <CardHeader className="text-center">
                        <div
                          className={`w-15 h-15 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center mb-5 mx-auto shadow-lg glow-blue animated-star`}
                          style={{ width: '60px', height: '60px' }}
                        >
                          <IconComponent className="w-12 h-12 text-white" />
          </div>
                        <CardTitle className="text-2xl mb-2" style={{ color: CARD_TEXT }}>
                          {selectedItem.title}
                        </CardTitle>
                        <p style={{ color: "rgba(15,31,71,0.75)" }}>Custom Content</p>
                      </CardHeader>
                    </Card>

                    {/* PDF Viewer */}
                    <Card className="bg-white border-0 shadow-xl">
                      <CardContent className="p-6">
                        {selectedItem.pdfUrl ? (
                          <div className="w-full" style={{ height: "calc(100vh - 350px)", minHeight: "600px" }}>
                            <iframe
                              src={`${selectedItem.pdfUrl}#toolbar=0&navpanes=0&zoom=100&scrollbar=1&view=FitH`}
                              className="w-full h-full border-0 rounded-lg"
                              title={selectedItem.title}
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

                {/* AudioRecorder - Right side */}
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
        <PdfLoadingScreen lessonTitle={selectedItem?.title} />
      )}
      {currentView === "list" ? renderList() : renderDetail()}
    </>
  )
}
