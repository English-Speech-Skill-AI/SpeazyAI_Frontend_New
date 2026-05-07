import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  ArrowLeft,
  Volume2,
  Star,
  Heart,
  CheckCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocalizedNavigate } from "./LocaleLayout";
import { AzureAudioRecorder } from "./azure/AzureAudioRecorder";

interface FamousSpeechesProps {
  onBack?: () => void;
}

type View = "selection" | "speech-detail" | "quiz";

const speeches = [
  {
    id: "mlk-dream",
    title: "I Have a Dream",
    speaker: "Martin Luther King Jr.",
    description: "A speech about equality and dreams",
    kidFriendlyText: `"I have a dream that one day all children will play together, no matter what they look like. I dream that everyone will be kind to each other and treat each other fairly. We should judge people by how nice they are, not by the color of their skin."`,
    icon: "🌟",
    color: "from-[#3B82F6] to-[#00B9FC]",
    gradient: "linear-gradient(135deg, #3B82F6 0%, #00B9FC 100%)",
    quizWords: [
      "dream",
      "children",
      "play",
      "together",
      "kind",
      "fairly",
    ],
    quizSentence: "I have a _____ that all _____ will play _____ and be _____ to each other.",
    quizCorrectAnswers: ["dream", "children", "together", "kind"],
  },
  {
    id: "peace-speech",
    title: "Words of Peace",
    speaker: "A Great Leader",
    description: "Learning about kindness and peace",
    kidFriendlyText: `"Peace means being kind to everyone around us. When we are peaceful, we solve problems by talking, not fighting. We can make the world better by being helpful, sharing with others, and always choosing love over anger."`,
    icon: "🕊️",
    color: "from-[#1E3A8A] to-[#3B82F6]",
    gradient: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)",
    quizWords: [
      "peace",
      "kind",
      "talking",
      "helpful",
      "sharing",
      "love",
    ],
    quizSentence: "Peace means being _____ to everyone. When we are peaceful, we solve problems by _____, not fighting. We can make the world better by being _____ and choosing _____ over anger.",
    quizCorrectAnswers: ["kind", "talking", "helpful", "love"],
  },
  {
    id: "roosevelt-citizenship",
    title: "Citizenship in a Republic",
    speaker: "Theodore Roosevelt",
    description: "About courage and trying your best",
    kidFriendlyText: `"It's not the person who just watches and criticizes who matters. What matters is the person who tries, even when it's hard. The person who gets their hands dirty, who tries again and again, who makes mistakes but keeps going. It's better to try big things and sometimes fail, than to never try at all. Being brave and working hard is how we grow and become better people."`,
    icon: "💪",
    color: "from-[#DC2626] to-[#F59E0B]",
    gradient: "linear-gradient(135deg, #DC2626 0%, #F59E0B 100%)",
    quizWords: [
      "tries",
      "brave",
      "hard",
      "mistakes",
      "grow",
      "better",
    ],
    quizSentence: "What matters is the person who _____, even when it's hard. The person who is _____ and works _____. It's better to try big things and sometimes fail, than to never try at all. Being brave helps us _____ and become _____ people.",
    quizCorrectAnswers: ["tries", "brave", "hard", "grow", "better"],
  },
  {
    id: "lincoln-gettysburg",
    title: "Gettysburg Address",
    speaker: "Abraham Lincoln",
    description: "About freedom and remembering heroes",
    kidFriendlyText: `"A long time ago, our country was created with the idea that all people are equal. We are in a great battle to see if our country can survive. We are here to remember the brave people who gave their lives so our country could live. It is our job to finish the work they started. We must make sure that a government of the people, by the people, and for the people, will always exist."`,
    icon: "🇺🇸",
    color: "from-[#1E40AF] to-[#3B82F6]",
    gradient: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)",
    quizWords: [
      "equal",
      "brave",
      "remember",
      "people",
      "freedom",
      "country",
    ],
    quizSentence: "Our country was created with the idea that all people are _____. We are here to _____ the _____ people who gave their lives. It is our job to make sure that a government of the _____, by the _____, and for the _____, will always exist.",
    quizCorrectAnswers: ["equal", "remember", "brave", "people", "people", "people"],
  },
  {
    id: "douglass-freedom",
    title: "The Meaning of Freedom",
    speaker: "Frederick Douglass",
    description: "About freedom and standing up for rights",
    kidFriendlyText: `"Freedom is not just about not being in chains. Freedom means having dignity and the right to speak, to work, and to try your best. A person is not truly free if they can live but cannot grow. Freedom is not a gift that powerful people give. It is a right that determined people claim. If there is no struggle, there is no progress. We must stand up for justice, not as a favor, but as a right."`,
    icon: "🗽",
    color: "from-[#7C3AED] to-[#A855F7]",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
    quizWords: [
      "freedom",
      "right",
      "speak",
      "grow",
      "struggle",
      "justice",
    ],
    quizSentence: "_____ is not just about not being in chains. Freedom means having the _____ to _____, to work, and to _____. If there is no _____, there is no progress. We must stand up for _____ as a right.",
    quizCorrectAnswers: ["freedom", "right", "speak", "grow", "struggle", "justice"],
  },
  {
    id: "washington-farewell",
    title: "Farewell Address",
    speaker: "George Washington",
    description: "About unity and working together",
    kidFriendlyText: `"The unity of our government is very important. It helps keep us safe, peaceful, and free. It is easy for people to try to break us apart, but we must stay together. Being good and doing the right thing is very important for our country. We must support education and learning for everyone. We should be careful with our country's resources and work together for the common good."`,
    icon: "🤝",
    color: "from-[#059669] to-[#10B981]",
    gradient: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
    quizWords: [
      "unity",
      "together",
      "good",
      "education",
      "careful",
      "important",
    ],
    quizSentence: "The _____ of our government is very important. It helps keep us safe and peaceful. We must stay _____ and be _____. We must support _____ for everyone and be _____ with our country's resources.",
    quizCorrectAnswers: ["unity", "together", "good", "education", "careful"],
  },
  {
    id: "truth-woman",
    title: "Ain't I a Woman?",
    speaker: "Sojourner Truth",
    description: "About equality and strength",
    kidFriendlyText: `"Some people say women need help with everything, but I have worked hard all my life. I have plowed fields, planted crops, and worked as much as any man. I have been strong and brave. I have faced great challenges, but I am still here. I ask you, am I not a woman? Shouldn't I be treated with the same respect and given the same opportunities as everyone else? We are all equal and deserve to be treated fairly."`,
    icon: "👑",
    color: "from-[#EC4899] to-[#F472B6]",
    gradient: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)",
    quizWords: [
      "worked",
      "strong",
      "brave",
      "equal",
      "respect",
      "fairly",
    ],
    quizSentence: "I have _____ hard all my life. I have been _____ and _____. We are all _____ and deserve to be treated with _____ and _____. Everyone should have the same opportunities.",
    quizCorrectAnswers: ["worked", "strong", "brave", "equal", "respect", "fairly"],
  },
];

export function FamousSpeeches({
  onBack,
}: FamousSpeechesProps) {
  const { t } = useTranslation()
  const navigate = useLocalizedNavigate()
  const location = useLocation()
  const backRoute = (location.state as any)?.backRoute || "/speaking-modules"
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(backRoute)
    }
  }
  const [currentView, setCurrentView] =
    useState<View>("selection");
  const [selectedSpeech, setSelectedSpeech] = useState<
    (typeof speeches)[0] | null
  >(null);
  const [quizProgress, setQuizProgress] = useState<string[]>(
    [],
  );
  const [draggedWord, setDraggedWord] = useState<string | null>(
    null,
  );
  const [wrongAnswers, setWrongAnswers] = useState<Set<number>>(
    new Set(),
  );
  const [showWrongMessage, setShowWrongMessage] = useState(false);

  const handleSpeechSelect = (speech: (typeof speeches)[0]) => {
    setSelectedSpeech(speech);
    setCurrentView("speech-detail");
  };

  // Handle API response - navigate to results page
  const handleApiResponse = (responseData: any) => {
    console.log("handleApiResponse called with:", responseData);
    const apiResponse = responseData?.apiResponse || responseData;
    const audioUrl = responseData?.audioUrl || null;
    
    if (apiResponse && !apiResponse.error && selectedSpeech) {
      console.log("Navigating to results page...");
      // Navigate to results page with the API response data and audio URL
      navigate("/famous-speeches/results", {
        state: {
          apiResponse,
          audioUrl,
          speech: selectedSpeech,
          backRoute: "/famous-speeches",
        },
        replace: false, // Allow back button to work
      });
    } else {
      console.log("API response has error or is invalid:", apiResponse);
    }
  };

  const handleStartQuiz = () => {
    setCurrentView("quiz");
    setQuizProgress([]);
    setWrongAnswers(new Set());
    setShowWrongMessage(false);
  };

  const handleWordDrop = (word: string, position: number) => {
    if (!selectedSpeech) return;
    
    const correctAnswers = selectedSpeech.quizCorrectAnswers || [];
    const isCorrect = word === correctAnswers[position];
    
    const newProgress = [...quizProgress];
    newProgress[position] = word;
    setQuizProgress(newProgress);
    
    if (!isCorrect) {
      // Mark this position as wrong
      const newWrongAnswers = new Set(wrongAnswers);
      newWrongAnswers.add(position);
      setWrongAnswers(newWrongAnswers);
      // Show wrong message
      setShowWrongMessage(true);
      // Hide message after 3 seconds
      setTimeout(() => {
        setShowWrongMessage(false);
      }, 3000);
    } else {
      // Remove from wrong answers if it was previously wrong
      const newWrongAnswers = new Set(wrongAnswers);
      newWrongAnswers.delete(position);
      setWrongAnswers(newWrongAnswers);
    }
  };

  const renderSpeechSelection = () => (
    <div
      className="min-h-screen"
      style={{ background: "#1E3A8A" }}
    >
      {/* CSS for Typewriter Effect */}
      <style>
        {`
          .typewriter {
            overflow: hidden;
            white-space: nowrap;
            animation: typing 2s steps(40, end);
          }
          @keyframes typing {
            from { width: 0; }
            to { width: 100%; }
          }
          .kid-pulse {
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .kid-bounce {
            animation: bounce 0.5s ease-in-out;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>

      <header
        className="backdrop-blur-lg border-b sticky top-0 z-50"
        style={{
          background: "rgba(30, 58, 138, 0.95)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-[#F2F6FF] hover:text-[#FFD600] hover:bg-white/10 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("famousSpeeches.back")}
              </Button>
            </div>
            <h1
              className="text-lg font-semibold"
              style={{ color: "#F2F6FF" }}
            >
              {t("famousSpeeches.title")}
            </h1>
            <div></div>
          </div>
        </div>
      </header>

      <div data-mello-scroll className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl font-bold"
            style={{ color: "#F2F6FF" }}
          >
            {t("famousSpeeches.learnFromGreatSpeakers")}
          </h2>
          <p
            className="text-lg"
            style={{ color: "rgba(242, 246, 255, 0.7)" }}
          >
            {t("famousSpeeches.discoverSpeeches")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {speeches.map((speech) => (
            <motion.div
              key={speech.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => {
                const card = e.currentTarget.querySelector('[data-card]') as HTMLElement;
                if (card) {
                  card.style.boxShadow = "0 20px 40px rgba(59, 130, 246, 0.25)";
                }
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget.querySelector('[data-card]') as HTMLElement;
                if (card) {
                  card.style.boxShadow = "0 8px 32px rgba(59, 130, 246, 0.15)";
                }
              }}
            >
              <Card
                data-card
                onClick={() => handleSpeechSelect(speech)}
                style={{
                  borderRadius: "16px",
                  boxShadow: "0 8px 32px rgba(59, 130, 246, 0.15)",
                  backgroundColor: "#FFFFFF",
                  border: "0",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ position: "absolute", top: "16px", right: "16px" }}>
                  <div style={{ fontSize: "1.875rem" }}>{speech.icon}</div>
                </div>

                <CardHeader style={{ paddingBottom: "1rem" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      background: speech.gradient,
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1.5rem",
                      marginLeft: "auto",
                      marginRight: "auto",
                      transition: "transform 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <Volume2 style={{ width: "32px", height: "32px", color: "#FFFFFF" }} />
                  </div>

                  <CardTitle
                    style={{
                      fontSize: "1.25rem",
                      textAlign: "center",
                      color: "#1E3A8A",
                      transition: "color 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#FFD600";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#1E3A8A";
                    }}
                  >
                    {speech.title}
                  </CardTitle>
                  <p
                    style={{
                      textAlign: "center",
                      color: "rgba(30, 58, 138, 0.7)",
                      margin: "0.5rem 0",
                    }}
                  >
                    {speech.description}
                  </p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      textAlign: "center",
                      color: "rgba(30, 58, 138, 0.7)",
                    }}
                  >
                    by {speech.speaker}
                  </p>
                </CardHeader>

                <CardContent style={{ textAlign: "center" }}>
                  <Button
                    size="lg"
                    style={{
                      background: speech.gradient,
                      color: "#FFFFFF",
                      borderRadius: "8px",
                      paddingLeft: "1.5rem",
                      paddingRight: "1.5rem",
                      transition: "opacity 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    {t("famousSpeeches.practiceSpeech")}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSpeechDetail = () => {
    if (!selectedSpeech) return null;

    return (
      <div
        className="min-h-screen"
        style={{ background: "#1E3A8A" }}
      >
        <style>{`
          @media (max-width: 768px) {
            .speech-content-wrapper {
              flex-direction: column !important;
              gap: 1rem !important;
            }
            .speech-recording-sidebar {
              width: 100% !important;
              max-width: 100% !important;
            }
            .speech-content-main {
              width: 100% !important;
            }
          }
        `}</style>
        <header
          className="backdrop-blur-lg border-b sticky top-0 z-50"
          style={{
            background: "rgba(30, 58, 138, 0.95)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("selection")}
                className="text-[#F2F6FF] hover:text-[#FFD600] hover:bg-white/10 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("famousSpeeches.backToSpeeches")}
              </Button>
              <h1
                className="text-lg font-semibold"
                style={{ color: "#F2F6FF" }}
              >
                {selectedSpeech.title}
              </h1>
              <div></div>
            </div>
          </div>
        </header>

        <div data-mello-scroll className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
          <div className="flex gap-12 items-start min-h-[calc(100vh-64px)] speech-content-wrapper">
            {/* Content - Left side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 min-w-0 speech-content-main"
            >
              <Card
                className="bg-[#FFFFFF] border-0 shadow-xl"
                style={{
                  borderRadius: "24px",
                  boxShadow: "0 8px 32px rgba(59, 130, 246, 0.15)",
                }}
              >
                <CardHeader className="text-center">
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      background: selectedSpeech.gradient,
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1.5rem",
                      marginLeft: "auto",
                      marginRight: "auto",
                    }}
                  >
                    <span style={{ fontSize: "1.875rem" }}>
                      {selectedSpeech.icon}
                    </span>
                  </div>
                  <CardTitle
                    className="text-2xl"
                    style={{ color: "#1E3A8A" }}
                  >
                    {selectedSpeech.title}
                  </CardTitle>
                  <p style={{ color: "rgba(30, 58, 138, 0.7)" }}>
                    by {selectedSpeech.speaker}
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div
                    className="bg-[#F2F6FF] rounded-xl p-6"
                    style={{
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                    }}
                  >
                    <h3
                      className="text-lg font-bold mb-4"
                      style={{ color: "#1E3A8A" }}
                    >
                      📖 {t("famousSpeeches.speechForKids")}
                    </h3>
                    <p
                      className="text-base leading-relaxed italic"
                      style={{ color: "#1E3A8A" }}
                    >
                      {selectedSpeech.kidFriendlyText}
                    </p>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleStartQuiz}
                    className="w-full bg-gradient-to-r from-[#3B82F6] to-[#00B9FC] hover:opacity-90 text-white rounded-lg px-6 transition-all duration-200"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {t("famousSpeeches.tryFunActivity")}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recording Section - Right side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-[400px] flex-shrink-0 speech-recording-sidebar"
            >
              <Card
                className="bg-[#FFFFFF] border-0 shadow-xl"
                style={{
                  borderRadius: "24px",
                  boxShadow: "0 8px 32px rgba(59, 130, 246, 0.15)",
                }}
              >
                <CardHeader>
                  <CardTitle
                    className="text-xl"
                    style={{ color: "#1E3A8A" }}
                  >
                    🎤 {t("famousSpeeches.practiceReading")}
                  </CardTitle>
                  <p
                    className="text-sm mt-2"
                    style={{ color: "rgba(30, 58, 138, 0.7)" }}
                  >
                    {t("famousSpeeches.practiceReadingDesc")}
                  </p>
                </CardHeader>

                <CardContent>
                  <AzureAudioRecorder
                    expectedText={selectedSpeech.kidFriendlyText}
                    lessonColor={selectedSpeech.gradient}
                    onApiResponse={handleApiResponse}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (!selectedSpeech) return null;

    const sentence = selectedSpeech.quizSentence || "Complete the sentence by filling in the blanks.";
    const correctAnswers = selectedSpeech.quizCorrectAnswers || [];
    const blankCount = (sentence.match(/_____/g) || []).length;
    
    const isComplete =
      quizProgress.length === correctAnswers.length &&
      quizProgress.every(
        (word, index) => word === correctAnswers[index],
      );

    return (
      <div
        className="min-h-screen"
        style={{ background: "#1E3A8A" }}
      >
        <header
          className="backdrop-blur-lg border-b sticky top-0 z-50"
          style={{
            background: "rgba(30, 58, 138, 0.95)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("speech-detail")}
                className="text-[#F2F6FF] hover:text-[#FFD600] hover:bg-white/10 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("famousSpeeches.backToSpeech")}
              </Button>
              <h1
                className="text-lg font-semibold"
                style={{ color: "#F2F6FF" }}
              >
                {t("famousSpeeches.funWordActivity")}
              </h1>
              <div></div>
            </div>
          </div>
        </header>

        <div data-mello-scroll className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card
            className="bg-[#FFFFFF] border-0 shadow-xl"
            style={{
              borderRadius: "24px",
              boxShadow: "0 8px 32px rgba(59, 130, 246, 0.15)",
            }}
          >
            <CardHeader className="text-center">
              <CardTitle
                className="text-2xl"
                style={{ color: "#1E3A8A" }}
              >
                🧩 {t("famousSpeeches.completeSentence")}
              </CardTitle>
              <p style={{ color: "rgba(30, 58, 138, 0.7)" }}>
                {t("famousSpeeches.dragWords")}
              </p>
            </CardHeader>

            <CardContent className="space-y-8">
              <div
                className="bg-[#F2F6FF] rounded-xl p-6"
                style={{
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                }}
              >
                <div
                  className="text-lg leading-relaxed text-center"
                  style={{ color: "#1E3A8A" }}
                >
                  {sentence
                    .split("_____")
                    .map((part, index) => (
                      <span key={index}>
                        {part}
                        {index < blankCount && (
                          <span
                            className="inline-block w-24 h-10 rounded-lg mx-2 align-middle relative transition-colors"
                            style={{
                              backgroundColor: wrongAnswers.has(index)
                                ? "rgba(239, 68, 68, 0.2)"
                                : "rgba(30, 58, 138, 0.2)",
                              border: wrongAnswers.has(index)
                                ? "2px solid #ef4444"
                                : "2px dashed #3B82F6",
                            }}
                            onDragOver={(e) =>
                              e.preventDefault()
                            }
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedWord) {
                                handleWordDrop(
                                  draggedWord,
                                  index,
                                );
                                setDraggedWord(null);
                              }
                            }}
                          >
                            {quizProgress[index] && (
                              <span
                                className="absolute inset-0 flex items-center justify-center font-medium kid-bounce"
                                style={{
                                  color: wrongAnswers.has(index)
                                    ? "#ef4444"
                                    : "#FFD600",
                                }}
                              >
                                {quizProgress[index]}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    ))}
                </div>
              </div>

              <div className="text-center">
                <h3
                  className="text-lg font-bold"
                  style={{ color: "#1E3A8A" }}
                >
                  🎪 {t("famousSpeeches.wordBank")}
                </h3>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {selectedSpeech.quizWords.map(
                    (word, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => setDraggedWord(word)}
                        className="bg-gradient-to-r from-[#3B82F6] to-[#00B9FC] text-white px-4 py-2 rounded-lg font-medium cursor-grab active:cursor-grabbing hover:scale-105 transition-all duration-200"
                      >
                        {word}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {showWrongMessage && (
                <div
                  className="text-center p-4 rounded-xl animate-pulse"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "2px solid #ef4444",
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">❌</span>
                    <div>
                      <p
                        className="font-bold text-lg"
                        style={{ color: "#dc2626" }}
                      >
                        {t("famousSpeeches.wrongAnswer")}
                      </p>
                      <p
                        className="text-sm mt-1"
                        style={{ color: "rgba(220, 38, 38, 0.8)" }}
                      >
                        {t("famousSpeeches.tryAgainHint")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isComplete && (
                <div className="text-center space-y-4">
                  <div className="text-6xl kid-bounce">🎉</div>
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: "#FFD600" }}
                  >
                    {t("famousSpeeches.fantastic")}
                  </h3>
                  <p
                    style={{ color: "rgba(30, 58, 138, 0.7)" }}
                  >
                    {t("famousSpeeches.completedPerfectly")}
                  </p>
                  <Button
                    size="lg"
                    onClick={() => {
                      setQuizProgress([]);
                      setWrongAnswers(new Set());
                      setShowWrongMessage(false);
                    }}
                    className="bg-gradient-to-r from-[#3B82F6] to-[#00B9FC] hover:opacity-90 text-white rounded-lg px-6"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    {t("modules.ielts.tryAgain")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>


        </div>
      </div>
    );
  };

  switch (currentView) {
    case "selection":
      return renderSpeechSelection();
    case "speech-detail":
      return renderSpeechDetail();
    case "quiz":
      return renderQuiz();
    default:
      return renderSpeechSelection();
  }
}