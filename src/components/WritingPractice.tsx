import { useState } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, PenTool, Star, Sparkles, BookOpen } from "lucide-react";
import { PracticeTiles } from "./writing-practice/PracticeTiles";
import { WritingBeginner } from "./writing-practice/WritingBeginner";
import { WritingIntermediate } from "./writing-practice/WritingIntermediate";
import { WritingAdvanced } from "./writing-practice/WritingAdvanced";
import { beginnerPractices, intermediatePractices, advancedPractices } from "./writing-practice/practiceData";
import { useLocalizedNavigate } from "./LocaleLayout";
import { useTranslation } from "react-i18next";

interface WritingPracticeProps {
  onBack?: () => void;
}

type WritingView = "levels" | "beginner" | "intermediate" | "advanced";

export function WritingPractice({ onBack }: WritingPracticeProps) {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<WritingView>("levels");

  const levels = [
    {
      id: "beginner",
      titleKey: "writingPractice.beginner",
      descriptionKey: "writingPractice.beginnerDesc",
      color: "from-[#3B82F6] to-[#00B9FC]",
    },
    {
      id: "intermediate",
      titleKey: "writingPractice.intermediate",
      descriptionKey: "writingPractice.intermediateDesc",
      color: "from-[#00B9FC] to-[#246BCF]",
    },
    {
      id: "advanced",
      titleKey: "writingPractice.advanced",
      descriptionKey: "writingPractice.advancedDesc",
      color: "from-[#246BCF] to-[#1E3A8A]",
    },
  ];

  const handleLevelClick = (levelId: string) => {
    setCurrentView(levelId as WritingView);
  };

  const handleBackToLevels = () => {
    setCurrentView("levels");
  };

  if (currentView === "beginner") {
    return <WritingBeginner onBack={handleBackToLevels} />;
  }

  if (currentView === "intermediate") {
    return <WritingIntermediate onBack={handleBackToLevels} />;
  }

  if (currentView === "advanced") {
    return <WritingAdvanced onBack={handleBackToLevels} />;
  }

  // Default view: levels selection
  return (
    <div className="min-h-screen relative bg-[#1E3A8A]">
      {/* Floating decorative elements */}
      <Star className="absolute top-24 right-1/4 w-6 h-6 text-[#FFD600] animate-pulse" />
      <Star className="absolute top-1/3 left-20 w-4 h-4 text-white/60 animate-pulse" style={{ animationDelay: "0.5s" }} />
      <Star className="absolute bottom-32 right-1/3 w-5 h-5 text-[#FFD600] animate-pulse" style={{ animationDelay: "1s" }} />
      <Sparkles className="absolute top-1/4 right-12 w-5 h-5 text-white/70 animate-pulse" style={{ animationDelay: "0.7s" }} />
      
      <header className="bg-[#1E3A8A]/90 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/skills-home")}
              className="text-white hover:text-[#CFE2FF] hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("writingPractice.backToSkillsHome")}
            </Button>
            <h1 className="text-xl text-white">{t("writingPractice.title")}</h1>
            <div className="w-32" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <PenTool className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl text-white mb-3">{t("writingPractice.chooseYourLevel")}</h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            {t("writingPractice.startAdventure")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {levels.map((level, index) => (
            <div
              key={level.id}
              onClick={() => handleLevelClick(level.id)}
              className="group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="bg-white rounded-3xl p-8 shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
                {/* Gradient accent on top */}
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${level.color}`} />
                
                {/* Icon badge */}
                <div className="relative">
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${level.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <PenTool className="w-10 h-10 text-white" />
                  </div>
                  {/* Decorative stars around icon */}
                  <Star className="absolute -top-2 -right-2 w-5 h-5 text-[#FFD600] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Sparkles className="absolute -bottom-1 -left-1 w-4 h-4 text-[#3B82F6] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <h3 className="text-2xl text-[#1E3A8A] text-center mb-2">
                  {t(level.titleKey)}
                </h3>
                <p className="text-[#1E3A8A]/70 text-center text-sm">
                  {t(level.descriptionKey)}
                </p>

                {/* Bottom decoration */}
                <div className="mt-6 flex justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]/30" />
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]/50" />
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom decorative message */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
            <BookOpen className="w-5 h-5 text-white" />
            <span className="text-white">{t("writingPractice.letsMakeWritingFun")}</span>
            <Star className="w-5 h-5 text-[#FFD600]" />
          </div>
        </div>
      </div>
    </div>
  );
}