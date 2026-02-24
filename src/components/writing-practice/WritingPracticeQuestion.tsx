import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { API_URLS } from '@/config/apiConfig';

interface WritingPracticeQuestionProps {
  question: string;
  questionTitle: string;
  onBack: () => void;
  level: "beginner" | "intermediate" | "advanced";
}

interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

// Component to render text with highlighted corrections
function HighlightedText({ 
  text, 
  corrections 
}: { 
  text: string; 
  corrections: Correction[] 
}) {
  const [activeCorrection, setActiveCorrection] = useState<Correction | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // If no corrections, just return the text
  if (!corrections || corrections.length === 0) {
    return <span style={{ color: "#1E3A8A", lineHeight: 1.8, fontSize: "16px" }}>{text}</span>;
  }

  // Build segments with highlights
  const segments: { text: string; correction?: Correction }[] = [];
  let remainingText = text;

  // Sort corrections by their position in the text
  const sortedCorrections = [...corrections].sort((a, b) => {
    const posA = text.indexOf(a.original);
    const posB = text.indexOf(b.original);
    return posA - posB;
  });

  for (const correction of sortedCorrections) {
    const index = remainingText.indexOf(correction.original);
    if (index === -1) continue;

    // Add text before the correction
    if (index > 0) {
      segments.push({ text: remainingText.slice(0, index) });
    }

    // Add the correction
    segments.push({ text: correction.original, correction });

    // Update remaining text
    remainingText = remainingText.slice(index + correction.original.length);
  }

  // Add any remaining text
  if (remainingText) {
    segments.push({ text: remainingText });
  }

  const handleMouseEnter = (e: React.MouseEvent, correction: Correction) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setActiveCorrection(correction);
  };

  const handleMouseLeave = () => {
    setActiveCorrection(null);
  };

  return (
    <div style={{ position: "relative" }}>
      <p style={{ 
        color: "#1E3A8A", 
        lineHeight: 1.8, 
        fontSize: "16px",
        margin: 0,
        whiteSpace: "pre-wrap"
      }}>
        {segments.map((segment, idx) => {
          if (segment.correction) {
            return (
              <span
                key={idx}
                style={{
                  backgroundColor: "#FEF08A",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  borderBottom: "2px dashed #F59E0B",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => handleMouseEnter(e, segment.correction!)}
                onMouseLeave={handleMouseLeave}
              >
                {segment.text}
              </span>
            );
          }
          return <span key={idx}>{segment.text}</span>;
        })}
      </p>

      {/* Tooltip */}
      {activeCorrection && (
        <div
          style={{
            position: "fixed",
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: "translate(-50%, -100%)",
            backgroundColor: "#1E3A8A",
            color: "white",
            padding: "16px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
            zIndex: 1000,
            maxWidth: "350px",
            minWidth: "250px",
          }}
        >
          {/* Arrow */}
          <div
            style={{
              position: "absolute",
              bottom: "-8px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "8px solid #1E3A8A",
            }}
          />
          
          <div style={{ marginBottom: "12px" }}>
            <span style={{ 
              fontSize: "12px", 
              textTransform: "uppercase", 
              color: "#93C5FD",
              fontWeight: 600,
              letterSpacing: "0.5px"
            }}>
              Original
            </span>
            <p style={{ 
              margin: "4px 0 0 0", 
              textDecoration: "line-through",
              color: "#FCA5A5",
              fontSize: "14px"
            }}>
              {activeCorrection.original}
            </p>
          </div>
          
          <div style={{ marginBottom: "12px" }}>
            <span style={{ 
              fontSize: "12px", 
              textTransform: "uppercase", 
              color: "#93C5FD",
              fontWeight: 600,
              letterSpacing: "0.5px"
            }}>
              Corrected
            </span>
            <p style={{ 
              margin: "4px 0 0 0", 
              color: "#86EFAC",
              fontWeight: 600,
              fontSize: "14px"
            }}>
              {activeCorrection.corrected}
            </p>
          </div>
          
          <div>
            <span style={{ 
              fontSize: "12px", 
              textTransform: "uppercase", 
              color: "#93C5FD",
              fontWeight: 600,
              letterSpacing: "0.5px"
            }}>
              Why?
            </span>
            <p style={{ 
              margin: "4px 0 0 0", 
              fontSize: "13px",
              lineHeight: 1.5,
              color: "#E0E7FF"
            }}>
              {activeCorrection.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function WritingPracticeQuestion({
  question,
  questionTitle,
  onBack,
  level,
}: WritingPracticeQuestionProps) {
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  const hasSavedRef = useRef(false);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      setError("Please write your answer before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const proxyUrl = API_URLS.chatgptProxy;

      console.log("Calling ChatGPT proxy at:", proxyUrl);

      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
          answer: answer,
          level: level,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = `API Error (${response.status}): ${errorText}`;
        try {
          const errJson = JSON.parse(errorText);
          const apiErr = errJson?.error ?? errJson?.message;
          if (typeof apiErr === "string") {
            errMsg = apiErr;
            if (errJson?.details) {
              console.error("API error details:", errJson.details);
            }
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      // Store the original answer in results for display
      data.originalText = answer;
      setResults(data);
      // Reset the save flag when new results are set
      hasSavedRef.current = false;
    } catch (err: any) {
      if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError") || err.code === "ERR_NETWORK") {
        setError("Cannot connect to the ChatGPT proxy server. Please make sure the server is running on port 4000. Run 'npm run proxy:chatgpt' in a separate terminal.");
      } else {
        setError(err.message || "Failed to submit your answer. Please try again.");
      }
      console.error("Error submitting answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save results to database when they're displayed
  useEffect(() => {
    const saveResults = async () => {
      // Only save if we have results, a token, and haven't saved yet
      if (!results || !token || hasSavedRef.current) {
        return;
      }

      // Extract IELTS score from results
      const ieltsScore = results.ieltsScore;
      
      // Only save if we have a valid IELTS score
      if (!ieltsScore || ieltsScore === "N/A") {
        console.log("No valid IELTS score to save");
        return;
      }

      // Map level to uppercase format for API
      const practiceLevel = level.toUpperCase();

      try {
        const response = await fetch("https://api.intelliviq.com/api/writing/save-result.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: questionTitle,
            practice_level: practiceLevel,
            ielts_score: parseFloat(ieltsScore),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to save writing result:", errorText);
          return;
        }

        const data = await response.json();
        console.log("Writing result saved successfully:", data);
        hasSavedRef.current = true;
      } catch (err: any) {
        console.error("Error saving writing result:", err);
        // Don't show error to user, just log it
      }
    };

    saveResults();
  }, [results, token, questionTitle, level]);

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
      padding: "0 16px",
    },
    headerInner: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "64px",
    },
    backButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "transparent",
      border: "none",
      color: "white",
      cursor: "pointer",
      padding: "8px 16px",
      borderRadius: "8px",
      fontSize: "14px",
      transition: "all 0.3s ease",
    },
    headerTitle: {
      fontSize: "20px",
      color: "white",
      margin: 0,
    },
    spacer: {
      width: "128px",
    },
    mainContent: {
      maxWidth: "896px",
      margin: "0 auto",
      padding: "48px 16px",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "16px",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      overflow: "hidden",
    },
    cardHeader: {
      padding: "24px 24px 0 24px",
    },
    cardTitle: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#1E3A8A",
      margin: 0,
    },
    cardTitleLarge: {
      fontSize: "30px",
      fontWeight: "bold",
      color: "#1E3A8A",
      margin: 0,
    },
    cardContent: {
      padding: "24px",
      display: "flex",
      flexDirection: "column" as const,
      gap: "24px",
    },
    questionBox: {
      background: "linear-gradient(to right, #DBEAFE, #BFDBFE)",
      borderRadius: "12px",
      padding: "24px",
      border: "4px solid rgba(59, 130, 246, 0.2)",
    },
    questionLabel: {
      fontSize: "18px",
      fontWeight: 600,
      color: "#1E3A8A",
      marginBottom: "12px",
      margin: "0 0 12px 0",
    },
    questionText: {
      fontSize: "18px",
      color: "#1E3A8A",
      lineHeight: 1.6,
      whiteSpace: "pre-line" as const,
      margin: 0,
    },
    answerSection: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "8px",
    },
    answerLabel: {
      fontSize: "18px",
      fontWeight: 600,
      color: "#1E3A8A",
    },
    textarea: {
      minHeight: "300px",
      width: "100%",
      padding: "16px",
      fontSize: "16px",
      borderRadius: "12px",
      border: "2px solid #E5E7EB",
      outline: "none",
      resize: "vertical" as const,
      fontFamily: "inherit",
      lineHeight: 1.6,
      boxSizing: "border-box" as const,
      color: "#1E3A8A",
      backgroundColor: "white",
    },
    charCount: {
      fontSize: "14px",
      color: "rgba(30, 58, 138, 0.7)",
      margin: 0,
    },
    errorBox: {
      backgroundColor: "#FEF2F2",
      border: "1px solid #FECACA",
      borderRadius: "8px",
      padding: "16px",
    },
    errorText: {
      color: "#991B1B",
      margin: 0,
    },
    submitButton: {
      width: "100%",
      background: "linear-gradient(to right, #3B82F6, #00B9FC)",
      color: "white",
      border: "none",
      borderRadius: "12px",
      padding: "18px 24px",
      fontSize: "18px",
      fontWeight: 600,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      transition: "all 0.3s ease",
      opacity: 1,
    },
    submitButtonDisabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    // Results styles
    scoreBox: {
      background: "linear-gradient(to right, #DBEAFE, #BFDBFE)",
      borderRadius: "12px",
      padding: "24px",
    },
    scoreTitle: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "#1E3A8A",
      marginBottom: "16px",
      margin: "0 0 16px 0",
    },
    scoreValue: {
      fontSize: "48px",
      fontWeight: "bold",
      color: "#3B82F6",
      textAlign: "center" as const,
      marginBottom: "8px",
    },
    scoreLabel: {
      textAlign: "center" as const,
      color: "rgba(30, 58, 138, 0.7)",
      margin: 0,
    },
    feedbackSection: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "16px",
    },
    feedbackTitle: {
      fontSize: "18px",
      fontWeight: 600,
      color: "#1E3A8A",
      marginBottom: "8px",
      margin: "0 0 8px 0",
    },
    feedbackText: {
      color: "#1E3A8A",
      lineHeight: 1.6,
      margin: 0,
    },
    breakdownItem: {
      backgroundColor: "#F2F6FF",
      borderRadius: "8px",
      padding: "16px",
    },
    breakdownTitle: {
      fontWeight: 600,
      color: "#1E3A8A",
      textTransform: "capitalize" as const,
      marginBottom: "4px",
      margin: "0 0 4px 0",
    },
    breakdownText: {
      color: "rgba(30, 58, 138, 0.8)",
      margin: 0,
    },
    suggestionsList: {
      listStyleType: "disc",
      paddingLeft: "20px",
      color: "#1E3A8A",
      display: "flex",
      flexDirection: "column" as const,
      gap: "8px",
      margin: 0,
    },
    yourWritingBox: {
      backgroundColor: "#FFFBEB",
      borderRadius: "12px",
      padding: "24px",
      border: "2px solid #FCD34D",
    },
    highlightHint: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "16px",
      padding: "12px",
      backgroundColor: "#FEF3C7",
      borderRadius: "8px",
      fontSize: "14px",
      color: "#92400E",
    },
    highlightSample: {
      backgroundColor: "#FEF08A",
      padding: "2px 6px",
      borderRadius: "4px",
      borderBottom: "2px dashed #F59E0B",
    },
  };

  if (results) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerInner}>
              <button
                style={styles.backButton}
                onClick={() => {
                  setResults(null);
                  setAnswer("");
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <ArrowLeft style={{ width: "16px", height: "16px" }} />
                Try Again
              </button>
              <h1 style={styles.headerTitle}>Writing Assessment Results</h1>
              <div style={styles.spacer} />
            </div>
          </div>
        </header>

        <div style={styles.mainContent}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitleLarge}>Your Assessment</h2>
            </div>
            <div style={styles.cardContent}>
              {/* Score Box */}
              <div style={styles.scoreBox}>
                <h3 style={styles.scoreTitle}>IELTS Score</h3>
                <div style={styles.scoreValue}>
                  {results.ieltsScore || "N/A"}
                </div>
                <p style={styles.scoreLabel}>Band Score</p>
              </div>

              {/* Your Writing with Highlights */}
              <div style={styles.yourWritingBox}>
                <h4 style={styles.feedbackTitle}>Your Writing (with corrections)</h4>
                
                {/* Hint about highlights */}
                {results.corrections && results.corrections.length > 0 && (
                  <div style={styles.highlightHint}>
                    <span>💡</span>
                    <span>
                      <span style={styles.highlightSample}>Yellow highlighted</span> text needs improvement. 
                      Hover over it to see the correction.
                    </span>
                  </div>
                )}

                <HighlightedText 
                  text={results.originalText || answer} 
                  corrections={results.corrections || []} 
                />
              </div>

              <div style={styles.feedbackSection}>
                {/* Overall Feedback */}
                <div>
                  <h4 style={styles.feedbackTitle}>Overall Feedback</h4>
                  <p style={styles.feedbackText}>{results.feedback || results.response}</p>
                </div>

                {/* Detailed Breakdown */}
                {results.breakdown && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <h4 style={styles.feedbackTitle}>Detailed Breakdown</h4>
                    {Object.entries(results.breakdown).map(([key, value]: [string, any]) => (
                      <div key={key} style={styles.breakdownItem}>
                        <h5 style={styles.breakdownTitle}>
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </h5>
                        <p style={styles.breakdownText}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Strengths */}
                {results.strengths && results.strengths.length > 0 && (
                  <div>
                    <h4 style={styles.feedbackTitle}>✨ Strengths</h4>
                    <ul style={styles.suggestionsList}>
                      {results.strengths.map((strength: string, idx: number) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {results.suggestions && results.suggestions.length > 0 && (
                  <div>
                    <h4 style={styles.feedbackTitle}>📝 Suggestions for Improvement</h4>
                    <ul style={styles.suggestionsList}>
                      {results.suggestions.map((suggestion: string, idx: number) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerInner}>
            <button
              style={styles.backButton}
              onClick={onBack}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <ArrowLeft style={{ width: "16px", height: "16px" }} />
              Back
            </button>
            <h1 style={styles.headerTitle}>Writing Practice</h1>
            <div style={styles.spacer} />
          </div>
        </div>
      </header>

      <div style={styles.mainContent}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>{questionTitle}</h2>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.questionBox}>
              <h3 style={styles.questionLabel}>Question</h3>
              <p style={styles.questionText}>{question}</p>
            </div>

            <div style={styles.answerSection}>
              <label htmlFor="answer" style={styles.answerLabel}>
                Your Answer
              </label>
              <textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write your answer here..."
                style={styles.textarea}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3B82F6";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.2)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E5E7EB";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <p style={styles.charCount}>{answer.length} characters</p>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <p style={styles.errorText}>{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !answer.trim()}
              style={{
                ...styles.submitButton,
                ...(isSubmitting || !answer.trim() ? styles.submitButtonDisabled : {}),
              }}
              onMouseOver={(e) => {
                if (!isSubmitting && answer.trim()) {
                  e.currentTarget.style.transform = "scale(1.02)";
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 style={{ width: "20px", height: "20px", animation: "spin 1s linear infinite" }} />
                  Submitting...
                </>
              ) : (
                <>
                  <Send style={{ width: "20px", height: "20px" }} />
                  Submit for Assessment
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}



