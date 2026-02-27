"use client"

import { Card, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { ArrowLeft, PenTool } from "lucide-react"
import { PageHeader } from "../PageHeader"
import type { CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import { useLocalizedNavigate } from "../LocaleLayout"

const writingModuleIds = [
  { id: "writing-practice", titleKey: "modules.writing.writingPractice", descKey: "modules.writing.writingPracticeDesc", icon: PenTool, gradient: "linear-gradient(135deg, #3B82F6 0%, #00B9FC 100%)" },
]

export function WritingModulesPage() {
  const { t } = useTranslation()
  const navigate = useLocalizedNavigate()

  const BLUE_BG: CSSProperties = {
    backgroundColor: "#1E3A8A",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  }

  const handleModuleClick = (moduleId: string) => {
    const navigationMap: Record<string, string> = {
      "writing-practice": "/writing-practice",
    }
    
    const route = navigationMap[moduleId] || `/${moduleId}`
    navigate(route, { state: { backRoute: "/writing-modules", skipLevels: moduleId === "writing-practice" } })
  }

  return (
    <div className="h-screen flex flex-col relative overflow-x-hidden w-full">
      {/* Background */}
      <div className="absolute inset-0 -z-10" style={BLUE_BG} />
      
      {/* Header */}
      <PageHeader />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-12">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/skills-home")}
              className="text-white hover:bg-white/10 mb-8 rounded-2xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-3">Writing</h2>
              <p className="text-base text-white/80">Choose your learning path</p>
            </div>
          </div>

          <div className="flex justify-center py-8">
            <div className="grid grid-cols-1 gap-8 max-w-md w-full">
              {writingModuleIds.map((module) => (
              <Card
                key={module.id}
                className="group bg-white border-0 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden rounded-3xl h-full flex flex-col"
                onClick={() => handleModuleClick(module.id)}
                style={{
                  borderRadius: "24px",
                }}
              >
                <CardHeader className="pb-6 pt-8 flex flex-col items-center text-center flex-grow px-8">
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      background: module.gradient,
                      borderRadius: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                      transition: "all 0.3s ease",
                      transform: "scale(1)",
                    }}
                    className="group-hover:scale-110 group-hover:rotate-3"
                  >
                    <module.icon 
                      className="w-8 h-8 text-white"
                      style={{ color: "#FFFFFF" }}
                    />
                  </div>
                  <CardTitle 
                    style={{ 
                      color: "#1E3A8A", 
                      fontSize: "20px", 
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    {t(module.titleKey)}
                  </CardTitle>
                  <p style={{ 
                    fontSize: "14px", 
                    color: "rgba(30, 58, 138, 0.7)",
                    lineHeight: "1.5",
                  }}>
                    {t(module.descKey)}
                  </p>
                </CardHeader>
              </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

