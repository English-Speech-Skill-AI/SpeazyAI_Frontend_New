import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { useConfetti } from '../../hooks/useConfetti';

interface EvaluationData {
  ieltsScore: number;
  feedback: string;
  originalText: string;
  corrections?: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  breakdown?: {
    taskResponse: string;
    coherenceAndCohesion: string;
    lexicalResource: string;
    grammaticalRangeAndAccuracy: string;
  };
  suggestions?: string[];
  strengths?: string[];
}

export function IELTSWritingResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contentId } = useParams<{ contentId: string }>();
  const state = location.state as {
    task1Evaluation?: EvaluationData;
    task2Evaluation?: EvaluationData;
    task1Text?: string;
    task2Text?: string;
    task1Score?: number | null;
    task2Score?: number | null;
    overallScore?: number;
    taskNumber: string;
    taskInstruction: string;
    userResponse: string;
    wordCount: number;
    timeSpent: number;
    totalTimeSeconds?: number;
  };

  // Celebration confetti when results are shown (only when score > 50%)
  const confettiScore = state?.overallScore ?? 0
  const scorePercent = confettiScore <= 9 ? (confettiScore / 9) * 100 : confettiScore
  const showConfetti = !!(state && scorePercent > 50)
  useConfetti(showConfetti)

  if (!state) {
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
            onClick={() => navigate('/ielts/writing')}
            style={{
              background: 'linear-gradient(to right, #22c55e, #10b981)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Back to Writing
          </button>
        </div>
      </div>
    );
  }

  const { 
    task1Evaluation, 
    task2Evaluation, 
    task1Text, 
    task2Text, 
    task1Score, 
    task2Score, 
    overallScore,
    taskNumber,
    taskInstruction,
    userResponse,
    wordCount,
    timeSpent,
    totalTimeSeconds
  } = state;

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

  const hasBothTasks = task1Evaluation && task2Evaluation;

  // Debug: Log the state to help diagnose issues
  console.log('IELTSWritingResults state:', {
    hasBothTasks,
    task1Evaluation: task1Evaluation ? (task1Evaluation.ieltsScore ? `exists (score: ${task1Evaluation.ieltsScore})` : 'exists (no score)') : 'null',
    task2Evaluation: task2Evaluation ? (task2Evaluation.ieltsScore ? `exists (score: ${task2Evaluation.ieltsScore})` : 'exists (no score)') : 'null',
    task1Text: task1Text ? `${task1Text.substring(0, 50)}...` : 'empty',
    task2Text: task2Text ? `${task2Text.substring(0, 50)}...` : 'empty',
    task1Score,
    task2Score,
    stateKeys: Object.keys(state || {}),
    rawTask1Evaluation: task1Evaluation,
  });

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
            onClick={() => navigate('/ielts/writing')}
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
            Back to Writing
          </button>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {hasBothTasks ? 'IELTS Writing Results' : `Task ${taskNumber} Results`}
          </h1>
          <div style={{ width: '120px' }}></div>
        </div>

        {/* Overall Score Card */}
        {hasBothTasks && overallScore !== undefined && (
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            border: '2px solid rgba(34, 197, 94, 0.5)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: getScoreColor(overallScore),
              marginBottom: '16px',
            }}>
              {overallScore.toFixed(1)}
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
        )}

        {/* Task 1 and Task 2 Results Side by Side */}
        {hasBothTasks && task1Evaluation ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginBottom: '24px',
          }}>
            {/* Task 1 Results */}
            <div style={{
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              borderRadius: '16px',
              padding: '24px',
            }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '20px',
              borderBottom: '2px solid rgba(59, 130, 246, 0.5)',
              paddingBottom: '12px',
            }}>
              Task 1 Results
            </h2>

            {/* Task 1 Score */}
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
                color: getScoreColor(task1Score || task1Evaluation.ieltsScore || 0),
                marginBottom: '8px',
              }}>
                {(task1Score || (task1Evaluation && task1Evaluation.ieltsScore) || 0).toFixed(1)}
              </div>
              <div style={{
                fontSize: '16px',
                color: '#d1d5db',
              }}>
                Task 1 Band Score
              </div>
            </div>

            {/* Task 1 Feedback */}
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
                Feedback
              </h3>
              <p style={{
                color: '#d1d5db',
                lineHeight: '1.6',
                fontSize: '15px',
              }}>
                {task1Evaluation.feedback}
              </p>
            </div>

            {/* Task 1 Breakdown */}
            {task1Evaluation.breakdown && (
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
                  <div>
                    <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      Task Response
                    </h4>
                    <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                      {task1Evaluation.breakdown.taskResponse}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      Coherence and Cohesion
                    </h4>
                    <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                      {task1Evaluation.breakdown.coherenceAndCohesion}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      Lexical Resource
                    </h4>
                    <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                      {task1Evaluation.breakdown.lexicalResource}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      Grammatical Range and Accuracy
                    </h4>
                    <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                      {task1Evaluation.breakdown.grammaticalRangeAndAccuracy}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Task 1 Response */}
            {task1Text && (
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '12px',
                }}>
                  Your Task 1 Response
                </h3>
                <div style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  borderRadius: '8px',
                  padding: '16px',
                  color: '#d1d5db',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  {task1Text}
                </div>
              </div>
            )}
            </div>

            {/* Task 2 Results */}
            <div style={{
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              borderRadius: '16px',
              padding: '24px',
            }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '20px',
              borderBottom: '2px solid rgba(34, 197, 94, 0.5)',
              paddingBottom: '12px',
            }}>
              Task 2 Results
            </h2>

            {/* Task 2 Score */}
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
                color: getScoreColor(task2Score || task2Evaluation.ieltsScore || 0),
                marginBottom: '8px',
              }}>
                {(task2Score || task2Evaluation.ieltsScore || 0).toFixed(1)}
              </div>
              <div style={{
                fontSize: '16px',
                color: '#d1d5db',
              }}>
                Task 2 Band Score
              </div>
            </div>

            {/* Task 2 Feedback */}
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
                Feedback
              </h3>
              <p style={{
                color: '#d1d5db',
                lineHeight: '1.6',
                fontSize: '15px',
              }}>
                {task2Evaluation.feedback}
              </p>
            </div>

            {/* Task 2 Breakdown */}
            {task2Evaluation.breakdown && (
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
                  <div>
                    <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      Task Response
                    </h4>
                    <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                      {task2Evaluation.breakdown.taskResponse}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      Coherence and Cohesion
                    </h4>
                    <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                      {task2Evaluation.breakdown.coherenceAndCohesion}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      Lexical Resource
                    </h4>
                    <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                      {task2Evaluation.breakdown.lexicalResource}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      Grammatical Range and Accuracy
                    </h4>
                    <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                      {task2Evaluation.breakdown.grammaticalRangeAndAccuracy}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Task 2 Strengths */}
            {task2Evaluation.strengths && task2Evaluation.strengths.length > 0 && (
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
                  {task2Evaluation.strengths.map((strength, index) => (
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

            {/* Task 2 Corrections */}
            {task2Evaluation.corrections && task2Evaluation.corrections.length > 0 && (
              <div style={{
                border: '1px solid rgba(248, 113, 113, 0.3)',
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
                  <XCircle style={{ width: '18px', height: '18px', color: '#f87171' }} />
                  Corrections
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {task2Evaluation.corrections.map((correction, index) => (
                    <div key={index} style={{
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}>
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>Original: </span>
                        <span style={{ color: '#f87171', textDecoration: 'line-through' }}>
                          {correction.original}
                        </span>
                      </div>
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>Corrected: </span>
                        <span style={{ color: '#22c55e' }}>
                          {correction.corrected}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>Explanation: </span>
                        <span style={{ color: '#d1d5db', fontSize: '13px' }}>
                          {correction.explanation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task 2 Suggestions */}
            {task2Evaluation.suggestions && task2Evaluation.suggestions.length > 0 && (
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
                  {task2Evaluation.suggestions.map((suggestion, index) => (
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
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Task 2 Response */}
            {task2Text && (
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '12px',
                }}>
                  Your Task 2 Response
                </h3>
                <div style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  borderRadius: '8px',
                  padding: '16px',
                  color: '#d1d5db',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px',
                }}>
                  {task2Text}
                </div>
              </div>
            )}
            </div>
          </div>
        ) : null}

        {/* Single Task Results (fallback for old format) */}
        {!hasBothTasks && (task1Evaluation || task2Evaluation) && (
          <>
            {/* Task 1 Results (Single) */}
            {task1Evaluation && (
              <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '20px',
                  borderBottom: '2px solid rgba(59, 130, 246, 0.5)',
                  paddingBottom: '12px',
                }}>
                  Task 1 Results
                </h2>

                {/* Task 1 Score */}
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
                    color: getScoreColor(task1Score || task1Evaluation.ieltsScore || 0),
                    marginBottom: '8px',
                  }}>
                    {(task1Score || task1Evaluation.ieltsScore || 0).toFixed(1)}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: '#d1d5db',
                  }}>
                    Task 1 Band Score
                  </div>
                </div>

                {/* Task 1 Feedback */}
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
                    Feedback
                  </h3>
                  <p style={{
                    color: '#d1d5db',
                    lineHeight: '1.6',
                    fontSize: '15px',
                  }}>
                    {task1Evaluation.feedback}
                  </p>
                </div>

                {/* Task 1 Breakdown */}
                {task1Evaluation.breakdown && (
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
                      <div>
                        <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                          Task Response
                        </h4>
                        <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                          {task1Evaluation.breakdown.taskResponse}
                        </p>
                      </div>
                      <div>
                        <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                          Coherence and Cohesion
                        </h4>
                        <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                          {task1Evaluation.breakdown.coherenceAndCohesion}
                        </p>
                      </div>
                      <div>
                        <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                          Lexical Resource
                        </h4>
                        <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                          {task1Evaluation.breakdown.lexicalResource}
                        </p>
                      </div>
                      <div>
                        <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                          Grammatical Range and Accuracy
                        </h4>
                        <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                          {task1Evaluation.breakdown.grammaticalRangeAndAccuracy}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Task 1 Response */}
                {task1Text && (
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#ffffff',
                      marginBottom: '12px',
                    }}>
                      Your Task 1 Response
                    </h3>
                    <div style={{
                      backgroundColor: 'rgba(31, 41, 55, 0.6)',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      borderRadius: '8px',
                      padding: '16px',
                      color: '#d1d5db',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      fontSize: '14px',
                    }}>
                      {task1Text}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Task 2 Results (Single) */}
            {task2Evaluation && (
              <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '20px',
                  borderBottom: '2px solid rgba(34, 197, 94, 0.5)',
                  paddingBottom: '12px',
                }}>
                  Task 2 Results
                </h2>

                {/* Task 2 Score */}
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
                    color: getScoreColor(task2Score || task2Evaluation.ieltsScore || 0),
                    marginBottom: '8px',
                  }}>
                    {(task2Score || task2Evaluation.ieltsScore || 0).toFixed(1)}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: '#d1d5db',
                  }}>
                    Task 2 Band Score
                  </div>
                </div>

                {/* Task 2 Feedback */}
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
                    Feedback
                  </h3>
                  <p style={{
                    color: '#d1d5db',
                    lineHeight: '1.6',
                    fontSize: '15px',
                  }}>
                    {task2Evaluation.feedback}
                  </p>
                </div>

                {/* Task 2 Breakdown */}
                {task2Evaluation.breakdown && (
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
                      <div>
                        <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                          Task Response
                        </h4>
                        <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                          {task2Evaluation.breakdown.taskResponse}
                        </p>
                      </div>
                      <div>
                        <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                          Coherence and Cohesion
                        </h4>
                        <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                          {task2Evaluation.breakdown.coherenceAndCohesion}
                        </p>
                      </div>
                      <div>
                        <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                          Lexical Resource
                        </h4>
                        <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                          {task2Evaluation.breakdown.lexicalResource}
                        </p>
                      </div>
                      <div>
                        <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                          Grammatical Range and Accuracy
                        </h4>
                        <p style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '14px' }}>
                          {task2Evaluation.breakdown.grammaticalRangeAndAccuracy}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Task 2 Strengths */}
                {task2Evaluation.strengths && task2Evaluation.strengths.length > 0 && (
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
                      {task2Evaluation.strengths.map((strength, index) => (
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

                {/* Task 2 Corrections */}
                {task2Evaluation.corrections && task2Evaluation.corrections.length > 0 && (
                  <div style={{
                    border: '1px solid rgba(248, 113, 113, 0.3)',
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
                      <XCircle style={{ width: '18px', height: '18px', color: '#f87171' }} />
                      Corrections
                    </h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {task2Evaluation.corrections.map((correction, index) => (
                        <div key={index} style={{
                          border: '1px solid rgba(75, 85, 99, 0.5)',
                          borderRadius: '8px',
                          padding: '12px',
                        }}>
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ color: '#9ca3af', fontSize: '13px' }}>Original: </span>
                            <span style={{ color: '#f87171', textDecoration: 'line-through' }}>
                              {correction.original}
                            </span>
                          </div>
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ color: '#9ca3af', fontSize: '13px' }}>Corrected: </span>
                            <span style={{ color: '#22c55e' }}>
                              {correction.corrected}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#9ca3af', fontSize: '13px' }}>Explanation: </span>
                            <span style={{ color: '#d1d5db', fontSize: '13px' }}>
                              {correction.explanation}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Task 2 Suggestions */}
                {task2Evaluation.suggestions && task2Evaluation.suggestions.length > 0 && (
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
                      {task2Evaluation.suggestions.map((suggestion, index) => (
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
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Task 2 Response */}
                {task2Text && (
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#ffffff',
                      marginBottom: '12px',
                    }}>
                      Your Task 2 Response
                    </h3>
                    <div style={{
                      backgroundColor: 'rgba(31, 41, 55, 0.6)',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      borderRadius: '8px',
                      padding: '16px',
                      color: '#d1d5db',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      fontSize: '14px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}>
                      {task2Text}
                    </div>
                  </div>
                )}
              </div>
            )}
            </>
          )}
      </div>
    </div>
  );
}
