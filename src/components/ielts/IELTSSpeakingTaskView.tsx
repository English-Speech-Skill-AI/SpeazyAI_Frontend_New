import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Play, Pause, Clock, Loader2, Mic, X } from 'lucide-react';
import { IELTSAudioRecorder } from './IELTSAudioRecorder';
import { IELTSQuestionRecorder } from './IELTSQuestionRecorder';
import { API_URLS, getSpeechProxyUrl } from '@/config/apiConfig';
import { speechProxyResponseJson } from '@/utils/normalizeSpeechProxyResponse';

interface SpeakingQuestion {
  question_number: number;
  question_type: string;
  question: string;
  prompt?: string;
  text?: string;
  max_words?: number;
  time_limit_seconds?: number;
  cue_card?: {
    topic: string;
    bullet_points?: string[];
  };
}

interface SpeakingPart {
  part_number: number;
  audio_url?: string;
  instructions?: string;
  questions: SpeakingQuestion[];
  cue_card?: {
    topic: string;
    bullet_points?: string[];
  };
}

interface SpeakingContent {
  id: string;
  title: string;
  audio_url?: string;
  questions: SpeakingQuestion[];
  parts?: SpeakingPart[];
  total_questions: number;
  time_limit_minutes?: number;
}

export function IELTSSpeakingTaskView() {
  const { contentId } = useParams<{ contentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { token, refreshToken } = useAuth();
  const [speakingContent, setSpeakingContent] = useState<SpeakingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [timeExpired, setTimeExpired] = useState(false);
  const [preparationMode, setPreparationMode] = useState(false);
  const [preparationTimeRemaining, setPreparationTimeRemaining] = useState(60); // 1 minute in seconds
  const [showRecorder, setShowRecorder] = useState(false);
  const [totalRecordingTimeUsed, setTotalRecordingTimeUsed] = useState(0); // Total time used across all questions in seconds
  const [questionRecordings, setQuestionRecordings] = useState<Map<number, { blob: Blob; duration: number; base64: string }>>(new Map());
  const [currentlyRecordingQuestion, setCurrentlyRecordingQuestion] = useState<number | null>(null);
  const [questionScores, setQuestionScores] = useState<Map<number, { 
    ieltsScore: number; 
    feedback?: string; 
    predictedText?: string; 
    questionText?: string;
    breakdown?: {
      fluencyAndCoherence?: string;
      lexicalResource?: string;
      grammaticalRangeAndAccuracy?: string;
      pronunciation?: string;
    };
    strengths?: string[];
    improvements?: string[];
  }>>(new Map());
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cueCardRecordings, setCueCardRecordings] = useState<Map<number, { base64: string; duration: number }>>(new Map());
  const [hasMovedForward, setHasMovedForward] = useState(false); // Track if user has moved forward
  const [pendingRecordings, setPendingRecordings] = useState<Map<number, { blob: Blob; duration: number; base64: string }>>(new Map()); // Store recordings to process during timer
  const [isSavingToDB, setIsSavingToDB] = useState(false); // Track if currently saving to prevent multiple requests
  const [savedParts, setSavedParts] = useState<Set<number>>(new Set()); // Track which parts have been saved
  const [evaluatedParts, setEvaluatedParts] = useState<Set<number>>(new Set()); // Track which parts have been evaluated
  const [allPartResults, setAllPartResults] = useState<Map<number, Array<{
    questionId: number;
    questionText: string;
    ieltsScore: number;
    feedback?: string;
    predictedText?: string;
    duration: number;
  }>>>(new Map()); // Store evaluated results for each part
  const [part2AutoStartTimer, setPart2AutoStartTimer] = useState(60); // Timer for Part 2 auto-start (1 minute)
  const [part2AutoStartActive, setPart2AutoStartActive] = useState(false); // Track if Part 2 auto-start timer is active
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTime = useRef<number>(Date.now());

  // Fetch speaking content from API
  useEffect(() => {
    const fetchSpeakingContent = async () => {
      if (!token || !contentId) {
        setError('Missing authentication or content ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Prefer CDN JSON from navigation state if provided
        let content: any = null;
        const stateItem = (location.state as any)?.item;
        if (stateItem?.json_url) {
          try {
            const cdnResp = await fetch(stateItem.json_url);
            if (cdnResp.ok) {
              content = await cdnResp.json();
            }
          } catch {
            // ignore CDN failure; fallback to API
          }
        }

        // Fallback to API get.php if CDN not loaded
        if (!content) {
          let currentToken = token;
          const fetchWithToken = async (authToken: string | null) => {
            if (!authToken) return null;
            return await fetch(
              `https://api.intelliviq.com/api/ielts/speaking/content/get.php?content_id=${contentId}`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                },
              }
            );
          };

          let response = await fetchWithToken(currentToken);

          // If 403, try refreshing token and retry
          if (response && response.status === 403) {
            const refreshed = await refreshToken();
            if (refreshed) {
              const updatedAuthData = localStorage.getItem('authData');
              if (updatedAuthData) {
                try {
                  const parsed = JSON.parse(updatedAuthData);
                  currentToken = parsed.token;
                  response = await fetchWithToken(currentToken);
                } catch (e) {
                  console.error('Error parsing updated auth data:', e);
                }
              }
            }
          }

          if (!response || !response.ok) {
            throw new Error(`Failed to fetch content: ${response?.status || 'Unknown'} ${response?.statusText || 'Unknown error'}`);
          }

          content = await response.json();
        }

        // Handle different JSON structures
        let processedContent: SpeakingContent;
        
        // Extract audio URL - could be audio_url or audio.url
        const fallbackAudioUrl = content.audio_url || (content.audio && content.audio.url) || (content.audio && typeof content.audio === 'string' ? content.audio : null);
        
        // Extract questions - could be directly in content.questions or in content.parts
        let questions: SpeakingQuestion[] = [];
        let parts: SpeakingPart[] | undefined = undefined;

        const normalizeQuestion = (q: any, idx: number): SpeakingQuestion => {
          return {
            question_number: q.question_id || q.question_number || idx + 1,
            question_type: q.type || q.question_type || 'text',
            question: q.question || q.text || '',
            prompt: q.prompt,
            text: q.text,
            max_words: q.max_words,
            time_limit_seconds: q.time_limit_seconds,
          };
        };

        if (content.parts && Array.isArray(content.parts)) {
          parts = content.parts.map((part: any, partIdx: number) => {
            const partAudio = part.audio_url || fallbackAudioUrl || '';
            let partQuestions = (part.questions || []).map((q: any, idx: number) => normalizeQuestion(q, idx));
            if ((!partQuestions || partQuestions.length === 0) && part.cue_card) {
              partQuestions = [{
                question_number: part.part || part.part_number || partIdx + 1,
                question_type: 'cue_card',
                question: part.cue_card.topic || 'Cue Card',
                cue_card: {
                  topic: part.cue_card.topic || '',
                  bullet_points: part.cue_card.bullet_points || [],
                },
              }];
            }
            return {
              part_number: part.part || part.part_number || partIdx + 1,
              audio_url: partAudio,
              instructions: part.instructions,
              cue_card: part.cue_card,
              questions: partQuestions,
            };
          });
          questions = parts.flatMap((p) => p.questions);
        } else if (content.questions && Array.isArray(content.questions)) {
          questions = content.questions.map((q: any, idx: number) => normalizeQuestion(q, idx));
        }
        
        if (!questions || questions.length === 0) {
          processedContent = {
            id: content.id || contentId || '',
            title: content.title || 'Speaking Exercise',
            audio_url: fallbackAudioUrl,
            questions: [],
            parts: parts || [],
            total_questions: 0,
            time_limit_minutes: content.time_limit_minutes || 30,
          };
        } else {
          processedContent = {
            id: content.id || contentId || '',
            title: content.title || 'Speaking Exercise',
            audio_url: fallbackAudioUrl,
            questions,
            parts,
            total_questions: questions.length,
            time_limit_minutes: content.time_limit_minutes || 30,
          };
        }
        setSpeakingContent(processedContent);

        // Set time limit
        const timeLimit = content.time_limit_minutes || 30;
        setTimeRemaining(timeLimit * 60);

      } catch (err: any) {
        console.error('Error fetching speaking content:', err);
        setError(err.message || 'Failed to load speaking content. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSpeakingContent();
  }, [token, contentId]);

  // Reset to first part when new content arrives
  useEffect(() => {
    if (speakingContent?.parts && speakingContent.parts.length > 0) {
      setCurrentPartIndex(0);
      setIsPlaying(false);
      setPreparationMode(false);
      setPreparationTimeRemaining(60);
      setShowRecorder(false);
      setPart2AutoStartTimer(60);
      setPart2AutoStartActive(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [speakingContent?.parts?.length]);

  // Part 2 auto-start timer (1 minute countdown, then auto-start recording)
  useEffect(() => {
    if (!speakingContent?.parts) return;
    
    const currentPart = speakingContent.parts[currentPartIndex];
    const currentPartNum = currentPart?.part_number || (currentPartIndex + 1);
    
    // Only activate for Part 2 when showing recorder (cue card)
    if (currentPartNum === 2 && showRecorder && currentPart?.cue_card && part2AutoStartActive && part2AutoStartTimer > 0) {
      const timer = setInterval(() => {
        setPart2AutoStartTimer((prev) => {
          if (prev <= 1) {
            // Timer reached 0 - auto-start will be triggered via autoStart prop
            // Don't set part2AutoStartActive to false here - let the recorder handle it
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentPartIndex, speakingContent, showRecorder, part2AutoStartTimer, part2AutoStartActive]);

  // Preparation timer countdown - Process API calls during this phase
  useEffect(() => {
    if (!preparationMode || preparationTimeRemaining <= 0) {
      if (preparationTimeRemaining <= 0 && preparationMode) {
        setPreparationMode(false);
        setShowRecorder(true);
      }
      return;
    }

    // Process pending recordings during preparation timer (not blocking)
    if (pendingRecordings.size > 0 && preparationTimeRemaining === 60) {
      // Start processing in background
      const processRecordings = async () => {
        // Temporarily restore recordings for API call
        const tempRecordings = new Map(questionRecordings);
        setQuestionRecordings(new Map(pendingRecordings));
        
        try {
          console.log('Processing recordings during preparation timer...');
          await sendRecordingsToAPI();
        } catch (error: any) {
          console.error('Error processing recordings during timer:', error);
        } finally {
          // Restore original recordings
          setQuestionRecordings(tempRecordings);
          // Clear pending recordings after processing
          setPendingRecordings(new Map());
        }
      };
      
      processRecordings();
    }

    const timer = setInterval(() => {
      setPreparationTimeRemaining((prev) => {
        if (prev <= 1) {
          setPreparationMode(false);
          setShowRecorder(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [preparationMode, preparationTimeRemaining, pendingRecordings, questionRecordings]);

  // Handle time expiration - submit results
  const handleTimeExpired = async () => {
    console.log('Time expired - submitting results...');
    try {
      setIsSubmitting(true);
      // Show results first, then save
      await submitResults(true);
      // Results page will handle saving
    } catch (error: any) {
      console.error('Error submitting results on time expiration:', error);
      alert('Error submitting results. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!speakingContent || timeRemaining <= 0) {
      if (timeRemaining <= 0 && speakingContent && !timeExpired) {
        setTimeExpired(true);
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
        // Auto-submit when time expires
        handleTimeExpired();
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
  }, [timeRemaining, speakingContent, timeExpired]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !currentAudioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Determine current part and all questions
  const currentPart = speakingContent?.parts?.[currentPartIndex];
  const currentPartNum = currentPart?.part_number || (currentPartIndex + 1);
  const allQuestions = speakingContent?.parts
    ? speakingContent.parts.flatMap((p) => p.questions)
    : speakingContent?.questions || [];

  const currentAudioUrl = currentPart?.audio_url || speakingContent?.audio_url || '';
  
  // Check if current part should show questions directly (Part 1 and Part 2) or prep timer (Part 3)
  const shouldShowQuestionsDirectly = currentPartNum === 1 || currentPartNum === 2;

  // Function to evaluate recordings for a specific part (from localStorage)
  const evaluatePartRecordings = async (partNumber: number) => {
    if (!speakingContent || !contentId) {
      console.error('Missing speakingContent or contentId for evaluation');
      return;
    }

    const part = speakingContent.parts?.find((p) => (p.part_number || 0) === partNumber);
    if (!part) {
      console.error(`Part ${partNumber} not found in speakingContent`);
      return;
    }

    console.log(`Evaluating Part ${partNumber} recordings...`);
    console.log(`Part ${partNumber} has ${part.questions?.length || 0} questions`);

    const partResults: Array<{
      questionId: number;
      questionText: string;
      ieltsScore: number;
      feedback?: string;
      predictedText?: string;
      duration: number;
    }> = [];

    const proxyUrl = getSpeechProxyUrl('https://apis.languageconfidence.ai/speech-assessment/unscripted/uk');

    // Evaluate regular questions for this part - process ALL questions
    const partQuestions = part.questions || [];
    console.log(`Part ${partNumber}: Processing ${partQuestions.filter((q) => !q.cue_card).length} regular questions`);
    
    for (const question of partQuestions.filter((q) => !q.cue_card)) {
      const questionId = question.question_number;
      const storageKey = `ielts_speaking_audio_${contentId}_q${questionId}`;
      
      try {
        // Get base64 audio from localStorage
        const base64Audio = localStorage.getItem(storageKey);
        if (!base64Audio) {
          console.log(`No audio found in localStorage for Question ${questionId} (key: ${storageKey}) - adding with zero score`);
          // Still add the question with zero score if no recording
          partResults.push({
            questionId,
            questionText: question.question || question.text || question.prompt || '',
            ieltsScore: 0,
            feedback: 'No recording found',
            predictedText: '',
            duration: 0,
          });
          continue;
        }
        
        console.log(`Found audio in localStorage for Question ${questionId}, length: ${base64Audio.length}`);

        // Extract base64 (remove data URL prefix if present)
        const cleanBase64 = base64Audio.includes(',') 
          ? base64Audio.split(',')[1] 
          : base64Audio;

        // Determine audio format
        let audioFormat = 'webm';
        if (base64Audio.includes('audio/mp4') || base64Audio.includes('audio/m4a') || base64Audio.includes('audio/aac')) {
          audioFormat = 'm4a';
        } else if (base64Audio.includes('audio/wav')) {
          audioFormat = 'wav';
        } else if (base64Audio.includes('audio/ogg')) {
          audioFormat = 'ogg';
        }

        console.log(`Evaluating Question ${questionId} from localStorage...`);

        // Use DigitalOcean function
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'lc-beta-features': 'false',
          },
          body: JSON.stringify({
            audio_base64: cleanBase64,
            audio_format: audioFormat,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} ${errorText}`);
        }

        const result = await speechProxyResponseJson(response);
        const predictedText = result?.metadata?.predicted_text || result?.predicted_text || '';
        
        if (predictedText) {
          const questionText = question.question || question.text || question.prompt || '';
          // Evaluate with ChatGPT (skip evaluating state since parent controls it)
          const chatGPTResult = await evaluateWithChatGPT(questionId, questionText, predictedText, result, true);
          
          partResults.push({
            questionId,
            questionText,
            ieltsScore: chatGPTResult?.ieltsScore || 0,
            feedback: chatGPTResult?.feedback,
            predictedText,
            duration: questionRecordings.get(questionId)?.duration || 0,
          });
        }
      } catch (error: any) {
        console.error(`Error evaluating Question ${questionId}:`, error);
        // Add with zero score on error
        partResults.push({
          questionId,
          questionText: question.question || question.text || question.prompt || '',
          ieltsScore: 0,
          feedback: `Evaluation error: ${error.message}`,
          duration: questionRecordings.get(questionId)?.duration || 0,
        });
      }
    }

    // Evaluate cue card if exists
    if (part.cue_card) {
      const storageKey = `ielts_speaking_audio_${contentId}_part${partNumber}`;
      try {
        const base64Audio = localStorage.getItem(storageKey);
        if (!base64Audio) {
          // Add cue card with zero score if no recording
          partResults.push({
            questionId: partNumber,
            questionText: part.cue_card.topic,
            ieltsScore: 0,
            feedback: 'No recording found',
            predictedText: '',
            duration: 0,
          });
        } else if (base64Audio) {
          const cleanBase64 = base64Audio.includes(',') 
            ? base64Audio.split(',')[1] 
            : base64Audio;

          let audioFormat = 'webm';
          if (base64Audio.includes('audio/mp4') || base64Audio.includes('audio/m4a')) {
            audioFormat = 'm4a';
          }

          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'lc-beta-features': 'false',
            },
            body: JSON.stringify({
              audio_base64: cleanBase64,
              audio_format: audioFormat,
            }),
          });

          if (response && response.ok) {
            const result = await speechProxyResponseJson(response);
            const predictedText = result?.metadata?.predicted_text || result?.predicted_text || '';
            
            if (predictedText) {
              const questionText = part.cue_card.topic;
              // Evaluate with ChatGPT (skip evaluating state since parent controls it)
              const chatGPTResult = await evaluateWithChatGPT(partNumber, questionText, predictedText, result, true);
              
              partResults.push({
                questionId: partNumber,
                questionText,
                ieltsScore: chatGPTResult?.ieltsScore || 0,
                feedback: chatGPTResult?.feedback,
                predictedText,
                duration: cueCardRecordings.get(partNumber)?.duration || 0,
              });
            }
          }
        }
      } catch (error: any) {
        console.error(`Error evaluating cue card for Part ${partNumber}:`, error);
      }
    }

    // Always store results for this part (even if empty, to ensure all questions are included)
    // If no results, add all questions with zero scores
    if (partResults.length === 0) {
      // Add all questions with zero scores
      for (const question of partQuestions.filter((q) => !q.cue_card)) {
        partResults.push({
          questionId: question.question_number,
          questionText: question.question || question.text || question.prompt || '',
          ieltsScore: 0,
          feedback: 'No recording found',
          predictedText: '',
          duration: 0,
        });
      }
      
      // Add cue card with zero score if exists
      if (part.cue_card) {
        partResults.push({
          questionId: partNumber,
          questionText: part.cue_card.topic,
          ieltsScore: 0,
          feedback: 'No recording found',
          predictedText: '',
          duration: 0,
        });
      }
    }

    // Store evaluated results for this part
    setAllPartResults((prev) => {
      const newMap = new Map(prev);
      newMap.set(partNumber, partResults);
      return newMap;
    });
    setEvaluatedParts((prev) => new Set([...prev, partNumber]));
    console.log(`Part ${partNumber} evaluation complete:`, partResults);

    return partResults;
  };

  // Function to evaluate speaking response with ChatGPT for IELTS based score
  const evaluateWithChatGPT = async (
    questionId: number,
    questionText: string,
    predictedText: string,
    speechAssessmentResult: any,
    skipEvaluatingState: boolean = false // Allow parent to control loading state
  ) => {
    try {
      if (!skipEvaluatingState) {
        setIsEvaluating(true);
      }
      const proxyUrl = API_URLS.chatgptProxy;

      // Get additional info from speech assessment result (flat LC/Azure aliases + nested LC shape)
      const fluencyScore =
        speechAssessmentResult?.fluency_score ??
        speechAssessmentResult?.fluency?.overall_score ??
        0;
      const pronunciationScore =
        speechAssessmentResult?.pronunciation_score ??
        speechAssessmentResult?.pronunciation?.overall_score ??
        0;
      const overallScore =
        speechAssessmentResult?.overall_score ??
        speechAssessmentResult?.overall?.overall_score ??
        0;
      const wordsArr = speechAssessmentResult?.pronunciation?.words;
      const wordScores =
        speechAssessmentResult?.word_scores?.length > 0
          ? speechAssessmentResult.word_scores
          : Array.isArray(wordsArr)
            ? wordsArr.map((w: { word_text?: string; word_score?: number }) => ({
                word: w.word_text,
                score: w.word_score,
              }))
            : [];

      const prompt = `You are a strict IELTS Speaking examiner following official IELTS Speaking band descriptors EXACTLY. Assess this response with the same rigor as an official IELTS examiner would.

Question: ${questionText}

Student's Response (transcribed from speech): ${predictedText}

Additional Assessment Data from Speech Analysis:
- Fluency Score: ${fluencyScore}/100
- Pronunciation Score: ${pronunciationScore}/100
- Overall Speech Score: ${overallScore}/100
${wordScores.length > 0 ? `- Word-level pronunciation scores available for ${wordScores.length} words` : ''}

CRITICAL: You must assess according to OFFICIAL IELTS Speaking band descriptors (0-9 scale). Be STRICT and ACCURATE. Do NOT be lenient. Use the exact criteria below:

1. Fluency and Coherence:
   - Band 9: Speaks fluently with only rare repetition or self-correction; any hesitation is content-related
   - Band 8: Speaks fluently with only occasional repetition/self-correction; hesitation is usually content-related
   - Band 7: May have language-related hesitation at times; some repetition/self-correction
   - Band 6: Is willing to speak at length but may lose coherence; uses repetition/self-correction
   - Band 5: Usually maintains flow but uses repetition, self-correction, or slow speech
   - Band 4: Cannot respond without noticeable pauses; may speak slowly with frequent repetition
   - Band 3 and below: Long pauses; frequent repetition; minimal coherence

2. Lexical Resource:
   - Band 9: Uses vocabulary with full flexibility and precision; uses idiomatic language naturally
   - Band 8: Uses a wide vocabulary resource readily; uses less common/idiomatic vocabulary
   - Band 7: Has enough vocabulary to discuss topics at length; uses some less common vocabulary
   - Band 6: Has a wide enough vocabulary to discuss topics; attempts to use less common vocabulary
   - Band 5: Manages to talk about familiar/unfamiliar topics but with limited flexibility
   - Band 4: Can talk about familiar topics but uses simple vocabulary; frequent errors
   - Band 3 and below: Very limited vocabulary; frequent errors in word choice

3. Grammatical Range and Accuracy:
   - Band 9: Uses a full range of structures naturally and appropriately; makes only very minor errors
   - Band 8: Uses a wide range of structures flexibly; produces mostly error-free sentences
   - Band 7: Uses a range of complex structures; produces frequent error-free sentences
   - Band 6: Uses a mix of simple and complex structures; makes some errors but meaning is clear
   - Band 5: Uses basic sentence forms with reasonable accuracy; limited range of structures
   - Band 4: Produces basic sentence forms; frequent errors; meaning may be unclear
   - Band 3 and below: Very limited range of structures; frequent errors; meaning often unclear

4. Pronunciation:
   - Band 9: Uses a full range of pronunciation features with precision and subtlety
   - Band 8: Uses a wide range of pronunciation features; sustains flexible use throughout
   - Band 7: Shows all positive features of Band 6 and some of Band 8
   - Band 6: Uses a range of pronunciation features with mixed control; can generally be understood
   - Band 5: Shows all positive features of Band 4 and some of Band 6
   - Band 4: Uses a limited range of pronunciation features; mispronunciations may cause difficulty
   - Band 3 and below: Very limited range of pronunciation features; frequent mispronunciations

IMPORTANT SCORING RULES:
- If the response is very short, lacks detail, or shows minimal language ability, score BELOW 5.0
- If there are frequent grammatical errors, limited vocabulary, or poor pronunciation, score BELOW 6.0
- Only score 7.0+ if the response demonstrates strong language ability with good fluency, vocabulary, grammar, and pronunciation
- Be STRICT: A score of 5.0 means "modest user" - not "good" performance
- Consider the speech analysis scores: if fluency/pronunciation scores are low (<50), the IELTS based score should reflect this

Format your response as JSON with the following structure:
{
  "ieltsScore": <number between 0-9, in 0.5 increments - be STRICT and ACCURATE>,
  "feedback": "<overall feedback text that is honest and specific about weaknesses>",
  "breakdown": {
    "fluencyAndCoherence": "<detailed, honest feedback on fluency and coherence with specific examples>",
    "lexicalResource": "<detailed, honest feedback on vocabulary with specific examples>",
    "grammaticalRangeAndAccuracy": "<detailed, honest feedback on grammar with specific examples>",
    "pronunciation": "<detailed, honest feedback on pronunciation with specific examples>"
  },
  "strengths": ["<strength1>", "<strength2>", ...],
  "improvements": ["<improvement1>", "<improvement2>", ...]
}

Be STRICT, ACCURATE, and HONEST. Do NOT inflate scores. Use official IELTS band descriptors as your guide.`;

      console.log(`Evaluating Question ${questionId} with ChatGPT...`);

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questionText,
          answer: predictedText,
          level: 'advanced', // IELTS is advanced level
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ChatGPT API error: ${response.status} ${errorText}`);
      }

      const chatGPTResult = await response.json();
      const ieltsScore = chatGPTResult.ieltsScore || 0;

      // Store the IELTS based score for this question with full breakdown
      setQuestionScores((prev) => {
        const newMap = new Map(prev);
        newMap.set(questionId, {
          ieltsScore,
          feedback: chatGPTResult.feedback,
          predictedText,
          questionText,
          breakdown: chatGPTResult.breakdown,
          strengths: chatGPTResult.strengths,
          improvements: chatGPTResult.improvements,
        });
        return newMap;
      });

      console.log(`Question ${questionId} IELTS based score: ${ieltsScore}`, chatGPTResult);
      
      return {
        ieltsScore,
        feedback: chatGPTResult.feedback,
        breakdown: chatGPTResult.breakdown,
        strengths: chatGPTResult.strengths,
        improvements: chatGPTResult.improvements,
      };
    } catch (error: any) {
      console.error(`Error evaluating Question ${questionId} with ChatGPT:`, error);
      // Store with error
      setQuestionScores((prev) => {
        const newMap = new Map(prev);
        newMap.set(questionId, {
          ieltsScore: 0,
          feedback: `Evaluation error: ${error.message}`,
          predictedText,
          questionText,
        });
        return newMap;
      });
      
      return {
        ieltsScore: 0,
        feedback: `Evaluation error: ${error.message}`,
      };
    } finally {
      if (!skipEvaluatingState) {
        setIsEvaluating(false);
      }
    }
  };

  // Function to prepare results data for display - use evaluated results from allPartResults
  // Optionally accepts freshResultsMap to override state (for immediate use after evaluation)
  const prepareResultsData = (freshResultsMap?: Map<number, Array<{
    questionId: number;
    questionText: string;
    ieltsScore: number;
    feedback?: string;
    predictedText?: string;
    duration: number;
  }>>) => {
    if (!speakingContent) return null;

    const partEvaluations: Array<{
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
    }> = [];

    // Process each part - use allPartResults if available, otherwise fallback to questionScores
    if (speakingContent.parts) {
      console.log('prepareResultsData: Processing', speakingContent.parts.length, 'parts');
      console.log('prepareResultsData: allPartResults has', allPartResults.size, 'parts');
      console.log('prepareResultsData: allPartResults keys:', Array.from(allPartResults.keys()));
      
      for (const part of speakingContent.parts) {
        const partNumber = part.part_number || 0;
        
        // Get evaluated results for this part - use freshResultsMap if provided, otherwise use state
        const evaluatedPartResults = freshResultsMap?.get(partNumber) || allPartResults.get(partNumber) || [];
        console.log(`prepareResultsData: Part ${partNumber} has ${evaluatedPartResults.length} evaluated results${freshResultsMap?.has(partNumber) ? ' (from fresh results)' : ' (from state)'}`);
        
        // If no results found, check if part has questions
        if (evaluatedPartResults.length === 0) {
          const partQuestions = part.questions || [];
          console.log(`prepareResultsData: Part ${partNumber} has ${partQuestions.length} questions (${partQuestions.filter(q => !q.cue_card).length} regular, ${partQuestions.filter(q => q.cue_card).length} cue cards)`);
        }
        
        // If we have evaluated results, use them
        let partQuestions: Array<{
          questionId: number;
          questionText: string;
          ieltsScore: number;
          feedback?: string;
          predictedText?: string;
        }> = [];

        if (evaluatedPartResults.length > 0) {
          // Use evaluated results
          partQuestions = evaluatedPartResults;
        } else {
          // Fallback: get from questionScores (for backward compatibility)
          const allPartQuestions = part.questions || [];
          
          // Add regular questions
          for (const question of allPartQuestions.filter((q) => !q.cue_card)) {
            const score = questionScores.get(question.question_number);
            
            if (score) {
              partQuestions.push({
                questionId: question.question_number,
                questionText: question.question || question.text || question.prompt || '',
                ieltsScore: score.ieltsScore || 0,
                feedback: score.feedback,
                predictedText: score.predictedText,
              });
            } else {
              // Check if recording exists but wasn't evaluated
              const storageKey = `ielts_speaking_audio_${contentId}_q${question.question_number}`;
              const hasRecording = localStorage.getItem(storageKey);
              if (hasRecording) {
                partQuestions.push({
                  questionId: question.question_number,
                  questionText: question.question || question.text || question.prompt || '',
                  ieltsScore: 0,
                  feedback: 'Recording found but not evaluated',
                  predictedText: '',
                });
              }
            }
          }

          // Add cue card if exists
          if (part.cue_card) {
            const cueCardScore = questionScores.get(partNumber);
            if (cueCardScore) {
              partQuestions.push({
                questionId: partNumber,
                questionText: part.cue_card.topic,
                ieltsScore: cueCardScore.ieltsScore || 0,
                feedback: cueCardScore.feedback,
                predictedText: cueCardScore.predictedText,
              });
            } else {
              // Check if recording exists but wasn't evaluated
              const storageKey = `ielts_speaking_audio_${contentId}_part${partNumber}`;
              const hasRecording = localStorage.getItem(storageKey);
              if (hasRecording) {
                partQuestions.push({
                  questionId: partNumber,
                  questionText: part.cue_card.topic,
                  ieltsScore: 0,
                  feedback: 'Recording found but not evaluated',
                  predictedText: '',
                });
              }
            }
          }
        }

        // Calculate part score (average of all questions in this part)
        const partScore = partQuestions.length > 0
          ? partQuestions.reduce((sum, q) => sum + q.ieltsScore, 0) / partQuestions.length
          : 0;

        // Get part-level feedback from questions' breakdowns
        const partBreakdowns = partQuestions
          .map(q => questionScores.get(q.questionId))
          .filter(Boolean)
          .map(s => s?.breakdown)
          .filter(Boolean);
        
        const breakdown = partBreakdowns.length > 0 ? {
          fluencyAndCoherence: partBreakdowns[0]?.fluencyAndCoherence || '',
          lexicalResource: partBreakdowns[0]?.lexicalResource || '',
          grammaticalRangeAndAccuracy: partBreakdowns[0]?.grammaticalRangeAndAccuracy || '',
          pronunciation: partBreakdowns[0]?.pronunciation || '',
        } : undefined;

        // Collect strengths and improvements from all questions
        const allStrengths = partQuestions
          .flatMap(q => questionScores.get(q.questionId)?.strengths || [])
          .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
        
        const allImprovements = partQuestions
          .flatMap(q => questionScores.get(q.questionId)?.improvements || [])
          .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

        const firstQuestionScore = partQuestions[0] ? questionScores.get(partQuestions[0].questionId) : null;

        partEvaluations.push({
          partNumber,
          partScore,
          questions: partQuestions,
          feedback: firstQuestionScore?.feedback,
          breakdown,
          strengths: allStrengths.length > 0 ? allStrengths : undefined,
          improvements: allImprovements.length > 0 ? allImprovements : undefined,
        });
      }
    }

    return partEvaluations;
  };

  // Function to submit all results to database
  const submitResults = async (showResultsFirst = false) => {
    if (!speakingContent || !contentId) {
      console.error('Missing content or contentId');
      return;
    }

    try {
      // Wait a bit for any pending ChatGPT evaluations to complete
      if (isEvaluating) {
        console.log('Waiting for ChatGPT evaluations to complete...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait up to 3 seconds
      }

      // Evaluate ALL parts that haven't been evaluated yet (especially Part 3)
      // Store results directly to avoid state update timing issues
      const evaluatedResultsMap = new Map<number, Array<{
        questionId: number;
        questionText: string;
        ieltsScore: number;
        feedback?: string;
        predictedText?: string;
        duration: number;
      }>>();
      
      if (speakingContent.parts) {
        for (const part of speakingContent.parts) {
          const partNumber = part.part_number || 0;
          
          if (!evaluatedParts.has(partNumber)) {
            console.log(`Evaluating Part ${partNumber} before submit (was not previously evaluated)...`);
            setIsEvaluating(true); // Show loading screen
            try {
              const partResults = await evaluatePartRecordings(partNumber);
              // Store results directly in our map
              if (partResults && partResults.length > 0) {
                evaluatedResultsMap.set(partNumber, partResults);
                console.log(`Part ${partNumber}: Stored ${partResults.length} evaluated results directly`);
              }
            } catch (error: any) {
              console.error(`Error evaluating Part ${partNumber}:`, error);
            } finally {
              setIsEvaluating(false); // Hide loading screen
            }
          } else {
            console.log(`Part ${partNumber} already evaluated, using existing results`);
            // Use existing results from state
            const existingResults = allPartResults.get(partNumber) || [];
            if (existingResults.length > 0) {
              evaluatedResultsMap.set(partNumber, existingResults);
            }
          }
        }
      }

      // Prepare results for each part separately - use evaluatedResultsMap first, then fallback to allPartResults
      const partResultsMap = new Map<number, Array<{
        question_id: number;
        question_text: string;
        ielts_score: number;
        feedback?: string;
        predicted_text?: string;
        duration: number;
      }>>();

      // Use evaluated results from our map or state
      if (speakingContent.parts) {
        for (const part of speakingContent.parts) {
          const partNumber = part.part_number || 0;
          // Try evaluatedResultsMap first (freshly evaluated), then fallback to allPartResults
          const evaluatedResults = evaluatedResultsMap.get(partNumber) || allPartResults.get(partNumber) || [];
          
          console.log(`Part ${partNumber}: Found ${evaluatedResults.length} evaluated results`);
          
          if (evaluatedResults.length > 0) {
            // Convert to API format
            const partResults = evaluatedResults.map(result => ({
              question_id: result.questionId,
              question_text: result.questionText,
              ielts_score: result.ieltsScore,
              feedback: result.feedback,
              predicted_text: result.predictedText,
              duration: result.duration,
            }));
            
            console.log(`Part ${partNumber}: Adding ${partResults.length} results to map`);
            partResultsMap.set(partNumber, partResults);
          } else {
            // Fallback: try to get from questionScores
            const partResults: Array<{
              question_id: number;
              question_text: string;
              ielts_score: number;
              feedback?: string;
              predicted_text?: string;
              duration: number;
            }> = [];

            const partQuestions = part.questions || [];
            for (const question of partQuestions.filter((q) => !q.cue_card)) {
              const score = questionScores.get(question.question_number);
              
              if (score) {
                partResults.push({
                  question_id: question.question_number,
                  question_text: question.question || question.text || question.prompt || '',
                  ielts_score: score.ieltsScore || 0,
                  feedback: score.feedback,
                  predicted_text: score.predictedText,
                  duration: questionRecordings.get(question.question_number)?.duration || 0,
                });
              }
            }

            // Add cue card
            if (part.cue_card) {
              const score = questionScores.get(partNumber);
              if (score) {
                partResults.push({
                  question_id: partNumber,
                  question_text: part.cue_card.topic,
                  ielts_score: score.ieltsScore || 0,
                  feedback: score.feedback,
                  predicted_text: score.predictedText,
                  duration: cueCardRecordings.get(partNumber)?.duration || 0,
                });
              }
            }

            // Always add part results, even if empty (to ensure all parts are included)
            if (partResults.length > 0) {
              partResultsMap.set(partNumber, partResults);
            } else {
              // If no evaluated results, check if there are recordings in localStorage that weren't evaluated
              // This can happen if evaluation failed or wasn't triggered
              const partQuestions = part.questions || [];
              const recordingsFound: Array<{
                question_id: number;
                question_text: string;
                ielts_score: number;
                feedback?: string;
                predicted_text?: string;
                duration: number;
              }> = [];
              
              // Check localStorage for recordings that weren't evaluated
              for (const question of partQuestions.filter((q) => !q.cue_card)) {
                const storageKey = `ielts_speaking_audio_${contentId}_q${question.question_number}`;
                const hasRecording = localStorage.getItem(storageKey);
                const recording = questionRecordings.get(question.question_number);
                
                if (hasRecording || recording) {
                  // Recording exists but wasn't evaluated - add with zero score and note
                  recordingsFound.push({
                    question_id: question.question_number,
                    question_text: question.question || question.text || question.prompt || '',
                    ielts_score: 0,
                    feedback: 'Recording found but not evaluated',
                    predicted_text: '',
                    duration: recording?.duration || 0,
                  });
                } else {
                  // No recording at all
                  recordingsFound.push({
                    question_id: question.question_number,
                    question_text: question.question || question.text || question.prompt || '',
                    ielts_score: 0,
                    feedback: 'No recording found',
                    duration: 0,
                  });
                }
              }
              
              // Add cue card with zero score if exists
              if (part.cue_card) {
                const storageKey = `ielts_speaking_audio_${contentId}_part${partNumber}`;
                const hasRecording = localStorage.getItem(storageKey);
                const recording = cueCardRecordings.get(partNumber);
                
                if (hasRecording || recording) {
                  recordingsFound.push({
                    question_id: partNumber,
                    question_text: part.cue_card.topic,
                    ielts_score: 0,
                    feedback: 'Recording found but not evaluated',
                    duration: recording?.duration || 0,
                  });
                } else {
                  recordingsFound.push({
                    question_id: partNumber,
                    question_text: part.cue_card.topic,
                    ielts_score: 0,
                    feedback: 'No recording found',
                    duration: 0,
                  });
                }
              }
              
              if (recordingsFound.length > 0) {
                partResultsMap.set(partNumber, recordingsFound);
              }
            }
          }
        }
      } else {
        // Fallback for non-part structure
        const allResults: Array<{
          question_id: number;
          question_text: string;
          ielts_score: number;
          feedback?: string;
          predicted_text?: string;
          duration: number;
        }> = [];

        const allQuestions = speakingContent.questions || [];
        for (const [questionId, recording] of questionRecordings.entries()) {
          const score = questionScores.get(questionId);
          const question = allQuestions.find((q) => q.question_number === questionId);
          
          allResults.push({
            question_id: questionId,
            question_text: question?.question || question?.text || question?.prompt || '',
            ielts_score: score?.ieltsScore || 0,
            feedback: score?.feedback,
            predicted_text: score?.predictedText,
            duration: recording.duration,
          });
        }

        if (allResults.length > 0) {
          partResultsMap.set(1, allResults);
        }
      }

      // Calculate total time taken
      const totalTimeSeconds = Math.floor((Date.now() - startTime.current) / 1000);

      // Update allPartResults with freshly evaluated results for future use
      if (evaluatedResultsMap.size > 0) {
        setAllPartResults((prev) => {
          const newMap = new Map(prev);
          for (const [partNumber, results] of evaluatedResultsMap.entries()) {
            newMap.set(partNumber, results);
            console.log(`Updated allPartResults state: Part ${partNumber} now has ${results.length} results`);
          }
          return newMap;
        });
      }
      
      // Merge evaluatedResultsMap with existing allPartResults for immediate use
      const mergedResultsMap = new Map(allPartResults);
      for (const [partNumber, results] of evaluatedResultsMap.entries()) {
        mergedResultsMap.set(partNumber, results);
        console.log(`Merged results: Part ${partNumber} has ${results.length} results in merged map`);
      }
      
      console.log('Preparing results data, mergedResultsMap:', Array.from(mergedResultsMap.entries()).map(([k, v]) => [k, v.length]));
      // Pass fresh results directly to prepareResultsData to avoid state timing issues
      const partEvaluations = prepareResultsData(mergedResultsMap);
      console.log('Prepared partEvaluations:', partEvaluations?.map(p => ({ part: p.partNumber, questions: p.questions.length })));
      const overallScore = partEvaluations && partEvaluations.length > 0
        ? partEvaluations.reduce((sum, part) => sum + part.partScore, 0) / partEvaluations.length
        : 0;

      // If showResultsFirst is true, navigate to results page first
      if (showResultsFirst && partEvaluations) {
        // Prepare single JSON with all parts divided
        const allPartsData = {
          content_id: contentId,
          total_time_seconds: totalTimeSeconds,
          overall_score: overallScore,
          parts: Array.from(partResultsMap.entries()).map(([partNumber, results]) => ({
            part_number: partNumber,
            part_score: results.length > 0
              ? results.reduce((sum, r) => sum + r.ielts_score, 0) / results.length
              : 0,
            questions: results,
          })),
        };
        
        navigate(`/ielts/speaking/${contentId}/results`, {
          state: {
            partEvaluations,
            overallScore,
            totalTimeSeconds,
            allPartsData, // Single JSON with all parts divided
            partResultsMap: Array.from(partResultsMap.entries()), // Also pass map for backward compatibility
          },
        });
        return { success: true, partEvaluations, overallScore, allPartsData };
      }

      // Prepare single JSON with all parts divided
      const allPartsData = {
        content_id: contentId,
        total_time_seconds: totalTimeSeconds,
        overall_score: overallScore,
        parts: Array.from(partResultsMap.entries()).map(([partNumber, results]) => ({
          part_number: partNumber,
          part_score: results.length > 0
            ? results.reduce((sum, r) => sum + r.ielts_score, 0) / results.length
            : 0,
          questions: results,
        })),
      };

      // Save single JSON with all parts to database (only if not already saving)
      if (isSavingToDB) {
        console.log('Already saving to DB, skipping duplicate request');
        return { success: false, message: 'Already saving', allPartsData };
      }

      setIsSavingToDB(true);
      
      try {
        let currentToken = token;
        const saveAllParts = async (authToken: string): Promise<any> => {
          const response = await fetch(
            'https://api.intelliviq.com/api/ielts/speaking/save-result.php',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
              body: JSON.stringify(allPartsData),
            }
          );

          // Only retry once for token expiration
          if (response.status === 403 && refreshToken) {
            const newToken = await refreshToken();
            if (newToken) {
              // Retry once with new token
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
                const result = await retryResponse.json();
                console.log('All parts saved successfully after token refresh:', result);
                return result;
              } else {
                const errorText = await retryResponse.text();
                throw new Error(`API error after retry: ${retryResponse.status} ${errorText}`);
              }
            }
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} ${errorText}`);
          }

          const result = await response.json();
          console.log('All parts saved successfully:', result);
          return result;
        };

        await saveAllParts(currentToken);
        setIsSavingToDB(false);

        return { 
          success: true, 
          allPartsData,
          results: Array.from(partResultsMap.values()).flat()
        };
      } catch (error: any) {
        console.error('Error saving all parts:', error);
        setIsSavingToDB(false);
        // Don't throw - return with error info
        return { 
          success: false, 
          error: error.message,
          allPartsData,
          results: Array.from(partResultsMap.values()).flat()
        };
      }
    } catch (error: any) {
      console.error('Error submitting results:', error);
      throw error;
    }
  };

  // Function to actually move to next part (called after recording completes)
  const moveToNextPart = async () => {
    if (!speakingContent?.parts) return;
    
    // Evaluate current part before moving (recordings are already in localStorage)
    const currentPart = speakingContent.parts[currentPartIndex];
    const currentPartNum = currentPart?.part_number || (currentPartIndex + 1);
    
    if (!evaluatedParts.has(currentPartNum)) {
      console.log(`Evaluating Part ${currentPartNum} before moving to next part...`);
      setIsEvaluating(true); // Show loading screen
      try {
        await evaluatePartRecordings(currentPartNum);
      } finally {
        setIsEvaluating(false); // Hide loading screen
      }
    }
    
    setIsPlaying(false);
    setPreparationMode(false);
    setPreparationTimeRemaining(60);
    setShowRecorder(false);
    // Reset recording time and recordings for new part
    setTotalRecordingTimeUsed(0);
    setQuestionRecordings(new Map());
    setCueCardRecordings(new Map());
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Only move to next part if there is one
    if (currentPartIndex < speakingContent.parts.length - 1) {
      setCurrentPartIndex((prev) => prev + 1);
    }
  };

  // When "Next Part" button is clicked:
  // - Evaluate current part's recordings from localStorage
  // - Move to next part and show questions
  const goToNextPart = async () => {
    if (!speakingContent?.parts) return;
    
    // Get current part number
    const currentPart = speakingContent.parts[currentPartIndex];
    const currentPartNum = currentPart?.part_number || (currentPartIndex + 1);
    
    // If we're in preparation mode or showing recorder, evaluate current part before moving
    if (preparationMode || showRecorder) {
      // Evaluate current part before moving (if not already evaluated)
      if (!evaluatedParts.has(currentPartNum)) {
        console.log(`Evaluating Part ${currentPartNum} before moving to next part...`);
        setIsEvaluating(true); // Show loading screen
        try {
          await evaluatePartRecordings(currentPartNum);
        } finally {
          setIsEvaluating(false); // Hide loading screen
        }
      }
      
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // Check if there's a next part
      if (currentPartIndex < speakingContent.parts.length - 1) {
        // Move to next part and show its questions
        setCurrentPartIndex((prev) => prev + 1);
        setHasMovedForward(true); // Mark that user has moved forward
        // Reset states for new part - show questions first
        setPreparationMode(false);
        setPreparationTimeRemaining(60);
        setShowRecorder(false);
        setTotalRecordingTimeUsed(0);
        setQuestionRecordings(new Map());
        setCueCardRecordings(new Map());
        // Start Part 2 auto-start timer if moving to Part 2
        const nextPart = speakingContent.parts[currentPartIndex + 1];
        const nextPartNum = nextPart?.part_number || (currentPartIndex + 2);
        if (nextPartNum === 2) {
          setPart2AutoStartTimer(60);
          setPart2AutoStartActive(true);
        } else {
          setPart2AutoStartActive(false);
        }
      }
    } else {
      // We're viewing questions - evaluate current part before moving
      if (!evaluatedParts.has(currentPartNum)) {
        console.log(`Evaluating Part ${currentPartNum} before moving to next part...`);
        setIsEvaluating(true); // Show loading screen
        try {
          await evaluatePartRecordings(currentPartNum);
        } finally {
          setIsEvaluating(false); // Hide loading screen
        }
      }
      
      // If we're on Part 1, move to Part 2 and show questions
      // If we're on Part 3, start preparation for current part (Part 2 doesn't have prep timer)
      if (currentPartIndex === 0 && currentPartIndex < speakingContent.parts.length - 1) {
        // From Part 1: Move to Part 2 and show questions first (no prep timer)
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        
        // Move to Part 2
        setCurrentPartIndex((prev) => prev + 1);
        setHasMovedForward(true); // Mark that user has moved forward
        // Reset states - show cue card with recorder immediately, start auto-start timer
        setPreparationMode(false);
        setPreparationTimeRemaining(60);
        setShowRecorder(true); // Show recorder immediately for Part 2
        setTotalRecordingTimeUsed(0);
        setQuestionRecordings(new Map());
        setCueCardRecordings(new Map());
        // Start Part 2 auto-start timer
        const nextPart = speakingContent.parts[currentPartIndex + 1];
        const nextPartNum = nextPart?.part_number || (currentPartIndex + 2);
        if (nextPartNum === 2) {
          setPart2AutoStartTimer(60);
          setPart2AutoStartActive(true);
        }
      } else {
        // From Part 3 questions: Start preparation mode for current part
        // Part 2 doesn't go through prep mode - it shows questions directly
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        
        // Start preparation mode for current part (Part 3)
        setPreparationMode(true);
        setPreparationTimeRemaining(60);
        setShowRecorder(false);
        // Reset recording time when starting preparation
        setTotalRecordingTimeUsed(0);
        setQuestionRecordings(new Map());
        setCueCardRecordings(new Map());
      }
    }
  };

  const goToPrevPart = () => {
    if (!speakingContent?.parts) return;
    // Don't allow going back if user has moved forward
    if (hasMovedForward || currentPartIndex <= 0) {
      return;
    }
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
    if (window.confirm('Are you sure you want to exit? Your progress will be saved with zero scores.')) {
      try {
        // Prepare zero scores for all parts
        if (!speakingContent || !contentId) {
          navigate('/ielts/speaking');
          return;
        }

        const totalTimeSeconds = Math.floor((Date.now() - startTime.current) / 1000);
        const zeroResults: Array<{
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
        }> = [];

        if (speakingContent.parts) {
          const allPartsData = {
            content_id: contentId,
            total_time_seconds: totalTimeSeconds,
            overall_score: 0,
            parts: speakingContent.parts.map((part) => {
              const partNumber = part.part_number || 0;
              const questions: Array<{
                question_id: number;
                question_text: string;
                ielts_score: number;
                feedback?: string;
                predicted_text?: string;
                duration: number;
              }> = [];

              // Add all questions with zero scores
              const partQuestions = part.questions || [];
              for (const question of partQuestions.filter((q) => !q.cue_card)) {
                questions.push({
                  question_id: question.question_number,
                  question_text: question.question || question.text || question.prompt || '',
                  ielts_score: 0,
                  feedback: 'Not attempted',
                  duration: 0,
                });
              }

              // Add cue card if exists
              if (part.cue_card) {
                questions.push({
                  question_id: partNumber,
                  question_text: part.cue_card.topic,
                  ielts_score: 0,
                  feedback: 'Not attempted',
                  duration: 0,
                });
              }

              return {
                part_number: partNumber,
                part_score: 0,
                questions,
              };
            }),
          };

          // Save zero scores to database
          if (!isSavingToDB) {
            setIsSavingToDB(true);
            try {
              let currentToken = token;
              const saveZeroResults = async (authToken: string) => {
                const response = await fetch(
                  'https://api.intelliviq.com/api/ielts/speaking/save-result.php',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify(allPartsData),
                  }
                );

                if (response.status === 403 && refreshToken) {
                  const newToken = await refreshToken();
                  if (newToken) {
                    return saveZeroResults(newToken);
                  }
                }

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`API error: ${response.status} ${errorText}`);
                }

                return await response.json();
              };

              await saveZeroResults(currentToken);
              console.log('Zero scores saved to database');
            } catch (error: any) {
              console.error('Error saving zero scores:', error);
            } finally {
              setIsSavingToDB(false);
            }
          }
        }

        navigate('/ielts/speaking');
      } catch (error: any) {
        console.error('Error saving results on exit:', error);
        navigate('/ielts/speaking');
      }
    }
  };

  // Handle final submit button
  const handleFinalSubmit = async () => {
    if (window.confirm('Are you sure you want to submit? This will finalize your test.')) {
      try {
        setIsSubmitting(true);
        // Show results first (results page will save to DB)
        await submitResults(true);
      } catch (error: any) {
        console.error('Error submitting final results:', error);
        alert('Error submitting results. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Check if back navigation should be disabled
  const canGoBack = () => {
    return false;
  };

  // Prevent browser back navigation
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = (e: PopStateEvent) => {
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Handle browser refresh - submit results and navigate away
  useEffect(() => {
    let isHandlingRefresh = false;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only handle if we have recordings or scores to save
      if ((questionRecordings.size > 0 || questionScores.size > 0 || cueCardRecordings.size > 0) && !isHandlingRefresh) {
        isHandlingRefresh = true;
        
        // Submit results synchronously using sendBeacon
        try {
          if (speakingContent && contentId) {
            // Prepare results without audio_base64
            const allResults: Array<{
              question_id: number;
              question_text: string;
              ielts_score: number;
              feedback?: string;
              predicted_text?: string;
              duration: number;
            }> = [];

            const allQuestions = speakingContent.parts
              ? speakingContent.parts.flatMap((p) => p.questions)
              : speakingContent.questions || [];

            for (const [questionId, recording] of questionRecordings.entries()) {
              const score = questionScores.get(questionId);
              const question = allQuestions.find((q) => q.question_number === questionId);
              
              allResults.push({
                question_id: questionId,
                question_text: question?.question || question?.text || question?.prompt || '',
                ielts_score: score?.ieltsScore || 0,
                feedback: score?.feedback,
                predicted_text: score?.predictedText,
                duration: recording.duration,
                // Note: audio_base64 removed as per requirement
              });
            }

            for (const [partNumber, recording] of cueCardRecordings.entries()) {
              const score = questionScores.get(partNumber);
              const part = speakingContent.parts?.find((p) => (p.part_number || 0) === partNumber);
              
              if (part?.cue_card) {
                allResults.push({
                  question_id: partNumber,
                  question_text: part.cue_card.topic,
                  ielts_score: score?.ieltsScore || 0,
                  feedback: score?.feedback,
                  predicted_text: score?.predictedText,
                  duration: recording.duration,
                  // Note: audio_base64 removed as per requirement
                });
              }
            }

            const totalTimeSeconds = Math.floor((Date.now() - startTime.current) / 1000);

            // Use sendBeacon for reliable submission during page unload
            const data = JSON.stringify({
              content_id: contentId,
              total_time_seconds: totalTimeSeconds,
              results: allResults,
            });

            // Don't use sendBeacon for refresh - just redirect
            // Results will be saved when user submits normally
            // Redirect to speaking page
            window.location.href = '/ielts/speaking';
          }
        } catch (error) {
          console.error('Error saving on refresh:', error);
          // Still redirect even if save fails
          window.location.href = '/ielts/speaking';
        }
      }
    };

    const handleVisibilityChange = async () => {
      // When page is being hidden (refresh, tab switch, etc.)
      if (document.visibilityState === 'hidden') {
        if (questionRecordings.size > 0 || questionScores.size > 0 || cueCardRecordings.size > 0) {
          try {
            // Submit results
            await submitResults(false);
          } catch (error) {
            console.error('Error submitting on visibility change:', error);
          }
        }
        // Navigate to speaking page using window.location (works during page unload)
        window.location.href = '/ielts/speaking';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [questionRecordings, questionScores, cueCardRecordings, speakingContent, contentId, navigate]);

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
          <Loader2 style={{ width: '64px', height: '64px', animation: 'spin 1s linear infinite', margin: '0 auto 24px', color: '#ec4899' }} />
          <p style={{ color: '#d1d5db', fontSize: '16px' }}>Loading speaking content...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}>
        <div style={{ textAlign: 'center', color: '#ffffff', maxWidth: '600px' }}>
          <p style={{ color: '#f87171', marginBottom: '24px', fontSize: '18px' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/ielts/speaking')}
            style={{
              background: 'linear-gradient(to right, #ec4899, #f472b6)',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
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

  if (!speakingContent) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}>
        <div style={{ textAlign: 'center', color: '#ffffff', maxWidth: '600px' }}>
          <Loader2 style={{ width: '48px', height: '48px', animation: 'spin 1s linear infinite', margin: '0 auto 24px', color: '#ec4899' }} />
          <p style={{ color: '#d1d5db', marginBottom: '24px', fontSize: '16px' }}>
            Loading speaking content...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
      display: 'flex',
      flexDirection: 'column',
      color: '#ffffff',
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Loading Screen - Show when evaluating */}
      {isEvaluating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          gap: '24px',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            border: '4px solid rgba(236, 72, 153, 0.3)',
            borderTop: '4px solid #ec4899',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#ffffff',
            textAlign: 'center',
          }}>
            Evaluating Results...
          </div>
          <div style={{
            fontSize: '16px',
            color: '#9ca3af',
            textAlign: 'center',
          }}>
            Please wait while we analyze your responses
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'rgba(17, 24, 39, 0.9)',
        borderBottom: '1px solid rgba(75, 85, 99, 0.5)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => canGoBack() ? navigate(-1) : undefined}
            disabled={!canGoBack()}
            style={{
              background: 'transparent',
              border: 'none',
              color: canGoBack() ? '#9ca3af' : '#4b5563',
              cursor: canGoBack() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            margin: 0,
            background: 'linear-gradient(to right, #ec4899, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {speakingContent.title}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(236, 72, 153, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(236, 72, 153, 0.3)',
          }}>
            <Clock size={18} color="#ec4899" />
            <span style={{ color: '#ec4899', fontWeight: '600', fontSize: '14px' }}>
              {formatTime(timeRemaining)}
            </span>
          </div>
          {/* Show Submit button when on Part 3 */}
          {speakingContent?.parts && currentPartIndex === speakingContent.parts.length - 1 && !preparationMode && !showRecorder && (
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting || isEvaluating}
              style={{
                background: isSubmitting || isEvaluating
                  ? 'rgba(75, 85, 99, 0.5)'
                  : 'linear-gradient(135deg, #ec4899, #f472b6)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: isSubmitting || isEvaluating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                boxShadow: isSubmitting || isEvaluating 
                  ? 'none' 
                  : '0 4px 12px rgba(236, 72, 153, 0.4)',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !isEvaluating) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {isSubmitting || isEvaluating ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  {isEvaluating ? 'Evaluating...' : 'Submitting...'}
                </>
              ) : (
                'Submit Test'
              )}
            </button>
          )}
          <button
            onClick={handleExit}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ef4444',
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
            <X size={18} />
            Exit out of test
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
        {speakingContent?.parts && speakingContent.parts.length > 0 && (
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
                  background: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(244,114,182,0.4))',
                  border: '2px solid rgba(236, 72, 153, 0.6)',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)',
                  textTransform: 'uppercase',
                }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#ec4899',
                    boxShadow: '0 0 12px rgba(236,72,153,0.8)',
                  }} />
                  Part {currentPartIndex + 1} of {speakingContent.parts.length}
                </span>
                {currentPart?.instructions && (
                  <span style={{ color: '#e5e7eb', fontSize: '15px', fontWeight: 500 }}>
                    {currentPart.instructions}
                  </span>
                )}
              </div>
              {/* Hide navigation buttons during preparation and recording */}
              {!preparationMode && !showRecorder && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                    onClick={goToPrevPart}
                    disabled={currentPartIndex === 0 || hasMovedForward}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      background: (currentPartIndex === 0 || hasMovedForward) ? 'rgba(75, 85, 99, 0.2)' : 'rgba(75, 85, 99, 0.4)',
                      color: '#e5e7eb',
                      cursor: (currentPartIndex === 0 || hasMovedForward) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      if (currentPartIndex > 0) {
                        e.currentTarget.style.background = 'rgba(75, 85, 99, 0.6)';
                        e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.5)';
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
                    disabled={currentPartIndex >= speakingContent.parts.length - 1}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(236, 72, 153, 0.6)',
                      background: currentPartIndex >= speakingContent.parts.length - 1 
                        ? 'rgba(236, 72, 153, 0.2)' 
                        : 'linear-gradient(135deg, #ec4899, #f472b6)',
                      color: '#ffffff',
                      cursor: currentPartIndex >= speakingContent.parts.length - 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: currentPartIndex >= speakingContent.parts.length - 1 
                        ? 'none' 
                        : '0 4px 12px rgba(236, 72, 153, 0.4)',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  onMouseEnter={(e) => {
                    if (currentPartIndex < speakingContent.parts.length - 1) {
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
              )}
            </div>
          </div>
        )}

        {/* Audio Player - IELTS Exam Style (if audio exists) */}
        {currentAudioUrl && (
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
                <Mic style={{ width: '24px', height: '24px', color: '#ec4899' }} />
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
                    : 'linear-gradient(135deg, #ec4899, #f472b6)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: timeExpired ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: timeExpired ? 'none' : '0 6px 20px rgba(236, 72, 153, 0.4)',
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
                      backgroundColor: '#ec4899',
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
        )}

        {/* Preparation Screen - Shows for all parts when Next Part is clicked */}
        {preparationMode && (
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '16px',
            padding: '48px',
            marginBottom: '32px',
            textAlign: 'center',
          }}>
            {/* Part Indicator */}
            {speakingContent?.parts && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '32px',
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(244,114,182,0.4))',
                  border: '2px solid rgba(236, 72, 153, 0.6)',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)',
                  textTransform: 'uppercase',
                }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#ec4899',
                    boxShadow: '0 0 12px rgba(236,72,153,0.8)',
                  }} />
                  Part {currentPartIndex + 1} of {speakingContent.parts.length}
                </span>
              </div>
            )}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(244, 114, 182, 0.4))',
                border: '3px solid rgba(236, 72, 153, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <Clock size={48} color="#ec4899" />
              </div>
              <div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '16px',
                }}>
                  Preparation Time
                </h3>
                <div style={{
                  fontSize: '64px',
                  fontWeight: '700',
                  color: '#ec4899',
                  marginBottom: '8px',
                  fontFamily: 'monospace',
                }}>
                  {formatTime(preparationTimeRemaining)}
                </div>
                <p style={{
                  color: '#9ca3af',
                  fontSize: '16px',
                  marginBottom: '32px',
                }}>
                  Use this time to prepare your response
                </p>
              </div>
              <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.6)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '600px',
                width: '100%',
                textAlign: 'left',
              }}>
                <p style={{
                  color: '#d1d5db',
                  fontSize: '15px',
                  fontWeight: '500',
                  marginBottom: '16px',
                  fontStyle: 'italic',
                }}>
                  {currentPart?.instructions || 'Prepare your response'}
                </p>
                {currentPart?.cue_card ? (
                  <>
                    <p style={{
                      color: '#ffffff',
                      fontSize: '18px',
                      lineHeight: '1.6',
                      marginBottom: '20px',
                      fontWeight: '700',
                    }}>
                      {currentPart.cue_card.topic}
                    </p>
                    {currentPart.cue_card.bullet_points && currentPart.cue_card.bullet_points.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: '24px', color: '#e5e7eb', lineHeight: '1.8' }}>
                        {currentPart.cue_card.bullet_points.map((point, idx) => (
                          <li key={idx} style={{ marginBottom: '12px', fontSize: '16px' }}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <div style={{
                    display: 'grid',
                    gap: '16px',
                  }}>
                    {(currentPart?.questions || []).map((question) => (
                      <div key={question.question_number} style={{
                        padding: '16px',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                      }}>
                        <p style={{
                          color: '#ffffff',
                          fontSize: '16px',
                          lineHeight: '1.6',
                          margin: 0,
                        }}>
                          {question.question}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Audio Recorder - For Part 2 cue card (shows immediately, no prep timer) */}
        {showRecorder && currentPartNum === 2 && currentPart?.cue_card && (
          <div>
            {/* Part Indicator and Navigation - Show for Part 2 */}
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
                    background: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(244,114,182,0.4))',
                    border: '2px solid rgba(236, 72, 153, 0.6)',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)',
                    textTransform: 'uppercase',
                  }}>
                    <span style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#ec4899',
                      boxShadow: '0 0 12px rgba(236,72,153,0.8)',
                    }} />
                    Part {currentPartIndex + 1} of {speakingContent.parts.length}
                  </span>
                  {currentPart?.instructions && (
                    <span style={{ color: '#e5e7eb', fontSize: '15px', fontWeight: 500 }}>
                      {currentPart.instructions}
                    </span>
                  )}
                </div>
                {/* Show Next Part button for Part 2 */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={goToPrevPart}
                    disabled={currentPartIndex === 0 || hasMovedForward}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      background: (currentPartIndex === 0 || hasMovedForward) ? 'rgba(75, 85, 99, 0.2)' : 'rgba(75, 85, 99, 0.4)',
                      color: '#e5e7eb',
                      cursor: (currentPartIndex === 0 || hasMovedForward) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      if (currentPartIndex > 0 && !hasMovedForward) {
                        e.currentTarget.style.background = 'rgba(75, 85, 99, 0.6)';
                        e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPartIndex > 0 && !hasMovedForward) {
                        e.currentTarget.style.background = 'rgba(75, 85, 99, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                      }
                    }}
                  >
                    ← Previous Part
                  </button>
                  <button
                    onClick={goToNextPart}
                    disabled={currentPartIndex >= speakingContent.parts.length - 1}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(236, 72, 153, 0.6)',
                      background: currentPartIndex >= speakingContent.parts.length - 1 
                        ? 'rgba(236, 72, 153, 0.2)' 
                        : 'linear-gradient(135deg, #ec4899, #f472b6)',
                      color: '#ffffff',
                      cursor: currentPartIndex >= speakingContent.parts.length - 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: currentPartIndex >= speakingContent.parts.length - 1 
                        ? 'none' 
                        : '0 4px 12px rgba(236, 72, 153, 0.4)',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      if (currentPartIndex < speakingContent.parts.length - 1) {
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

            {/* Show cue card above the recorder */}
            <div style={{
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '16px',
              }}>
                {currentPart.cue_card.topic}
              </h3>
              {currentPart.cue_card.bullet_points && currentPart.cue_card.bullet_points.length > 0 && (
                <div>
                  <p style={{
                    color: '#e5e7eb',
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '12px',
                  }}>
                    You should say:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '24px', color: '#e5e7eb', lineHeight: '1.8' }}>
                    {currentPart.cue_card.bullet_points.map((point, idx) => (
                      <li key={idx} style={{ marginBottom: '12px', fontSize: '16px' }}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Part 2 Auto-Start Timer Display */}
            {part2AutoStartActive && part2AutoStartTimer > 0 && (
              <div style={{
                backgroundColor: 'rgba(236, 72, 153, 0.2)',
                border: '1px solid rgba(236, 72, 153, 0.5)',
                borderRadius: '12px',
                padding: '16px 24px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{
                  color: '#ec4899',
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: '0 0 8px 0',
                }}>
                  Recording will start automatically in:
                </p>
                <p style={{
                  color: '#ffffff',
                  fontSize: '32px',
                  fontWeight: '700',
                  fontFamily: 'monospace',
                  margin: 0,
                }}>
                  {formatTime(part2AutoStartTimer)}
                </p>
              </div>
            )}
            
            {/* Audio Recorder */}
            <div style={{
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '32px',
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '24px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '2px solid rgba(236, 72, 153, 0.3)',
                paddingBottom: '12px',
              }}>
                Record Your Response (2 minutes)
              </h2>
              <IELTSAudioRecorder
                expectedText=""
                lessonColor="from-pink-500 to-rose-500"
                endpoint="https://apis.languageconfidence.ai/speech-assessment/unscripted/uk"
                autoStart={part2AutoStartTimer === 0 && part2AutoStartActive}
                onRecordingStart={() => {
                  // Stop auto-start timer when recording starts
                  setPart2AutoStartActive(false);
                }}
                onApiResponse={async (response: any) => {
                  // Handle API response
                  console.log('Cue card recording assessment result:', response);
                  
                  if (response && !response.error) {
                    // Extract predicted_text and audio from response
                    const apiResponse = response.apiResponse || response;
                    const predictedText = apiResponse?.metadata?.predicted_text || apiResponse?.predicted_text || '';
                    const audioUrl = response.audioUrl || '';
                    
                    if (currentPart?.cue_card) {
                      const questionText = currentPart.cue_card.topic;
                      const questionId = currentPart.part_number || currentPartIndex + 1;
                      
                      // Store cue card recording if audio URL is available
                      if (audioUrl) {
                        setCueCardRecordings((prev) => {
                          const newMap = new Map(prev);
                          // Estimate duration from API response or use a default
                          const duration = apiResponse?.duration || 120; // Default 2 minutes for cue card
                          newMap.set(questionId, {
                            base64: audioUrl,
                            duration,
                          });
                          
                          // Store base64 audio in localStorage
                          const storageKey = `ielts_speaking_audio_${contentId}_part${questionId}`;
                          try {
                            localStorage.setItem(storageKey, audioUrl);
                            console.log(`Cue card Part ${questionId} audio stored in localStorage`);
                          } catch (error) {
                            console.error('Error storing cue card audio in localStorage:', error);
                          }
                          
                          return newMap;
                        });
                      }
                      
                      if (predictedText) {
                        // Evaluate with ChatGPT for IELTS based score (run in background)
                        evaluateWithChatGPT(questionId, questionText, predictedText, apiResponse).catch((err) => {
                          console.error(`Background ChatGPT evaluation failed for cue card:`, err);
                        });
                      }
                    }
                    
                    // Stop auto-start timer
                    setPart2AutoStartActive(false);
                    
                    // Small delay to show the result, then move to next part
                    setTimeout(() => {
                      moveToNextPart();
                    }, 2000);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Audio Recorder - For Part 3 (shows after preparation time) */}
        {showRecorder && currentPartNum === 3 && (
          <div>
            {/* Show questions above the recorder for reference */}
            {(currentPart?.questions || []).filter((q) => !q.cue_card).length > 0 && (
              <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
                borderRadius: '16px',
                padding: '32px',
                marginBottom: '24px',
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '20px',
                }}>
                  Questions to Answer:
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {(currentPart?.questions || []).filter((q) => !q.cue_card).map((question) => (
                    <div key={question.question_number} style={{
                      padding: '16px',
                      backgroundColor: 'rgba(236, 72, 153, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                    }}>
                      <p style={{
                        color: '#ffffff',
                        fontSize: '16px',
                        lineHeight: '1.6',
                        margin: 0,
                      }}>
                        {question.question || question.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Audio Recorder */}
            <div style={{
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '32px',
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '24px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '2px solid rgba(236, 72, 153, 0.3)',
                paddingBottom: '12px',
              }}>
                Record Your Response
              </h2>
              {/* Part 3 uses question recorders */}
              {(currentPart?.questions || []).filter((q) => !q.cue_card).map((question) => (
                <div key={question.question_number} style={{ marginBottom: '24px' }}>
                  <p style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    marginBottom: '12px',
                  }}>
                    {question.question || question.text}
                  </p>
                  <IELTSQuestionRecorder
                    questionId={question.question_number}
                    maxTimeSeconds={120}
                    totalTimeUsed={0}
                    isRecording={currentlyRecordingQuestion === question.question_number}
                    shouldStop={currentlyRecordingQuestion !== null && currentlyRecordingQuestion !== question.question_number}
                    onRecordingStart={(qId) => {
                      if (currentlyRecordingQuestion && currentlyRecordingQuestion !== qId) {
                        setCurrentlyRecordingQuestion(null);
                      }
                      setCurrentlyRecordingQuestion(qId);
                    }}
                    onRecordingComplete={(audioBlob, duration, base64Audio) => {
                      setQuestionRecordings((prev) => {
                        const newMap = new Map(prev);
                        newMap.set(question.question_number, { 
                          blob: audioBlob, 
                          duration,
                          base64: base64Audio
                        });
                        
                        const storageKey = `ielts_speaking_audio_${contentId}_q${question.question_number}`;
                        try {
                          localStorage.setItem(storageKey, base64Audio);
                          console.log(`Question ${question.question_number} audio stored in localStorage`);
                        } catch (error) {
                          console.error('Error storing audio in localStorage:', error);
                        }
                        
                        return newMap;
                      });
                      setCurrentlyRecordingQuestion(null);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions Section - IELTS Exam Style */}
        {!preparationMode && !showRecorder && (
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '16px',
            padding: '32px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '2px solid rgba(236, 72, 153, 0.3)',
                paddingBottom: '12px',
                flex: 1,
              }}>
                {speakingContent?.parts && speakingContent.parts.length > 0
                  ? `Part ${currentPart?.part_number || currentPartIndex + 1} Questions`
                  : 'Answer the questions below'}
              </h2>
              {/* Part 2 Auto-Start Timer Display */}
              {currentPartNum === 2 && part2AutoStartActive && part2AutoStartTimer > 0 && (
                <div style={{
                  backgroundColor: 'rgba(236, 72, 153, 0.2)',
                  border: '1px solid rgba(236, 72, 153, 0.5)',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  marginBottom: '24px',
                  textAlign: 'center',
                }}>
                  <p style={{
                    color: '#ec4899',
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: '0 0 8px 0',
                  }}>
                    Recording will start automatically in:
                  </p>
                  <p style={{
                    color: '#ffffff',
                    fontSize: '32px',
                    fontWeight: '700',
                    fontFamily: 'monospace',
                    margin: 0,
                  }}>
                    {formatTime(part2AutoStartTimer)}
                  </p>
                </div>
              )}

              {/* Total Time Remaining Display - Sum of all question remaining times */}
              {(() => {
                const questions = (currentPart?.questions || speakingContent.questions || []).filter((q) => !q.cue_card)
                // For cue card parts, show 2 minutes (120 seconds) as total time
                if (currentPart?.cue_card && questions.length === 0) {
                  const cueCardRecording = cueCardRecordings.get(currentPart.part_number || currentPartIndex + 1);
                  const timeUsed = cueCardRecording?.duration || 0;
                  const totalRemaining = Math.max(0, 120 - timeUsed);
                  
                  return (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      backgroundColor: 'rgba(236, 72, 153, 0.2)',
                      border: '1px solid rgba(236, 72, 153, 0.5)',
                      borderRadius: '8px',
                    }}>
                      <Clock size={20} color="#ec4899" />
                      <div>
                        <div style={{
                          color: '#ec4899',
                          fontSize: '18px',
                          fontWeight: '700',
                          fontFamily: 'monospace',
                        }}>
                          {formatTime(totalRemaining)}
                        </div>
                        <div style={{
                          color: '#9ca3af',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                        }}>
                          Total Time Remaining
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Calculate total remaining: sum of (2 minutes - time used) for each question
                // This will re-render when questionRecordings changes
                const totalRemaining = questions.reduce((sum, q) => {
                  const recording = questionRecordings.get(q.question_number)
                  const timeUsed = recording?.duration || 0
                  const remaining = Math.max(0, 120 - timeUsed)
                  return sum + remaining
                }, 0)
                
                // Force re-render by using questionRecordings.size as a dependency
                const _forceUpdate = questionRecordings.size;
                
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    backgroundColor: 'rgba(236, 72, 153, 0.2)',
                    border: '1px solid rgba(236, 72, 153, 0.5)',
                    borderRadius: '8px',
                  }}>
                    <Clock size={20} color="#ec4899" />
                    <div>
                      <div style={{
                        color: '#ec4899',
                        fontSize: '18px',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                      }}>
                        {formatTime(totalRemaining)}
                      </div>
                      <div style={{
                        color: '#9ca3af',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                      }}>
                        Total Time Remaining
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            <div style={{
              display: 'grid',
              gap: '32px',
            }}>
              {(() => {
                const allQuestions = currentPart?.questions || speakingContent.questions || [];
                const regularQuestions = allQuestions.filter((q) => !q.cue_card);
                
                // If part has a cue card, display it
                if (currentPart?.cue_card && regularQuestions.length === 0) {
                  return (
                    <div style={{
                      padding: '32px',
                      backgroundColor: 'rgba(236, 72, 153, 0.1)',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                      borderRadius: '12px',
                    }}>
                      <h3 style={{
                        color: '#ffffff',
                        fontSize: '20px',
                        fontWeight: '700',
                        marginBottom: '20px',
                        borderBottom: '2px solid rgba(236, 72, 153, 0.5)',
                        paddingBottom: '12px',
                      }}>
                        Cue Card Topic
                      </h3>
                      <p style={{
                        color: '#ffffff',
                        fontSize: '18px',
                        lineHeight: '1.6',
                        marginBottom: '20px',
                        fontWeight: '500',
                      }}>
                        {currentPart.cue_card.topic}
                      </p>
                      {currentPart.cue_card.bullet_points && currentPart.cue_card.bullet_points.length > 0 && (
                        <div>
                          <p style={{
                            color: '#e5e7eb',
                            fontSize: '16px',
                            fontWeight: '600',
                            marginBottom: '12px',
                          }}>
                            You should say:
                          </p>
                          <ul style={{
                            margin: 0,
                            paddingLeft: '24px',
                            color: '#e5e7eb',
                            lineHeight: '1.8',
                          }}>
                            {currentPart.cue_card.bullet_points.map((point, idx) => (
                              <li key={idx} style={{
                                marginBottom: '12px',
                                fontSize: '16px',
                              }}>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }
                
                if (regularQuestions.length === 0 && !currentPart?.cue_card) {
                  return (
                    <div style={{
                      padding: '32px',
                      textAlign: 'center',
                      color: '#9ca3af',
                    }}>
                      <Mic style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                      <p style={{ fontSize: '16px', margin: 0 }}>
                        No questions available for this part.
                      </p>
                    </div>
                  );
                }
                
                return regularQuestions.map((question) => (
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
                        backgroundColor: 'rgba(236, 72, 153, 0.2)',
                        border: '2px solid rgba(236, 72, 153, 0.5)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#ec4899',
                      }}>
                        {question.question_number}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        {question.prompt && (
                          <p style={{
                            color: '#d1d5db',
                            fontSize: '15px',
                            fontWeight: '500',
                            marginBottom: '12px',
                            fontStyle: 'italic',
                          }}>
                            {question.prompt}
                          </p>
                        )}
                        <p style={{
                          color: '#ffffff',
                          fontSize: '16px',
                          lineHeight: '1.6',
                          marginBottom: '16px',
                        }}>
                          {question.question || question.text}
                        </p>
                        <IELTSQuestionRecorder
                          questionId={question.question_number}
                          maxTimeSeconds={120} // Each question gets 2 minutes independently
                          totalTimeUsed={0} // Not used - each question has its own timer
                          isRecording={currentlyRecordingQuestion === question.question_number}
                          shouldStop={currentlyRecordingQuestion !== null && currentlyRecordingQuestion !== question.question_number}
                          autoStart={
                            currentPartNum === 2 && 
                            part2AutoStartTimer === 0 && 
                            part2AutoStartActive && 
                            question.question_number === regularQuestions[0]?.question_number &&
                            !currentlyRecordingQuestion &&
                            !questionRecordings.has(question.question_number)
                          }
                          onRecordingStart={(qId) => {
                            // Stop any other currently recording question
                            if (currentlyRecordingQuestion && currentlyRecordingQuestion !== qId) {
                              setCurrentlyRecordingQuestion(null);
                            }
                            setCurrentlyRecordingQuestion(qId);
                            // Stop Part 2 auto-start timer when recording starts
                            if (currentPartNum === 2) {
                              setPart2AutoStartActive(false);
                            }
                          }}
                          onRecordingComplete={(audioBlob, duration, base64Audio) => {
                            // Store the recording for this question
                            setQuestionRecordings((prev) => {
                              const newMap = new Map(prev)
                              newMap.set(question.question_number, { 
                                blob: audioBlob, 
                                duration,
                                base64: base64Audio
                              })
                              
                              // Store base64 audio in localStorage
                              const storageKey = `ielts_speaking_audio_${contentId}_q${question.question_number}`;
                              try {
                                localStorage.setItem(storageKey, base64Audio);
                                console.log(`Question ${question.question_number} audio stored in localStorage`);
                              } catch (error) {
                                console.error('Error storing audio in localStorage:', error);
                              }
                              
                              return newMap
                            })
                            
                            // Clear currently recording flag
                            setCurrentlyRecordingQuestion(null)
                          }}
                          onTimeUpdate={(remainingTime) => {
                            // Optional: can use this to update a global timer display
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
