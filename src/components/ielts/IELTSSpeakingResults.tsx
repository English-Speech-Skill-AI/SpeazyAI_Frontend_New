import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, TrendingUp, Mic } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfetti } from '../../hooks/useConfetti';

interface PartEvaluation {
  partNumber: number;
  partScore: number;
  questions: Array<{
    questionId: number;
    questionText: string;
    ieltsScore: number;
    feedback?: string;
    predictedText?: string;
  }>;
  feedback?: string;
  breakdown?: {
    fluencyAndCoherence?: string;
    lexicalResource?: string;
    grammaticalRangeAndAccuracy?: string;
    pronunciation?: string;
  };
  strengths?: string[];
  improvements?: string[];
}

export function IELTSSpeakingResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contentId } = useParams<{ contentId: string }>();
  const { token, refreshToken } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const state = location.state as {
    partEvaluations?: PartEvaluation[];
    overallScore?: number;
    totalTimeSeconds?: number;
    allPartsData?: {
      content_id: string;
      total_time_seconds: number;
      overall_score: number;
      parts: Array<{
        part_number: number;
        part_score: number;
        questions: Array<{
          question_id: number;
          question_text: string;
          ielts_score: number;
          feedback?: string;
          predicted_text?: string;
          duration: number;
        }>;
      }>;
    };
    allResults?: Array<{
      question_id: number;
      question_text: string;
      ielts_score: number;
      feedback?: string;
      predicted_text?: string;
      duration: number;
    }>;
    partResultsMap?: Array<[number, Array<{
      question_id: number;
      question_text: string;
      ielts_score: number;
      feedback?: string;
      predicted_text?: string;
      duration: number;
    }>]>;
  };

  // Celebration confetti when results are shown (only when score > 50%)
  const confettiScore = state?.overallScore ?? 0
  const scorePercent = confettiScore <= 9 ? (confettiScore / 9) * 100 : confettiScore
  const showConfetti = !!(state?.partEvaluations && scorePercent > 50)
  useConfetti(showConfetti)

  if (!state || !state.partEvaluations) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', marginBottom: '16px', fontSize: '16px' }}>No evaluation data found</p>
          <button
            onClick={() => navigate('/ielts/speaking')}
            style={{
              background: 'linear-gradient(to right, #ec4899, #f472b6)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Back to Speaking
          </button>
        </div>
      </div>
    );
  }

  const { partEvaluations, overallScore, totalTimeSeconds } = state;

  const getScoreColor = (score: number) => {
    if (score >= 7) return '#22c55e'; // green
    if (score >= 6) return '#eab308'; // yellow
    if (score >= 5) return '#f97316'; // orange
    return '#f87171'; // red
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Calculate overall score if not provided
  // Only count parts that have at least one evaluated question (score > 0)
  const calculatedOverallScore = overallScore || 
    (partEvaluations.length > 0
      ? (() => {
          const partsWithScores = partEvaluations.filter(part => 
            part.questions && part.questions.some(q => q.ieltsScore > 0)
          );
          if (partsWithScores.length === 0) return 0;
          return partsWithScores.reduce((sum, part) => sum + part.partScore, 0) / partsWithScores.length;
        })()
      : 0);

  // Save results to database on mount - save single JSON with all parts (only once)
  useEffect(() => {
    const saveToDatabase = async () => {
      if (!contentId || isSaving) return;

      // Use allPartsData if available (single JSON with all parts)
      const allPartsData = state.allPartsData;
      
      if (!allPartsData) {
        console.log('No allPartsData found, skipping save');
        return;
      }

      try {
        setIsSaving(true);
        let currentToken = token;

        // Save single JSON with all parts
        try {
          const response = await fetch(
            'https://api.intelliviq.com/api/ielts/speaking/save-result.php',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`,
              },
              body: JSON.stringify(allPartsData),
            }
          );

          // Only retry once for token expiration
          if (response.status === 403 && refreshToken) {
            const newToken = await refreshToken();
            if (newToken) {
              const retryResponse = await fetch(
                'https://api.intelliviq.com/api/ielts/speaking/save-result.php',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${newToken}`,
                  },
                  body: JSON.stringify(allPartsData),
                }
              );

              if (retryResponse.ok) {
                await retryResponse.json();
                console.log('All parts saved successfully after token refresh');
              } else {
                const errorText = await retryResponse.text();
                console.error('Error saving all parts after retry:', errorText);
              }
            }
          } else if (response.ok) {
            await response.json();
            console.log('All parts saved successfully');
          } else {
            const errorText = await response.text();
            console.error('Error saving all parts:', errorText);
            // Don't retry - just log the error
          }
        } catch (error: any) {
          console.error('Error saving all parts to database:', error);
          // Don't retry - just log the error
        }
      } catch (error: any) {
        console.error('Error saving results to database:', error);
      } finally {
        setIsSaving(false);
      }
    };

    // Only save once on mount
    saveToDatabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
      padding: '32px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}>
          <button
            onClick={() => navigate('/ielts/speaking')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              padding: '8px 16px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Back to Speaking
          </button>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            IELTS Speaking Results
          </h1>
          <div style={{ width: '120px' }}></div>
        </div>

        {/* Overall Score Card */}
        <div style={{
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          border: '2px solid rgba(236, 72, 153, 0.5)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: getScoreColor(calculatedOverallScore),
            marginBottom: '16px',
          }}>
            {calculatedOverallScore.toFixed(1)}
          </div>
          <div style={{
            fontSize: '18px',
            color: '#d1d5db',
            marginBottom: '24px',
          }}>
            Overall IELTS Band Score
          </div>
          {totalTimeSeconds && (
            <div style={{
              fontSize: '14px',
              color: '#9ca3af',
            }}>
              <span style={{ color: '#d1d5db', fontWeight: '600' }}>Total Time:</span> {formatTime(totalTimeSeconds)}
            </div>
          )}
        </div>

        {/* Part Results */}
        {partEvaluations.map((partEval, partIndex) => (
          <div
            key={partIndex}
            style={{
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}
          >
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '20px',
              borderBottom: '2px solid rgba(236, 72, 153, 0.5)',
              paddingBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <Mic style={{ width: '24px', height: '24px', color: '#ec4899' }} />
              Part {partEval.partNumber} Results
            </h2>

            {/* Part Score */}
            <div style={{
              textAlign: 'center',
              marginBottom: '24px',
              padding: '20px',
              backgroundColor: 'rgba(31, 41, 55, 0.6)',
              borderRadius: '12px',
            }}>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: getScoreColor(partEval.partScore),
                marginBottom: '8px',
              }}>
                {partEval.partScore > 0 ? partEval.partScore.toFixed(1) : '0.0'}
              </div>
              <div style={{
                fontSize: '16px',
                color: '#d1d5db',
              }}>
                Part {partEval.partNumber} Band Score
              </div>
              {partEval.partScore === 0 && partEval.questions && partEval.questions.length > 0 && (
                <div style={{
                  fontSize: '12px',
                  color: '#f87171',
                  marginTop: '8px',
                }}>
                  {partEval.questions.every(q => q.ieltsScore === 0 && (q.feedback === 'No recording found' || q.feedback === 'Recording found but not evaluated'))
                    ? 'No recordings evaluated for this part'
                    : 'Some questions were not evaluated'}
                </div>
              )}
            </div>

            {/* Part Feedback */}
            {partEval.feedback && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <TrendingUp style={{ width: '18px', height: '18px', color: '#22c55e' }} />
                  Overall Feedback
                </h3>
                <p style={{
                  color: '#d1d5db',
                  lineHeight: '1.6',
                  fontSize: '15px',
                }}>
                  {partEval.feedback}
                </p>
              </div>
            )}

            {/* Part Breakdown */}
            {partEval.breakdown && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '12px',
                }}>
                  Detailed Breakdown
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {partEval.breakdown.fluencyAndCoherence && (
                    <div>
                      <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                        Fluency and Coherence
                      </h4>
                      <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                        {partEval.breakdown.fluencyAndCoherence}
                      </p>
                    </div>
                  )}
                  {partEval.breakdown.lexicalResource && (
                    <div>
                      <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                        Lexical Resource
                      </h4>
                      <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                        {partEval.breakdown.lexicalResource}
                      </p>
                    </div>
                  )}
                  {partEval.breakdown.grammaticalRangeAndAccuracy && (
                    <div>
                      <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                        Grammatical Range and Accuracy
                      </h4>
                      <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                        {partEval.breakdown.grammaticalRangeAndAccuracy}
                      </p>
                    </div>
                  )}
                  {partEval.breakdown.pronunciation && (
                    <div>
                      <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                        Pronunciation
                      </h4>
                      <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                        {partEval.breakdown.pronunciation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Questions and Scores */}
            {partEval.questions && partEval.questions.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '16px',
                }}>
                  Question Scores
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {partEval.questions.map((question, qIndex) => (
                    <div
                      key={qIndex}
                      style={{
                        backgroundColor: 'rgba(31, 41, 55, 0.6)',
                        border: '1px solid rgba(75, 85, 99, 0.5)',
                        borderRadius: '12px',
                        padding: '16px',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            color: '#9ca3af',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            marginBottom: '6px',
                          }}>
                            Question {question.questionId}
                          </div>
                          <p style={{
                            color: '#ffffff',
                            fontSize: '16px',
                            lineHeight: '1.5',
                            margin: 0,
                            marginBottom: '12px',
                          }}>
                            {question.questionText}
                          </p>
                          {/* Show student's spoken answer */}
                          {question.predictedText && (
                            <div style={{
                              marginTop: '12px',
                              padding: '12px',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '8px',
                            }}>
                              <div style={{
                                color: '#60a5fa',
                                fontSize: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                marginBottom: '6px',
                              }}>
                                Your Answer:
                              </div>
                              <p style={{
                                color: '#e0e7ff',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                margin: 0,
                                fontStyle: 'italic',
                              }}>
                                "{question.predictedText}"
                              </p>
                            </div>
                          )}
                        </div>
                        <div style={{
                          fontSize: '32px',
                          fontWeight: 'bold',
                          color: getScoreColor(question.ieltsScore),
                          marginLeft: '16px',
                        }}>
                          {question.ieltsScore.toFixed(1)}
                        </div>
                      </div>
                      {question.feedback && (
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid rgba(75, 85, 99, 0.5)',
                        }}>
                          {question.feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {partEval.strengths && partEval.strengths.length > 0 && (
              <div style={{
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <CheckCircle style={{ width: '18px', height: '18px', color: '#22c55e' }} />
                  Strengths
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {partEval.strengths.map((strength, index) => (
                    <li key={index} style={{
                      color: '#d1d5db',
                      marginBottom: '6px',
                      paddingLeft: '20px',
                      position: 'relative',
                      fontSize: '14px',
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: 0,
                        color: '#22c55e',
                      }}>•</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {partEval.improvements && partEval.improvements.length > 0 && (
              <div style={{
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '12px',
                }}>
                  Suggestions for Improvement
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {partEval.improvements.map((improvement, index) => (
                    <li key={index} style={{
                      color: '#d1d5db',
                      marginBottom: '6px',
                      paddingLeft: '20px',
                      position: 'relative',
                      fontSize: '14px',
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: 0,
                        color: '#6366f1',
                      }}>•</span>
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
