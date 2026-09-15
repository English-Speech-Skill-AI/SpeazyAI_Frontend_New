import { useState } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, Star, Sparkles, User, Users, Clock, UtensilsCrossed, MapPin, Heart } from "lucide-react";
import { WritingPracticeQuestion } from "./WritingPracticeQuestion";
import { useTranslation } from "react-i18next";

interface WritingBeginnerProps {
  onBack: () => void;
}

type BeginnerView = "topics" | "beginner_about_me" | "beginner_my_family" | "beginner_daily_routine" | "beginner_favorite_food" | "beginner_favorite_place" | "beginner_hobby";

interface BeginnerTile {
  id: string;
  title: string;
  description: string;
  question: string;
  minWords: number;
  analysisPrompt: string;
  icon: typeof User;
  color: string;
}

const beginnerTiles: BeginnerTile[] = [
  {
    id: "beginner_about_me",
    title: "About Me",
    description: "Introduce yourself and share basic details",
    question: "Write a short paragraph about yourself. Include your name, age, where you live, your hobbies, and one special thing about you.",
    minWords: 50,
    analysisPrompt: "You are an English teacher helping a beginner learner. Analyze the paragraph for basic grammar, sentence structure, and clarity. Point out simple mistakes and rewrite the paragraph in easy, correct English. Keep feedback encouraging and simple.",
    icon: User,
    color: "from-[#3B82F6] to-[#00B9FC]",
  },
  {
    id: "beginner_my_family",
    title: "My Family",
    description: "Describe your family members",
    question: "Write a paragraph about your family. Mention how many people are in your family, who they are, and what you like about them.",
    minWords: 50,
    analysisPrompt: "Analyze this beginner-level paragraph for grammar and sentence formation. Highlight errors gently, suggest corrections, and provide a simple improved version.",
    icon: Users,
    color: "from-[#00B9FC] to-[#246BCF]",
  },
  {
    id: "beginner_daily_routine",
    title: "My Daily Routine",
    description: "Talk about your day",
    question: "Describe your daily routine from morning to night. Use simple sentences and common words.",
    minWords: 60,
    analysisPrompt: "Check for tense usage, sentence order, and basic vocabulary. Suggest simple improvements without using complex grammar terms.",
    icon: Clock,
    color: "from-[#246BCF] to-[#1E3A8A]",
  },
  {
    id: "beginner_favorite_food",
    title: "My Favorite Food",
    description: "Write about food you love",
    question: "Write about your favorite food. Explain why you like it and when you usually eat it.",
    minWords: 50,
    analysisPrompt: "Evaluate grammar, spelling, and clarity. Suggest better simple words and correct sentence structure.",
    icon: UtensilsCrossed,
    color: "from-[#1E3A8A] to-[#3B82F6]",
  },
  {
    id: "beginner_favorite_place",
    title: "My Favorite Place",
    description: "Describe a place you like",
    question: "Describe your favorite place. Explain where it is and why you like going there.",
    minWords: 60,
    analysisPrompt: "Analyze sentence clarity and grammar. Rewrite sentences in simple, correct English where needed.",
    icon: MapPin,
    color: "from-[#3B82F6] to-[#00B9FC]",
  },
  {
    id: "beginner_hobby",
    title: "My Hobby",
    description: "Talk about what you enjoy doing",
    question: "Write a paragraph about your hobby. Explain what it is, when you do it, and why you enjoy it.",
    minWords: 50,
    analysisPrompt: "Identify grammar mistakes and simple vocabulary improvements. Provide a corrected version suitable for a beginner.",
    icon: Heart,
    color: "from-[#00B9FC] to-[#246BCF]",
  },
];

export function WritingBeginner({ onBack }: WritingBeginnerProps) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<BeginnerView>("topics");
  const [selectedTile, setSelectedTile] = useState<BeginnerTile | null>(null);

  const handleTopicClick = (tile: BeginnerTile) => {
    setSelectedTile(tile);
    setCurrentView(tile.id as BeginnerView);
  };

  const handleBackToTopics = () => {
    setCurrentView("topics");
    setSelectedTile(null);
  };

  // Render WritingPracticeQuestion for any selected tile
  if (currentView !== "topics" && selectedTile) {
    return (
      <WritingPracticeQuestion
        question={selectedTile.question}
        questionTitle={selectedTile.title}
        onBack={handleBackToTopics}
        level="beginner"
      />
    );
  }

  return (
    <div className="min-h-screen relative bg-[#1E3A8A]">
      {/* Small decorative stars only */}
      <Star className="absolute top-24 right-1/4 w-6 h-6 text-[#FFD600] animate-pulse" />
      <Star className="absolute top-1/3 left-20 w-4 h-4 text-white/60 animate-pulse" />
      <Sparkles className="absolute top-1/4 right-12 w-5 h-5 text-white/70 animate-pulse" />

      <header className="bg-[#1E3A8A]/90 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white hover:bg-white/10 hover:text-yellow-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("writingPractice.backToLevels")}
            </Button>
            <h1 className="text-xl text-white font-bold">{t("writingPractice.beginnerWriting")}</h1>
            <div className="w-32" />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Heading */}
        <div className="text-center mb-14">
          <h2 className="text-5xl font-extrabold text-white drop-shadow-md mb-4">
            {t("writingPractice.letsWriteTogether")}
          </h2>
          <p className="text-xl text-white/80">
            {t("writingPractice.chooseTopic")}
          </p>
        </div>

        {/* Topic Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {beginnerTiles.map((tile) => {
            const IconComponent = tile.icon;
            return (
              <div
                key={tile.id}
                onClick={() => handleTopicClick(tile)}
                className="group cursor-pointer transition-all duration-300 hover:scale-105"
              >
                <div className="relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-[#FFD600]/40 transition-all h-full flex flex-col">

                  {/* Icon */}
                  <div className="relative mb-6 flex justify-center z-10">
                    <div
                      className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${tile.color} shadow-lg flex items-center justify-center group-hover:rotate-6 group-hover:scale-110 transition-transform`}
                    >
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-[#1E3A8A] text-center mb-2 group-hover:text-[#00B9FC] z-10 transition-colors">
                    {tile.title}
                  </h3>
                  <p className="text-[#1E3A8A]/70 text-center text-base z-10 flex-grow">
                    {tile.description}
                  </p>

                  {/* Decorative bullets */}
                  <div className="mt-6 flex justify-center gap-2 z-10">
                    <div className="w-3 h-3 rounded-full bg-[#3B82F6]/40 group-hover:bg-[#3B82F6] transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-[#00B9FC]/40 group-hover:bg-[#00B9FC] transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-[#FFD600]/40 group-hover:bg-[#FFD600] transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Encouragement message */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-3 bg-white/10 px-8 py-4 rounded-full border border-white/30 backdrop-blur-sm">
            <Star className="w-6 h-6 text-[#FFD600] animate-spin" />
            <span className="text-lg text-white font-semibold">{t("writingPractice.youreGoingToDoGreat")}</span>
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
