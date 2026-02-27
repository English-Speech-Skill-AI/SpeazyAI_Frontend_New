"use client"

import { useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useLocalizedNavigate } from "./LocaleLayout"
import { Button } from "./ui/button"
import { Card, CardHeader, CardTitle } from "./ui/card"
import { ArrowLeft, BookOpenCheck, BookOpen, Library } from "lucide-react"
import type { CSSProperties } from "react"

const BLUE_BG: CSSProperties = {
  backgroundColor: "#1E3A8A",
  backgroundAttachment: "fixed",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
}

export function Novel() {
  const navigate = useLocalizedNavigate()
  const { t } = useTranslation()
  const novels = [
    { id: "novel-1", titleKey: "novel.mysteryIsland", descKey: "novel.mysteryIslandDesc", icon: BookOpenCheck, color: "from-[#3B82F6] to-[#00B9FC]" },
    { id: "novel-2", titleKey: "novel.chroniclesOfWisdom", descKey: "novel.chroniclesDesc", icon: BookOpen, color: "from-[#00B9FC] to-[#246BCF]" },
    { id: "novel-3", titleKey: "novel.greatJourney", descKey: "novel.greatJourneyDesc", icon: Library, color: "from-[#246BCF] to-[#1E3A8A]" },
  ]
  const location = useLocation()
  const backRoute = (location.state as any)?.backRoute || "/reading-modules"

  const handleNovelClick = (novelId: string) => {
    navigate("/novel/" + novelId, { state: { backRoute: "/novel" } })
  }

  return (
    <div className="h-screen flex flex-col relative overflow-x-hidden w-full">
      <div className="absolute inset-0 -z-10" style={BLUE_BG} />

      <header className="sticky top-0 z-50 backdrop-blur-sm bg-white/10 border-b border-white/10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backRoute)}
              className="text-white hover:bg-white/10 rounded-2xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("novel.back")}
            </Button>
            <h1 className="text-xl font-semibold text-white">{t("novel.title")}</h1>
            <div className="w-10 h-10" />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">{t("novel.chooseNovel")}</h2>
            <p className="text-base text-white/80">{t("novel.chooseNovelDesc")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {novels.map((novel) => (
              <Card
                key={novel.id}
                className="group bg-white border-0 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden rounded-3xl h-full flex flex-col"
                onClick={() => handleNovelClick(novel.id)}
              >
                <CardHeader className="pb-4 pt-6 flex flex-col items-center text-center flex-grow">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${novel.color} rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}
                  >
                    <novel.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-[#1E3A8A] text-xl mb-2">{t(novel.titleKey)}</CardTitle>
                  <p className="text-sm text-[#1E3A8A]/70">{t(novel.descKey)}</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

