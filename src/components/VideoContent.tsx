"use client"

import React, { useState } from "react"
import { useLocation } from "react-router-dom"
import { useLocalizedNavigate } from "./LocaleLayout"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { ArrowLeft, Play } from "lucide-react"

interface VideoCategory {
  id: string
  titleKey: string
  videos: VideoItem[]
}

interface VideoItem {
  id: string
  url: string
  title?: string
}

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

// Helper function to remove duplicate videos by video ID
function removeDuplicates(videos: VideoItem[]): VideoItem[] {
  const seen = new Set<string>()
  return videos.filter(video => {
    const videoId = extractVideoId(video.url) || video.id
    if (seen.has(videoId)) {
      return false
    }
    seen.add(videoId)
    return true
  })
}

// Parse YouTube links from the provided data (removing duplicates)
const videoCategories: VideoCategory[] = [
  {
    id: "all-phonemes",
    titleKey: "sampleVideos.completePhonemeGuide",
    videos: removeDuplicates([
      { id: "wBuA589kfMg", url: "https://www.youtube.com/watch?v=wBuA589kfMg" },
      { id: "43v0iSq-0T0", url: "https://www.youtube.com/watch?v=43v0iSq-0T0" },
      { id: "C2c0zG47k3k", url: "https://www.youtube.com/watch?v=C2c0zG47k3k" },
      { id: "9s5D8vX3Euo", url: "https://www.youtube.com/watch?v=9s5D8vX3Euo&list=PL3XrqNABEkr-LDgbg8ZjC1LeOZaoVli08&index=2" },
      { id: "3LD7m3luv0Y", url: "https://www.youtube.com/watch?v=3LD7m3luv0Y&list=PL3XrqNABEkr-LDgbg8ZjC1LeOZaoVli08&index=15" },
      { id: "svmmuYQPrI4", url: "https://www.youtube.com/watch?v=svmmuYQPrI4" },
      { id: "Q0TqoUSUjO0", url: "https://www.youtube.com/watch?v=Q0TqoUSUjO0" },
      { id: "Ft17a7tyjMM", url: "https://www.youtube.com/watch?v=Ft17a7tyjMM" },
      { id: "41m-igTNUkE", url: "https://www.youtube.com/watch?v=41m-igTNUkE" },
    ])
  },
  {
    id: "small-students",
    titleKey: "sampleVideos.learningForYoung",
    videos: removeDuplicates([
      { id: "58pw9qwY7bg", url: "https://www.youtube.com/watch?v=58pw9qwY7bg&t=319s" },
      { id: "vfnXDl4-bCw", url: "https://www.youtube.com/watch?v=vfnXDl4-bCw" },
      { id: "5b3LsKb44uU", url: "https://www.youtube.com/watch?v=5b3LsKb44uU" },
      { id: "EjOd6uPj_6c", url: "https://www.youtube.com/watch?v=EjOd6uPj_6c" },
      { id: "ChqnN3cKzXQ", url: "https://www.youtube.com/watch?v=ChqnN3cKzXQ" },
      { id: "4x_G21KhcEw", url: "https://www.youtube.com/watch?v=4x_G21KhcEw" },
      { id: "nPw7ap8zjMw", url: "https://www.youtube.com/watch?v=nPw7ap8zjMw" },
    ])
  },
  {
    id: "senior-students-ielts",
    titleKey: "sampleVideos.ieltsAdvanced",
    videos: removeDuplicates([
      { id: "W50Ojdu1_AE", url: "https://www.youtube.com/watch?v=W50Ojdu1_AE" },
      { id: "UMAVKA887dI", url: "https://www.youtube.com/watch?v=UMAVKA887dI" },
      { id: "Cy2v0g27huE", url: "https://www.youtube.com/watch?v=Cy2v0g27huE&t=1s" },
      { id: "X627czLUsGY", url: "https://www.youtube.com/watch?v=X627czLUsGY" },
      { id: "5yPtcBnP1fc", url: "https://www.youtube.com/watch?v=5yPtcBnP1fc" },
      { id: "Mpa9TYUpxgs", url: "https://www.youtube.com/watch?v=Mpa9TYUpxgs" },
      { id: "QxQUapA-2w4", url: "https://www.youtube.com/watch?v=QxQUapA-2w4" },
      { id: "hCon8Uq_Bas", url: "https://www.youtube.com/watch?v=hCon8Uq_Bas" },
      { id: "sMkzwmMs0jM", url: "https://www.youtube.com/watch?v=sMkzwmMs0jM" },
      { id: "N259P52yAkE", url: "https://www.youtube.com/watch?v=N259P52yAkE" },
      { id: "cHtVZTNXW6I", url: "https://www.youtube.com/watch?v=cHtVZTNXW6I&list=PL5146C9A4FD908B6D" },
      { id: "ETVV9Jo53CA", url: "https://www.youtube.com/watch?v=ETVV9Jo53CA" },
      { id: "jOE-wqMFPK0", url: "https://www.youtube.com/watch?v=jOE-wqMFPK0" },
      { id: "3Lxwdc3FB84", url: "https://www.youtube.com/watch?v=3Lxwdc3FB84" },
      { id: "cN-yQGMwcog", url: "https://www.youtube.com/watch?v=cN-yQGMwcog" },
      { id: "xJmUQxzMSEM", url: "https://www.youtube.com/watch?v=xJmUQxzMSEM" },
      { id: "rtHQQIBAQ6U", url: "https://www.youtube.com/watch?v=rtHQQIBAQ6U" },
      { id: "V3rx3em-ZKE", url: "https://www.youtube.com/watch?v=V3rx3em-ZKE&list=PLp5zSGEKWyU5fqwo6468YtDl-ZPv4VtVT" },
      { id: "u3LC6CoY4PI", url: "https://www.youtube.com/watch?v=u3LC6CoY4PI&list=PLp5zSGEKWyU5fqwo6468YtDl-ZPv4VtVT&index=2" },
    ])
  },
  {
    id: "tongue-twisters",
    titleKey: "sampleVideos.pronunciationPractice",
    videos: removeDuplicates([
      { id: "xPXu5GoUHH0", url: "https://www.youtube.com/watch?v=xPXu5GoUHH0" },
    ])
  },
]

export function VideoContent({ onBack }: { onBack?: () => void }) {
  const navigate = useLocalizedNavigate()
  const { t } = useTranslation()
  const location = useLocation()
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)

  const TEXT_LIGHT = "#F2F6FF"
  const TEXT_MUTED = "rgba(242,246,255,0.78)"

  // Dark blue background
  const BLUE_BG: React.CSSProperties = {
    backgroundColor: "#123A8A",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      // Use location state if available, otherwise default to reading-modules or dashboard
      const backRoute = (location.state as { backRoute?: string })?.backRoute || "/reading-modules"
      navigate(backRoute)
    }
  }

  const handleCategorySelect = (category: VideoCategory) => {
    setSelectedCategory(category)
    setSelectedVideo(null)
  }

  const handleVideoSelect = (video: VideoItem) => {
    setSelectedVideo(video)
  }

  // Render video grid
  const renderVideoGrid = (videos: VideoItem[]) => {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "1.75rem",
        padding: "1.5rem 0"
      }}>
        {videos.map((video) => {
          const videoId = extractVideoId(video.url) || video.id
          return (
            <Card
              key={video.id}
              onClick={() => handleVideoSelect(video)}
              style={{
                backgroundColor: "#FFFFFF",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                borderRadius: "12px",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px) scale(1.02)"
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(59, 130, 246, 0.25)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)"
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)"
              }}
            >
              <CardContent style={{ padding: 0 }}>
                <div style={{ 
                  position: "relative", 
                  paddingBottom: "56.25%",
                  backgroundColor: "#000000",
                  overflow: "hidden"
                }}>
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={video.title || "YouTube video"}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      borderRadius: "12px 12px 0 0"
                    }}
                  />
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "linear-gradient(to bottom, transparent 0%, transparent 60%, rgba(0,0,0,0.1) 100%)",
                    pointerEvents: "none",
                    borderRadius: "12px 12px 0 0"
                  }} />
                </div>
                {video.title && (
                  <div style={{ 
                    padding: "1rem",
                    background: "linear-gradient(to bottom, #FFFFFF, #FAFBFC)"
                  }}>
                    <p style={{
                      color: "#0F1F47",
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      margin: 0,
                      lineHeight: "1.5",
                      letterSpacing: "-0.01em"
                    }}>
                      {video.title}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // Render full video player view
  if (selectedVideo) {
    const videoId = extractVideoId(selectedVideo.url) || selectedVideo.id
    return (
      <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
        {/* Background */}
        <div style={{ position: "absolute", inset: 0, zIndex: -10, ...BLUE_BG }} />

        {/* Header */}
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          backgroundColor: "rgba(18, 58, 138, 0.8)"
        }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1rem" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "4rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVideo(null)}
                  style={{
                    color: TEXT_LIGHT,
                    backgroundColor: "rgba(255, 255, 255, 0.1)"
                  }}
                >
                  <ArrowLeft style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
                  {t("sampleVideos.backToVideos")}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Video Player */}
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1rem" }}>
          <Card style={{
            backgroundColor: "#FFFFFF",
            border: "none",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
            borderRadius: "16px",
            overflow: "hidden"
          }}>
            <CardContent style={{ padding: 0 }}>
              <div style={{ 
                position: "relative", 
                paddingBottom: "56.25%",
                backgroundColor: "#000000"
              }}>
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={selectedVideo.title || "YouTube video"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    borderRadius: "16px"
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Render category selection or video list
  return (
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, zIndex: -10, ...BLUE_BG }} />

      {/* Header */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "rgba(18, 58, 138, 0.8)"
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1rem" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "4rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                style={{
                  color: TEXT_LIGHT,
                  backgroundColor: "rgba(255, 255, 255, 0.1)"
                }}
              >
                <ArrowLeft style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
                {t("sampleVideos.backToSkillsHome")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ height: "calc(100vh - 4rem)", overflowY: "auto" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1rem" }}>
          {!selectedCategory ? (
            // Category selection view
            <>
              <div style={{ marginBottom: "3rem" }}>
                <h2 style={{
                  fontSize: "2.75rem",
                  marginBottom: "1rem",
                  color: TEXT_LIGHT,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: "1.2"
                }}>
                  {t("sampleVideos.title")}
                </h2>
                <p style={{ 
                  color: TEXT_MUTED,
                  fontSize: "1.125rem",
                  lineHeight: "1.6"
                }}>
                  {t("sampleVideos.exploreVideos")}
                </p>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "2rem"
              }}>
                {videoCategories.map((category) => (
                  <Card
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                      borderRadius: "16px",
                      overflow: "hidden"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-8px) scale(1.02)"
                      e.currentTarget.style.boxShadow = "0 16px 32px rgba(59, 130, 246, 0.2)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0) scale(1)"
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)"
                    }}
                  >
                    <CardHeader style={{ padding: "1.5rem" }}>
                      <div style={{
                        width: "4rem",
                        height: "4rem",
                        background: "linear-gradient(135deg, #3B82F6, #00B9FC)",
                        borderRadius: "1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "1rem",
                        boxShadow: "0 8px 16px rgba(59, 130, 246, 0.3)",
                        transition: "all 0.3s ease"
                      }}>
                        <Play style={{ width: "2rem", height: "2rem", color: "#FFFFFF" }} />
                      </div>
                      <CardTitle style={{
                        fontSize: "1.375rem",
                        color: "#0F1F47",
                        marginBottom: "0.5rem",
                        fontWeight: 600,
                        letterSpacing: "-0.01em"
                      }}>
                        {t(category.titleKey)}
                      </CardTitle>
                      <p style={{
                        fontSize: "0.9375rem",
                        color: "rgba(15, 31, 71, 0.7)",
                        margin: 0,
                        fontWeight: 500
                      }}>
                        {t("sampleVideos.videosAvailable", { count: category.videos.length })}
                      </p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            // Video list view for selected category
            <>
              <div style={{ marginBottom: "2.5rem" }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  style={{
                    color: TEXT_LIGHT,
                    marginBottom: "1.5rem",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    border: "1px solid rgba(255, 255, 255, 0.1)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)"
                    e.currentTarget.style.transform = "translateX(-4px)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
                    e.currentTarget.style.transform = "translateX(0)"
                  }}
                >
                  <ArrowLeft style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
                  {t("sampleVideos.backToCategories")}
                </Button>
                <h2 style={{
                  fontSize: "2.5rem",
                  marginBottom: "0.75rem",
                  color: TEXT_LIGHT,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: "1.2"
                }}>
                  {selectedCategory && t(selectedCategory.titleKey)}
                </h2>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <div style={{
                    width: "4px",
                    height: "24px",
                    background: "linear-gradient(135deg, #3B82F6, #00B9FC)",
                    borderRadius: "2px"
                  }} />
                  <p style={{ 
                    color: TEXT_MUTED,
                    fontSize: "1rem",
                    margin: 0
                  }}>
                    {t("sampleVideos.videosAvailable", { count: selectedCategory?.videos.length ?? 0 })}
                  </p>
                </div>
              </div>

              {renderVideoGrid(selectedCategory.videos)}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
