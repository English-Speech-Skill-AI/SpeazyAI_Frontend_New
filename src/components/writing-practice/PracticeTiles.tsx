import { useState } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, PenTool, Star, Sparkles } from "lucide-react";
import { WritingPracticeQuestion } from "./WritingPracticeQuestion";
import { useTranslation } from "react-i18next";

interface PracticeTile {
  id: string;
  title: string;
  description: string;
  question: string;
  questionTitle: string;
}

interface PracticeTilesProps {
  level: "beginner" | "intermediate" | "advanced";
  practiceTiles: PracticeTile[];
  onBack: () => void;
}

export function PracticeTiles({ level, practiceTiles, onBack }: PracticeTilesProps) {
  const { t } = useTranslation();
  const [selectedPractice, setSelectedPractice] = useState<PracticeTile | null>(null);

  const levelColors = {
    beginner: "from-[#3B82F6] to-[#00B9FC]",
    intermediate: "from-[#00B9FC] to-[#246BCF]",
    advanced: "from-[#246BCF] to-[#1E3A8A]",
  };

  const levelTitles = {
    beginner: t("writingPractice.beginnerWriting"),
    intermediate: t("writingPractice.intermediateWriting"),
    advanced: t("writingPractice.advancedWriting"),
  };

  if (selectedPractice) {
    return (
      <WritingPracticeQuestion
        question={selectedPractice.question}
        questionTitle={selectedPractice.questionTitle}
        onBack={() => setSelectedPractice(null)}
        level={level}
      />
    );
  }

  return (
    <div className="min-h-screen relative bg-[#1E3A8A]">
      <Star className="absolute top-24 right-1/4 w-6 h-6 text-[#FFD600] animate-pulse" />
      <Star className="absolute top-1/3 left-20 w-4 h-4 text-white/60 animate-pulse" style={{ animationDelay: "0.5s" }} />
      <Sparkles className="absolute top-1/4 right-12 w-5 h-5 text-white/70 animate-pulse" style={{ animationDelay: "0.7s" }} />

      <header className="bg-[#1E3A8A]/90 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white hover:bg-white/10 hover:text-amber-300 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("writingPractice.backToLevels")}
            </Button>
            <h1 className="text-xl text-white">{levelTitles[level]}</h1>
            <div className="w-32" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <PenTool className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl text-white mb-3">{t("writingPractice.chooseWritingPractice")}</h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            {t("writingPractice.selectPracticeTopic")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {practiceTiles.map((tile, index) => (
            <div
              key={tile.id}
              onClick={() => setSelectedPractice(tile)}
              className="group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="bg-white rounded-3xl p-8 shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-2 relative overflow-hidden h-full">
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${levelColors[level]}`} />
                
                <div className="relative">
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${levelColors[level]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <PenTool className="w-10 h-10 text-white" />
                  </div>
                  <Star className="absolute -top-2 -right-2 w-5 h-5 text-[#FFD600] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Sparkles className="absolute -bottom-1 -left-1 w-4 h-4 text-[#3B82F6] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <h3 className="text-2xl text-[#1E3A8A] text-center mb-2">
                  {tile.title}
                </h3>
                <p className="text-[#1E3A8A]/70 text-center text-sm mb-4">
                  {tile.description}
                </p>

                <div className="mt-6 flex justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]/30 group-hover:bg-[#3B82F6] transition-colors" />
                  <div className="w-2 h-2 rounded-full bg-[#00B9FC]/30 group-hover:bg-[#00B9FC] transition-colors" />
                  <div className="w-2 h-2 rounded-full bg-[#FFD600]/30 group-hover:bg-[#FFD600] transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
            <Star className="w-5 h-5 text-[#FFD600]" />
            <span className="text-white">{t("writingPractice.practiceMakesPerfect")}</span>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

