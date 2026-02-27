import { useState } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, Star, Sparkles, FileText, Scale, TrendingUp, BarChart3, AlertCircle, Target } from "lucide-react";
import { WritingPracticeQuestion } from "./WritingPracticeQuestion";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

interface WritingAdvancedProps {
  onBack: () => void;
}

type AdvancedView = "topics" | "ielts_opinion_essay" | "ielts_discuss_both_views" | "ielts_advantages_disadvantages" | "ielts_problem_solution" | "ielts_task1_graph" | "ielts_agree_disagree";

interface AdvancedTile {
  id: string;
  title: string;
  description: string;
  question: string;
  minWords: number;
  analysisPrompt: string;
  icon: typeof FileText;
  color: string;
}

const advancedTiles: AdvancedTile[] = [
  {
    id: "ielts_opinion_essay",
    title: "Opinion Essay (Task 2)",
    description: "Express and justify your opinion",
    question: "Some people believe that working from home increases productivity, while others disagree. Discuss both views and give your own opinion.",
    minWords: 250,
    analysisPrompt: "You are an IELTS examiner. Analyze this essay for Task 2. Give feedback on Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range. Provide an estimated IELTS band score and suggestions for improvement.",
    icon: FileText,
    color: "from-[#246BCF] to-[#1E3A8A]",
  },
  {
    id: "ielts_discuss_both_views",
    title: "Discuss Both Views",
    description: "Balanced argument writing",
    question: "Some people think children should learn at home, while others believe they should attend school. Discuss both views and give your opinion.",
    minWords: 250,
    analysisPrompt: "Evaluate the essay using IELTS Task 2 criteria. Identify weaknesses, suggest improvements, and estimate a band score.",
    icon: Scale,
    color: "from-[#1E3A8A] to-[#3B82F6]",
  },
  {
    id: "ielts_advantages_disadvantages",
    title: "Advantages & Disadvantages",
    description: "Pros and cons essay",
    question: "What are the advantages and disadvantages of using social media? Give relevant examples.",
    minWords: 250,
    analysisPrompt: "Analyze structure, coherence, vocabulary range, and grammar. Provide IELTS-style feedback and a band estimate.",
    icon: TrendingUp,
    color: "from-[#3B82F6] to-[#00B9FC]",
  },
  {
    id: "ielts_problem_solution",
    title: "Problem & Solution Essay",
    description: "Identify problems and solutions",
    question: "Many cities face serious traffic congestion problems. What are the causes and what solutions can you suggest?",
    minWords: 250,
    analysisPrompt: "Assess this essay using IELTS Task 2 criteria. Suggest improvements and provide a band score estimate.",
    icon: AlertCircle,
    color: "from-[#00B9FC] to-[#246BCF]",
  },
  {
    id: "ielts_task1_graph",
    title: "Report Writing (Task 1)",
    description: "Describe visual information",
    question: "The chart shows changes in population growth in three countries over 20 years. Summarize the information by selecting and reporting the main features.",
    minWords: 150,
    analysisPrompt: "You are an IELTS examiner. Analyze this Task 1 response for accuracy, overview quality, data comparison, vocabulary, and grammar. Provide an estimated band score.",
    icon: BarChart3,
    color: "from-[#246BCF] to-[#1E3A8A]",
  },
  {
    id: "ielts_agree_disagree",
    title: "Agree or Disagree Essay",
    description: "Strong opinion writing",
    question: "Some people think money is the most important factor for happiness. To what extent do you agree or disagree?",
    minWords: 250,
    analysisPrompt: "Evaluate the essay according to IELTS Task 2 band descriptors. Provide feedback and an estimated band score.",
    icon: Target,
    color: "from-[#1E3A8A] to-[#3B82F6]",
  },
];

export function WritingAdvanced({ onBack }: WritingAdvancedProps) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<AdvancedView>("topics");
  const [selectedTile, setSelectedTile] = useState<AdvancedTile | null>(null);

  const handleTopicClick = (tile: AdvancedTile) => {
    setSelectedTile(tile);
    setCurrentView(tile.id as AdvancedView);
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
        level="advanced"
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
      background: color.includes("from-[#246BCF]") && color.includes("to-[#1E3A8A]")
        ? "linear-gradient(to bottom right, #246BCF, #1E3A8A)"
        : color.includes("from-[#1E3A8A]") && color.includes("to-[#3B82F6]")
        ? "linear-gradient(to bottom right, #1E3A8A, #3B82F6)"
        : color.includes("from-[#3B82F6]") && color.includes("to-[#00B9FC]")
        ? "linear-gradient(to bottom right, #3B82F6, #00B9FC)"
        : color.includes("from-[#00B9FC]") && color.includes("to-[#246BCF]")
        ? "linear-gradient(to bottom right, #00B9FC, #246BCF)"
        : "linear-gradient(to bottom right, #246BCF, #1E3A8A)",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.3s ease",
    }),
    title: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#1E3A8A",
      textAlign: "center" as const,
      marginBottom: "8px",
      zIndex: 10,
      transition: "color 0.3s ease",
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
              {t("writingPractice.advancedWritingIelts")}
            </h1>
            <div style={{ width: "128px" }} />
          </div>
        </div>
      </header>

      <div style={styles.mainContent}>
        <div style={styles.headingContainer}>
          <h2 style={styles.heading}>{t("writingPractice.masterIeltsWriting")}</h2>
          <p style={styles.subheading}>{t("writingPractice.chooseIeltsTask")}</p>
        </div>

        <div style={styles.gridContainer}>
          {advancedTiles.map((tile) => {
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
