import { useState } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, Star, Sparkles, Smartphone, Users, Calendar, GraduationCap, Building2, Target } from "lucide-react";
import { WritingPracticeQuestion } from "./WritingPracticeQuestion";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

interface WritingIntermediateProps {
  onBack: () => void;
}

type IntermediateView = "topics" | "inter_opinion_technology" | "inter_best_friend" | "inter_memorable_day" | "inter_online_learning" | "inter_city_vs_village" | "inter_future_goals";

interface IntermediateTile {
  id: string;
  title: string;
  description: string;
  question: string;
  minWords: number;
  analysisPrompt: string;
  icon: typeof Smartphone;
  color: string;
}

const intermediateTiles: IntermediateTile[] = [
  {
    id: "inter_opinion_technology",
    title: "Technology in Daily Life",
    description: "Share your opinion on technology",
    question: "Do you think technology has made life easier or more stressful? Explain your opinion with reasons.",
    minWords: 120,
    analysisPrompt: "Analyze the paragraph for grammar, coherence, and paragraph structure. Suggest improvements in sentence variety and vocabulary. Provide constructive feedback.",
    icon: Smartphone,
    color: "from-[#00B9FC] to-[#246BCF]",
  },
  {
    id: "inter_best_friend",
    title: "My Best Friend",
    description: "Describe a person important to you",
    question: "Write about your best friend. Describe their personality and explain why they are important to you.",
    minWords: 100,
    analysisPrompt: "Evaluate grammar, descriptive language, and sentence flow. Suggest better adjectives and sentence connections.",
    icon: Users,
    color: "from-[#246BCF] to-[#1E3A8A]",
  },
  {
    id: "inter_memorable_day",
    title: "A Memorable Day",
    description: "Narrate a past experience",
    question: "Describe a memorable day in your life. Explain what happened and why it was special.",
    minWords: 120,
    analysisPrompt: "Check past tense consistency, paragraph flow, and clarity. Suggest corrections and a refined version.",
    icon: Calendar,
    color: "from-[#1E3A8A] to-[#3B82F6]",
  },
  {
    id: "inter_online_learning",
    title: "Online Learning",
    description: "Discuss advantages and disadvantages",
    question: "What are the advantages and disadvantages of online learning? Share your opinion.",
    minWords: 130,
    analysisPrompt: "Analyze logical flow, linking words, and grammar. Suggest improvements in structure and vocabulary.",
    icon: GraduationCap,
    color: "from-[#3B82F6] to-[#00B9FC]",
  },
  {
    id: "inter_city_vs_village",
    title: "City Life vs Village Life",
    description: "Compare two lifestyles",
    question: "Compare city life and village life. Which one do you prefer and why?",
    minWords: 140,
    analysisPrompt: "Evaluate comparison structure, connectors, and grammar. Suggest better organization and vocabulary.",
    icon: Building2,
    color: "from-[#00B9FC] to-[#246BCF]",
  },
  {
    id: "inter_future_goals",
    title: "My Future Goals",
    description: "Write about ambitions",
    question: "Write about your future goals and how you plan to achieve them.",
    minWords: 120,
    analysisPrompt: "Check sentence variety, clarity, and coherence. Provide feedback and an improved version.",
    icon: Target,
    color: "from-[#246BCF] to-[#1E3A8A]",
  },
];

export function WritingIntermediate({ onBack }: WritingIntermediateProps) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<IntermediateView>("topics");
  const [selectedTile, setSelectedTile] = useState<IntermediateTile | null>(null);

  const handleTopicClick = (tile: IntermediateTile) => {
    setSelectedTile(tile);
    setCurrentView(tile.id as IntermediateView);
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
        level="intermediate"
      />
    );
  }

  // Styles
  const styles = {
    container: {
      minHeight: "100vh",
      position: "relative" as const,
      backgroundColor: "#1E3A8A",
    },
    header: {
      backgroundColor: "rgba(30, 58, 138, 0.9)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      position: "sticky" as const,
      top: 0,
      zIndex: 50,
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    headerContent: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "0 24px",
    },
    headerInner: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "64px",
    },
    mainContent: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "64px 24px",
    },
    headingContainer: {
      textAlign: "center" as const,
      marginBottom: "56px",
    },
    heading: {
      fontSize: "48px",
      fontWeight: "bold",
      color: "white",
      marginBottom: "16px",
      textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
    },
    subheading: {
      fontSize: "20px",
      color: "rgba(255, 255, 255, 0.8)",
    },
    gridContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "32px",
      maxWidth: "1152px",
      margin: "0 auto",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "24px",
      padding: "32px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      cursor: "pointer",
      transition: "all 0.3s ease",
      position: "relative" as const,
      border: "2px solid transparent",
      display: "flex",
      flexDirection: "column" as const,
      height: "100%",
    },
    cardHover: {
      transform: "scale(1.05)",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      borderColor: "rgba(255, 215, 0, 0.4)",
    },
    iconContainer: {
      position: "relative" as const,
      marginBottom: "24px",
      display: "flex",
      justifyContent: "center",
      zIndex: 10,
    },
    iconWrapper: (color: string) => ({
      width: "80px",
      height: "80px",
      borderRadius: "24px",
      background: color.includes("from-[#00B9FC]") && color.includes("to-[#246BCF]")
        ? "linear-gradient(to bottom right, #00B9FC, #246BCF)"
        : color.includes("from-[#246BCF]") && color.includes("to-[#1E3A8A]")
        ? "linear-gradient(to bottom right, #246BCF, #1E3A8A)"
        : color.includes("from-[#1E3A8A]") && color.includes("to-[#3B82F6]")
        ? "linear-gradient(to bottom right, #1E3A8A, #3B82F6)"
        : color.includes("from-[#3B82F6]") && color.includes("to-[#00B9FC]")
        ? "linear-gradient(to bottom right, #3B82F6, #00B9FC)"
        : "linear-gradient(to bottom right, #246BCF, #1E3A8A)",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.3s ease",
    }),
    iconWrapperHover: {
      transform: "rotate(6deg) scale(1.1)",
    },
    title: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#1E3A8A",
      textAlign: "center" as const,
      marginBottom: "8px",
      zIndex: 10,
      transition: "color 0.3s ease",
    },
    titleHover: {
      color: "#00B9FC",
    },
    description: {
      fontSize: "16px",
      color: "rgba(30, 58, 138, 0.7)",
      textAlign: "center" as const,
      zIndex: 10,
      flexGrow: 1,
    },
    bulletsContainer: {
      marginTop: "24px",
      display: "flex",
      justifyContent: "center",
      gap: "8px",
      zIndex: 10,
    },
    bullet: {
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      backgroundColor: "rgba(59, 130, 246, 0.4)",
      transition: "background-color 0.3s ease",
    },
    bulletHover: (index: number) => ({
      backgroundColor: index === 0 ? "#3B82F6" : index === 1 ? "#00B9FC" : "#FFD600",
    }),
    encouragementContainer: {
      marginTop: "80px",
      textAlign: "center" as const,
    },
    encouragementBox: {
      display: "inline-flex",
      alignItems: "center",
      gap: "12px",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      padding: "16px 32px",
      borderRadius: "9999px",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backdropFilter: "blur(4px)",
    },
    encouragementText: {
      fontSize: "18px",
      color: "white",
      fontWeight: 600,
    },
    decorativeStar: {
      position: "absolute" as const,
      color: "#FFD600",
      animation: "pulse 2s ease-in-out infinite",
    },
    decorativeSparkles: {
      position: "absolute" as const,
      color: "rgba(255, 255, 255, 0.7)",
      animation: "pulse 2s ease-in-out infinite",
    },
  };

  return (
    <div style={styles.container}>
      {/* Decorative elements */}
      <Star style={{ ...styles.decorativeStar, top: "96px", right: "25%", width: "24px", height: "24px" }} />
      <Star style={{ ...styles.decorativeStar, top: "33%", left: "80px", width: "16px", height: "16px", opacity: 0.6 }} />
      <Sparkles style={{ ...styles.decorativeSparkles, top: "25%", right: "48px", width: "20px", height: "20px" }} />

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerInner}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              style={{
                color: "white",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "#FFD600";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "white";
              }}
            >
              <ArrowLeft style={{ width: "16px", height: "16px", marginRight: "8px" }} />
              {t("writingPractice.backToLevels")}
            </Button>
            <h1 style={{ fontSize: "20px", color: "white", fontWeight: "bold", margin: 0 }}>
              {t("writingPractice.intermediateWriting")}
            </h1>
            <div style={{ width: "128px" }} />
          </div>
        </div>
      </header>

      <div style={styles.mainContent}>
        <div style={styles.headingContainer}>
          <h2 style={styles.heading}>{t("writingPractice.letsWriteTogether")}</h2>
          <p style={styles.subheading}>{t("writingPractice.chooseTopicToPractice")}</p>
        </div>

        <div style={styles.gridContainer}>
          {intermediateTiles.map((tile) => {
            const IconComponent = tile.icon;
            return (
              <div
                key={tile.id}
                onClick={() => handleTopicClick(tile)}
                onMouseEnter={(e) => {
                  const card = e.currentTarget;
                  card.style.transform = "scale(1.05)";
                  card.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
                  card.style.borderColor = "rgba(255, 215, 0, 0.4)";
                  const iconWrapper = card.querySelector('[data-icon-wrapper]') as HTMLElement;
                  if (iconWrapper) {
                    iconWrapper.style.transform = "rotate(6deg) scale(1.1)";
                  }
                  const title = card.querySelector('[data-title]') as HTMLElement;
                  if (title) {
                    title.style.color = "#00B9FC";
                  }
                  const bullets = card.querySelectorAll('[data-bullet]');
                  bullets.forEach((bullet, index) => {
                    const el = bullet as HTMLElement;
                    el.style.backgroundColor = index === 0 ? "#3B82F6" : index === 1 ? "#00B9FC" : "#FFD600";
                  });
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget;
                  card.style.transform = "scale(1)";
                  card.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                  card.style.borderColor = "transparent";
                  const iconWrapper = card.querySelector('[data-icon-wrapper]') as HTMLElement;
                  if (iconWrapper) {
                    iconWrapper.style.transform = "rotate(0deg) scale(1)";
                  }
                  const title = card.querySelector('[data-title]') as HTMLElement;
                  if (title) {
                    title.style.color = "#1E3A8A";
                  }
                  const bullets = card.querySelectorAll('[data-bullet]');
                  bullets.forEach((bullet) => {
                    const el = bullet as HTMLElement;
                    el.style.backgroundColor = "rgba(59, 130, 246, 0.4)";
                  });
                }}
                style={styles.card}
              >
                <div style={styles.iconContainer}>
                  <div
                    data-icon-wrapper
                    style={styles.iconWrapper(tile.color)}
                  >
                    <IconComponent style={{ width: "40px", height: "40px", color: "white" }} />
                  </div>
                </div>

                <h3 data-title style={styles.title}>
                  {tile.title}
                </h3>
                <p style={styles.description}>
                  {tile.description}
                </p>

                <div style={styles.bulletsContainer}>
                  <div data-bullet style={styles.bullet} />
                  <div data-bullet style={styles.bullet} />
                  <div data-bullet style={styles.bullet} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.encouragementContainer}>
          <div style={styles.encouragementBox}>
            <Star style={{ width: "24px", height: "24px", color: "#FFD600", animation: "spin 3s linear infinite" }} />
            <span style={styles.encouragementText}>{t("writingPractice.youreGoingToDoGreat")}</span>
            <Sparkles style={{ width: "24px", height: "24px", color: "white", animation: "pulse 2s ease-in-out infinite" }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
