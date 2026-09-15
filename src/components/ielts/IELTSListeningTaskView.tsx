import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Play, Pause, Clock, Loader2, Headphones, Check, X } from 'lucide-react';

interface ListeningQuestion {
  question_number: number;
  question_type: string;
  question: string;
  options?: string[];
  correct_answer: string | string[];
  prompt?: string;
  text?: string;
  max_words?: number;
}

interface ListeningPart {
  part_number: number;
  audio_url: string;
  instructions?: string;
  questions: ListeningQuestion[];
}

interface ListeningContent {
  id: string;
  title: string;
  audio_url: string;
  questions: ListeningQuestion[];
  parts?: ListeningPart[];
  total_questions: number;
  time_limit_minutes?: number;
}

export function IELTSListeningTaskView() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { token, refreshToken } = useAuth();
  const [listeningContent, setListeningContent] = useState<ListeningContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);

  // Removed excessive logging
  const [isPlaying, setIsPlaying] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string | string[] }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [timeExpired, setTimeExpired] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTime = useRef<number>(Date.now()); // Track when test started

  // Fetch listening content from JSON URL
  useEffect(() => {
    const fetchListeningContent = async () => {
      if (!token || !contentId) {
        setError('Missing authentication or content ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First, get the item from the list to get json_url
        const listResponse = await fetch(
          'https://api.intelliviq.com/api/ielts/listening/content/list.php',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!listResponse.ok) {
          throw new Error(`Failed to fetch content list: ${listResponse.status}`);
        }

        const listData = await listResponse.json();
        const item = listData.items?.find((i: any) => (i.content_id || i.id.toString()) === contentId);
        
        if (!item || !item.json_url) {
          throw new Error('Content not found');
        }

        // Fetch the actual content from json_url (CDN, no auth needed)
        const contentResponse = await fetch(item.json_url);
        
        if (!contentResponse.ok) {
          throw new Error(`Failed to fetch content: ${contentResponse.status}`);
        }

        const content: any = await contentResponse.json();
        // Don't log content to prevent exposing answers in console
        
        // Handle different JSON structures
        let processedContent: ListeningContent;
        
        // Extract audio URL - could be audio_url or audio.url
        const fallbackAudioUrl = content.audio_url || (content.audio && content.audio.url) || (content.audio && typeof content.audio === 'string' ? content.audio : null);
        
        // Extract questions - could be directly in content.questions or in content.parts
        let questions: ListeningQuestion[] = [];
        let parts: ListeningPart[] | undefined = undefined;

        const normalizeQuestion = (q: any, idx: number): ListeningQuestion => {
          const questionType = q.type || q.question_type || 'text';
          let normalizedType = 'text';
          const typeLower = questionType.toString().toLowerCase();
          if (typeLower === 'mcq' || typeLower === 'multiple_choice' || questionType === 'MCQ' || questionType === 'Multiple Choice') {
            normalizedType = 'MCQ';
          } else if (typeLower === 'fib' || typeLower === 'fill_in_blank' || questionType === 'FIB' || questionType === 'Fill in the Blank') {
            normalizedType = 'FIB';
          }
          
          let options: string[] | undefined = undefined;
          if (q.options) {
            if (Array.isArray(q.options)) {
              options = q.options;
            } else if (typeof q.options === 'object' && q.options !== null) {
              options = Object.entries(q.options).map(([key, value]) => `${key}: ${value}`);
            } else if (typeof q.options === 'string') {
              options = [q.options];
            }
          }
          
          return {
            question_number: q.question_id || q.question_number || idx + 1,
            question_type: normalizedType,
            question: q.question || q.text || '',
            options,
            correct_answer: '', // Do not expose correct answers
            prompt: q.prompt,
            text: q.text,
            max_words: q.max_words,
          };
        };

        if (content.questions && Array.isArray(content.questions)) {
          questions = content.questions.map((q: any, idx: number) => normalizeQuestion(q, idx));
        } else if (content.parts && Array.isArray(content.parts)) {
          parts = content.parts.map((part: any, partIdx: number) => {
            const partAudio = part.audio_url || fallbackAudioUrl || '';
            const partQuestions = (part.questions || []).map((q: any, idx: number) => normalizeQuestion(q, idx));
            return {
              part_number: part.part || part.part_number || partIdx + 1,
              audio_url: partAudio,
              instructions: part.instructions,
              questions: partQuestions,
            };
          });
          questions = parts.flatMap((p) => p.questions);
        }
        
        const audioUrl = parts && parts.length > 0 ? parts[0].audio_url : fallbackAudioUrl;
        
        if (!audioUrl) {
          throw new Error('Invalid content structure. Missing audio URL.');
        }
        
        if (!questions || questions.length === 0) {
          throw new Error('Invalid content structure. Missing questions.');
        }
        
        processedContent = {
          id: content.id || contentId || '',
          title: content.title || 'Listening Exercise',
          audio_url: audioUrl,
          questions,
          parts,
          total_questions: questions.length,
          time_limit_minutes: content.time_limit_minutes || 30,
        };
        
        // Don't log processed content to prevent exposing answers in console
        setListeningContent(processedContent);

        // Set time limit
        const timeLimit = content.time_limit_minutes || 30;
        setTimeRemaining(timeLimit * 60);

      } catch (err: any) {
        console.error('Error fetching listening content:', err);
        setError(err.message || 'Failed to load listening content. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchListeningContent();
  }, [token, contentId]);

  // Reset to first part when new content arrives
  useEffect(() => {
    if (listeningContent?.parts && listeningContent.parts.length > 0) {
      setCurrentPartIndex(0);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [listeningContent?.parts?.length]);

  // Timer countdown
  useEffect(() => {
    if (!listeningContent || timeRemaining <= 0) {
      if (timeRemaining <= 0 && listeningContent && !timeExpired) {
        setTimeExpired(true);
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, listeningContent, timeExpired]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAnswerChange = (questionNumber: number, answer: string | string[]) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionNumber]: answer,
    }));
  };

  // Determine current part and all questions
  const currentPart = listeningContent?.parts?.[currentPartIndex];
  const allQuestions = listeningContent?.parts
    ? listeningContent.parts.flatMap((p) => p.questions)
    : listeningContent?.questions || [];

  const currentAudioUrl = currentPart?.audio_url || listeningContent?.audio_url || '';

  const goToNextPart = () => {
    if (!listeningContent?.parts) return;
    if (currentPartIndex < listeningContent.parts.length - 1) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setCurrentPartIndex((prev) => prev + 1);
    }
  };

  const goToPrevPart = () => {
    if (!listeningContent?.parts) return;
    if (currentPartIndex > 0) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setCurrentPartIndex((prev) => prev - 1);
    }
  };

  // Handle exit - save with score 0 and "not attempted"
  const handleExit = async () => {
    if (window.confirm('Are you sure you want to exit? Your progress will be saved with a score of 0.')) {
      if (!listeningContent || !token || !contentId) {
        navigate('/ielts/listening');
        return;
      }

      try {
        // Calculate total time in seconds
        const totalTimeSeconds = Math.floor((Date.now() - startTime.current) / 1000);

        // Format user_answers - ensure it's non-empty
        const formattedAnswers: { [key: string]: string } = {};
        
        // If user has answered questions, use those answers
        if (Object.keys(userAnswers).length > 0) {
          Object.keys(userAnswers).forEach((key) => {
            const questionNum = parseInt(key);
            const answer = userAnswers[questionNum];
            
            let answerValue: string;
            if (Array.isArray(answer)) {
              answerValue = answer.filter(a => a && a.trim()).join(', ');
            } else {
              answerValue = answer || '';
            }
            
            // Extract just the letter if it's formatted
            if (answerValue.includes(':')) {
              answerValue = answerValue.split(':')[0].trim();
            } else {
              answerValue = answerValue.trim();
            }
            
            // Replace empty strings with "Not Attempted"
            formattedAnswers[key] = answerValue || 'Not Attempted';
          });
          
          // Also add "Not Attempted" for any questions that weren't answered
          allQuestions.forEach((q) => {
            const qKey = q.question_number.toString();
            if (!formattedAnswers[qKey]) {
              formattedAnswers[qKey] = 'Not Attempted';
            }
          });
        } else {
          // If no answers, create entries for all questions with "Not Attempted"
          // This ensures user_answers is non-empty as required by API
          allQuestions.forEach((q) => {
            formattedAnswers[q.question_number.toString()] = 'Not Attempted';
          });
        }

        // Save results with score 0
        let currentToken = token;
        const saveWithToken = async (authToken: string | null) => {
          if (!authToken) return null;
          
          return await fetch('https://api.intelliviq.com/api/ielts/listening/results/save-result.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              content_id: contentId,
              total_time_seconds: totalTimeSeconds,
              user_answers: formattedAnswers,
            }),
          });
        };
        
        let response = await saveWithToken(currentToken);
        
        // If 403, try refreshing token and retry
        if (response && response.status === 403) {
          const refreshed = await refreshToken();
          if (refreshed) {
            const updatedAuthData = localStorage.getItem('authData');
            if (updatedAuthData) {
              try {
                const parsed = JSON.parse(updatedAuthData);
                currentToken = parsed.token;
                response = await saveWithToken(currentToken);
              } catch (e) {
                console.error('Error parsing updated auth data:', e);
              }
            }
          }
        }
        
        if (response && response.ok) {
          await response.json();
        }
      } catch (err) {
        console.error('Error saving exit results:', err);
      }
      
      navigate('/ielts/listening');
    }
  };

  // Check if back navigation should be disabled
  const canGoBack = () => {
    // Once test starts, disable back button
    return false;
  };

  // Prevent browser back navigation
  useEffect(() => {
    // Replace current history entry to prevent going back
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = (e: PopStateEvent) => {
      // Prevent default back navigation
      window.history.pushState(null, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleSubmit = async () => {
    if (!listeningContent || !token || !contentId) return;

    setIsSubmitting(true);
    try {
      // Calculate total time in seconds
      const totalTimeSeconds = Math.floor((Date.now() - startTime.current) / 1000);

      // Format user_answers as required by API (question number as key, answer as value)
      const formattedAnswers: { [key: string]: string } = {};
      
      // If user has answered questions, use those answers
      if (Object.keys(userAnswers).length > 0) {
        Object.keys(userAnswers).forEach((key) => {
          const questionNum = parseInt(key);
          const answer = userAnswers[questionNum];
          const question = allQuestions.find(q => q.question_number === questionNum);
          
          let answerValue: string;
          
          if (Array.isArray(answer)) {
            // For FIB questions with multiple blanks, join with comma
            // For MCQ questions with array answers, take first
            if (question?.question_type === 'FIB') {
              answerValue = answer.filter(a => a && a.trim()).join(', ');
            } else {
              answerValue = answer[0] || '';
            }
          } else {
            answerValue = answer || '';
          }
          
          // Extract just the letter if it's formatted (e.g., "B: Option text" -> "B")
          // But only for MCQ questions, not FIB
          if (question?.question_type !== 'FIB' && answerValue.includes(':')) {
            answerValue = answerValue.split(':')[0].trim();
          } else {
            answerValue = answerValue.trim();
          }
          
          // Replace empty strings with "Not Attempted"
          formattedAnswers[key] = answerValue || 'Not Attempted';
        });
        
        // Also add "Not Attempted" for any questions that weren't answered
        allQuestions.forEach((q) => {
          const qKey = q.question_number.toString();
          if (!formattedAnswers[qKey]) {
            formattedAnswers[qKey] = 'Not Attempted';
          }
        });
      } else {
        // If no answers, create entries for all questions with "Not Attempted"
        // This ensures user_answers is non-empty as required by API
        allQuestions.forEach((q) => {
          formattedAnswers[q.question_number.toString()] = 'Not Attempted';
        });
      }

      // Save results to API - backend will handle scoring
      let saveResultResponse: any = null;
      if (token && contentId) {
        try {
          let currentToken = token;
          
          const saveWithToken = async (authToken: string | null) => {
            if (!authToken) return null;
            
            return await fetch('https://api.intelliviq.com/api/ielts/listening/results/save-result.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                content_id: contentId,
                total_time_seconds: totalTimeSeconds,
                user_answers: formattedAnswers,
              }),
            });
          };
          
          let response = await saveWithToken(currentToken);
          
          // If 403, try refreshing token and retry
          if (response && response.status === 403) {
            console.log('Token may be expired, attempting refresh...');
            const refreshed = await refreshToken();
            if (refreshed) {
              const updatedAuthData = localStorage.getItem('authData');
              if (updatedAuthData) {
                try {
                  const parsed = JSON.parse(updatedAuthData);
                  currentToken = parsed.token;
                  response = await saveWithToken(currentToken);
                } catch (e) {
                  console.error('Error parsing updated auth data:', e);
                }
              }
            }
          }
          
          if (response && response.ok) {
            saveResultResponse = await response.json();
          } else if (response) {
            const errorText = await response.text();
            console.error('Failed to save results:', response.status, errorText);
          }
        } catch (saveErr: any) {
          console.error('Error saving results:', saveErr);
        }
      }

      // Extract scoring data from backend response
      // Response format: { success, message, result, scores: { ielts_score, correct_answers, total_questions, accuracy_percent }, time }
      const scores = saveResultResponse?.scores || {};
      const correctCount = scores.correct_answers || 0;
      const totalQuestions = scores.total_questions || listeningContent.total_questions || allQuestions.length;
      const percentage = scores.accuracy_percent || 0;
      const ieltsScore = scores.ielts_score || 0;
      
      // Build answer results - we'll need to calculate this from user answers vs correct answers
      // Since correct answers aren't in the response (for security), we'll mark all as unknown initially
      // The results page can show user answers without correct answers if needed
      const answerResults: { [key: number]: boolean } = {};
      
      // If we have answer_results in the response, use them
      if (saveResultResponse?.answer_results) {
        Object.keys(saveResultResponse.answer_results).forEach((key) => {
          answerResults[parseInt(key)] = saveResultResponse.answer_results[key];
        });
      } else if (saveResultResponse?.raw_result_json) {
        try {
          const rawResult = typeof saveResultResponse.raw_result_json === 'string' 
            ? JSON.parse(saveResultResponse.raw_result_json) 
            : saveResultResponse.raw_result_json;
          
          if (rawResult.answer_results) {
            Object.keys(rawResult.answer_results).forEach((key) => {
              answerResults[parseInt(key)] = rawResult.answer_results[key];
            });
          }
        } catch (e) {
          console.error('Error parsing raw_result_json:', e);
        }
      }

      // Navigate to results page with backend-calculated scores
      navigate(`/ielts/listening/${contentId}/results`, {
        state: {
          listeningContent: {
            ...listeningContent,
            questions: allQuestions.map(q => ({
              ...q,
              correct_answer: '', // Don't pass correct answers in navigation state
            })),
          },
          userAnswers,
          correctCount,
          totalQuestions,
          percentage,
          ieltsScore,
          answerResults,
          saveResultResponse, // Pass full response for correct answers extraction
        },
      });
    } catch (err: any) {
      console.error('Error submitting answers:', err);
      alert(err.message || 'Failed to submit answers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Always return something - ensure component renders
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: '#ffffff' }}>
          <Loader2 style={{ width: '64px', height: '64px', animation: 'spin 1s linear infinite', margin: '0 auto 24px', color: '#a855f7' }} />
          <p style={{ fontSize: '18px', color: '#d1d5db' }}>Loading listening exercise...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !listeningContent) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}>
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          maxWidth: '600px',
        }}>
          <p style={{ color: '#f87171', fontSize: '18px', marginBottom: '24px' }}>
            {error || 'Content not found'}
          </p>
          <button
            onClick={() => navigate('/ielts/listening')}
            style={{
              background: 'linear-gradient(to right, #a855f7, #6366f1)',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            Back to Listening
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <button
          onClick={() => navigate('/ielts/listening')}
          disabled={!canGoBack()}
          style={{
            background: 'transparent',
            border: 'none',
            color: canGoBack() ? '#9ca3af' : '#4b5563',
            cursor: canGoBack() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            padding: '8px 16px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            opacity: canGoBack() ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            if (canGoBack()) {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (canGoBack()) {
              e.currentTarget.style.color = '#9ca3af';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '8px' }} />
          Back
        </button>

        <h1 style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#ffffff',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {listeningContent.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Timer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: timeRemaining < 300 ? '#f87171' : '#ffffff',
            fontSize: '16px',
            fontWeight: '600',
          }}>
            <Clock style={{ width: '18px', height: '18px' }} />
            {formatTime(timeRemaining)}
          </div>

          {/* Exit out of test Button */}
          <button
            onClick={handleExit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
            Exit out of test
          </button>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || timeExpired}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isSubmitting || timeExpired
                ? 'rgba(75, 85, 99, 0.5)'
                : 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #8b5cf6 100%)',
              color: '#ffffff',
              border: isSubmitting || timeExpired
                ? '1px solid rgba(75, 85, 99, 0.5)'
                : '2px solid rgba(168, 85, 247, 0.5)',
              padding: '10px 20px',
              borderRadius: '12px',
              cursor: isSubmitting || timeExpired ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '700',
              opacity: isSubmitting || timeExpired ? 0.5 : 1,
              boxShadow: isSubmitting || timeExpired
                ? 'none'
                : '0 4px 15px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.2)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                Submitting...
              </>
            ) : (
              <>
                <Check style={{ width: '18px', height: '18px' }} />
                Submit
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        flex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px',
        width: '100%',
      }}>
        {/* Part Indicator and Navigation - Separate Box */}
        {listeningContent?.parts && listeningContent.parts.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.4))',
                  border: '2px solid rgba(168, 85, 247, 0.6)',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  boxShadow: '0 4px 16px rgba(168, 85, 247, 0.4)',
                  textTransform: 'uppercase',
                }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#a855f7',
                    boxShadow: '0 0 12px rgba(168,85,247,0.8)',
                  }} />
                  Part {currentPartIndex + 1} of {listeningContent.parts.length}
                </span>
                {currentPart?.instructions && (
                  <span style={{ color: '#e5e7eb', fontSize: '15px', fontWeight: 500 }}>
                    {currentPart.instructions}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={goToPrevPart}
                  disabled={currentPartIndex === 0}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(75, 85, 99, 0.5)',
                    background: currentPartIndex === 0 ? 'rgba(75, 85, 99, 0.2)' : 'rgba(75, 85, 99, 0.4)',
                    color: '#e5e7eb',
                    cursor: currentPartIndex === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    if (currentPartIndex > 0) {
                      e.currentTarget.style.background = 'rgba(75, 85, 99, 0.6)';
                      e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPartIndex > 0) {
                      e.currentTarget.style.background = 'rgba(75, 85, 99, 0.4)';
                      e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                    }
                  }}
                >
                  ← Previous Part
                </button>
                <button
                  onClick={goToNextPart}
                  disabled={currentPartIndex >= listeningContent.parts.length - 1}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(168, 85, 247, 0.6)',
                    background: currentPartIndex >= listeningContent.parts.length - 1 
                      ? 'rgba(168, 85, 247, 0.2)' 
                      : 'linear-gradient(135deg, #a855f7, #6366f1)',
                    color: '#ffffff',
                    cursor: currentPartIndex >= listeningContent.parts.length - 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: currentPartIndex >= listeningContent.parts.length - 1 
                      ? 'none' 
                      : '0 4px 12px rgba(168, 85, 247, 0.4)',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    if (currentPartIndex < listeningContent.parts.length - 1) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Next Part →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Player - IELTS Exam Style */}
        <div style={{
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          border: '1px solid rgba(75, 85, 99, 0.5)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Headphones style={{ width: '24px', height: '24px', color: '#a855f7' }} />
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Audio Player
              </h3>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            padding: '24px',
            backgroundColor: 'rgba(31, 41, 55, 0.6)',
            borderRadius: '12px',
          }}>
            <button
              onClick={handlePlayPause}
              disabled={!currentAudioUrl || timeExpired}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: timeExpired
                  ? 'rgba(75, 85, 99, 0.5)'
                  : 'linear-gradient(135deg, #a855f7, #6366f1)',
                border: 'none',
                color: '#ffffff',
                cursor: timeExpired ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: timeExpired ? 'none' : '0 6px 20px rgba(168, 85, 247, 0.4)',
                transition: 'all 0.3s ease',
                opacity: timeExpired ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!timeExpired) {
                  e.currentTarget.style.transform = 'scale(1.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {isPlaying ? (
                <Pause style={{ width: '28px', height: '28px' }} />
              ) : (
                <Play style={{ width: '28px', height: '28px', marginLeft: '4px' }} />
              )}
            </button>

            <div style={{ flex: 1, maxWidth: '500px' }}>
              <div style={{
                height: '6px',
                backgroundColor: 'rgba(75, 85, 99, 0.5)',
                borderRadius: '3px',
                marginBottom: '8px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {isPlaying && (
                  <div style={{
                    height: '100%',
                    width: '0%',
                    backgroundColor: '#a855f7',
                    borderRadius: '3px',
                    transition: 'width 0.1s linear',
                    animation: 'pulse 2s ease-in-out infinite',
                  }} />
                )}
              </div>
              <p style={{
                color: '#9ca3af',
                fontSize: '13px',
                textAlign: 'center',
                margin: 0,
              }}>
                {isPlaying ? 'Playing...' : 'Click play to start listening'}
              </p>
            </div>
          </div>

          {currentAudioUrl && (
            <audio
              ref={audioRef}
              src={currentAudioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              style={{ display: 'none' }}
            />
          )}
        </div>

        {/* Questions Section - IELTS Exam Style */}
        <div style={{
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          border: '1px solid rgba(75, 85, 99, 0.5)',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '2px solid rgba(168, 85, 247, 0.3)',
            paddingBottom: '12px',
          }}>
            {listeningContent?.parts && listeningContent.parts.length > 0
              ? `Part ${currentPart?.part_number || currentPartIndex + 1} Questions`
              : 'Answer the questions below'}
          </h2>

          <div style={{
            display: 'grid',
            gap: '32px',
          }}>
            {(currentPart?.questions || listeningContent.questions).map((question) => (
              <div
                key={question.question_number}
                style={{
                  paddingBottom: '24px',
                  borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    minWidth: '40px',
                    height: '40px',
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    border: '2px solid rgba(168, 85, 247, 0.5)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#a855f7',
                  }}>
                    {question.question_number}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    {/* FIB Type - Render as Fill in the Blanks */}
                    {question.question_type === 'FIB' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {question.prompt && (
                          <p style={{
                            color: '#d1d5db',
                            fontSize: '15px',
                            fontWeight: '500',
                            marginBottom: '8px',
                            fontStyle: 'italic',
                          }}>
                            {question.prompt}
                          </p>
                        )}
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '8px',
                          lineHeight: '1.8',
                        }}>
                          {(() => {
                            const text = question.text || question.question || '';
                            const parts = text.split('__');
                            const blanks = (text.match(/__/g) || []).length;
                            const currentAnswer = userAnswers[question.question_number];
                            const isArrayAnswer = Array.isArray(currentAnswer);
                            
                            return parts.map((part, idx) => (
                              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: '#ffffff', fontSize: '16px' }}>
                                  {part}
                                </span>
                                {idx < parts.length - 1 && (
                                  <input
                                    type="text"
                                    value={
                                      blanks > 1 && isArrayAnswer
                                        ? (currentAnswer[idx] || '')
                                        : (blanks === 1 && idx === 0
                                            ? (typeof currentAnswer === 'string' ? currentAnswer : '')
                                            : '')
                                    }
                                    onChange={(e) => {
                                      // Handle multiple blanks - store as array if multiple blanks exist
                                      if (blanks > 1) {
                                        const currentAnswers = isArrayAnswer
                                          ? [...currentAnswer]
                                          : new Array(blanks).fill('');
                                        currentAnswers[idx] = e.target.value;
                                        handleAnswerChange(question.question_number, currentAnswers);
                                      } else {
                                        handleAnswerChange(question.question_number, e.target.value);
                                      }
                                    }}
                                    disabled={timeExpired}
                                    placeholder="___"
                                    maxLength={question.max_words ? question.max_words * 15 : undefined}
                                    style={{
                                      minWidth: '120px',
                                      padding: '8px 12px',
                                      backgroundColor: 'rgba(31, 41, 55, 0.6)',
                                      border: '2px solid rgba(75, 85, 99, 0.5)',
                                      borderRadius: '6px',
                                      color: '#ffffff',
                                      fontSize: '16px',
                                      outline: 'none',
                                      opacity: timeExpired ? 0.5 : 1,
                                      cursor: timeExpired ? 'not-allowed' : 'text',
                                      fontFamily: 'inherit',
                                    }}
                                    onFocus={(e) => {
                                      if (!timeExpired) {
                                        e.target.style.borderColor = '#a855f7';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.2)';
                                        e.target.style.backgroundColor = 'rgba(31, 41, 55, 0.8)';
                                      }
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                                      e.target.style.boxShadow = 'none';
                                      e.target.style.backgroundColor = 'rgba(31, 41, 55, 0.6)';
                                    }}
                                  />
                                )}
                              </span>
                            ));
                          })()}
                        </div>
                        {question.max_words && (
                          <p style={{
                            color: '#9ca3af',
                            fontSize: '12px',
                            marginTop: '4px',
                          }}>
                            Maximum {question.max_words} word{question.max_words > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Show question text for non-FIB questions */}
                        {question.question_type !== 'FIB' && (
                          <p style={{
                            color: '#ffffff',
                            fontSize: '16px',
                            fontWeight: '500',
                            marginBottom: '20px',
                            lineHeight: '1.6',
                          }}>
                            {question.question}
                          </p>
                        )}

                        {/* MCQ Type - Render as Radio Buttons */}
                        {((question.question_type === 'MCQ' || question.question_type === 'multiple_choice') && 
                          question.options && 
                          Array.isArray(question.options) && 
                          question.options.length > 0) ? (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {question.options.map((option, idx) => {
                          const optionValue = option.replace(/^[A-Z]:\s*/, ''); // Remove "A: " prefix if present
                          const optionLabel = option;
                          const isSelected = userAnswers[question.question_number] === option || userAnswers[question.question_number] === optionValue;
                          
                          return (
                            <label
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '14px 18px',
                                backgroundColor: isSelected 
                                  ? 'rgba(168, 85, 247, 0.15)' 
                                  : 'rgba(31, 41, 55, 0.6)',
                                border: isSelected
                                  ? '2px solid rgba(168, 85, 247, 0.6)'
                                  : '2px solid rgba(75, 85, 99, 0.5)',
                                borderRadius: '8px',
                                cursor: timeExpired ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: timeExpired ? 0.5 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!timeExpired && !isSelected) {
                                  e.currentTarget.style.backgroundColor = 'rgba(31, 41, 55, 0.8)';
                                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!timeExpired && !isSelected) {
                                  e.currentTarget.style.backgroundColor = 'rgba(31, 41, 55, 0.6)';
                                  e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                                }
                              }}
                            >
                              <input
                                type="radio"
                                name={`question-${question.question_number}`}
                                value={option}
                                checked={isSelected}
                                onChange={(e) => handleAnswerChange(question.question_number, e.target.value)}
                                disabled={timeExpired}
                                style={{
                                  marginRight: '14px',
                                  width: '20px',
                                  height: '20px',
                                  cursor: timeExpired ? 'not-allowed' : 'pointer',
                                  accentColor: '#a855f7',
                                }}
                              />
                              <span style={{ color: '#d1d5db', fontSize: '15px', lineHeight: '1.5' }}>
                                {optionLabel}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      /* Text Type - Render as Input Field */
                      <input
                        type="text"
                        value={userAnswers[question.question_number] || ''}
                        onChange={(e) => handleAnswerChange(question.question_number, e.target.value)}
                        disabled={timeExpired}
                        placeholder="Type your answer here..."
                        style={{
                          width: '100%',
                          maxWidth: '600px',
                          padding: '14px 18px',
                          backgroundColor: 'rgba(31, 41, 55, 0.6)',
                          border: '2px solid rgba(75, 85, 99, 0.5)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '15px',
                          outline: 'none',
                          opacity: timeExpired ? 0.5 : 1,
                          cursor: timeExpired ? 'not-allowed' : 'text',
                          fontFamily: 'inherit',
                        }}
                        onFocus={(e) => {
                          if (!timeExpired) {
                            e.target.style.borderColor = '#a855f7';
                            e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.2)';
                            e.target.style.backgroundColor = 'rgba(31, 41, 55, 0.8)';
                          }
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                          e.target.style.boxShadow = 'none';
                          e.target.style.backgroundColor = 'rgba(31, 41, 55, 0.6)';
                        }}
                      />
                    )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}