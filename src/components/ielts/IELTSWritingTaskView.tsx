import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Clock, X, Loader2 } from 'lucide-react';
import { API_URLS } from '@/config/apiConfig';

interface TaskContent {
  id: string;
  title: string;
  task_1?: {
    instruction: string;
    word_limit: number;
    time_limit_minutes: number;
    visual?: {
      type: string;
      url: string;
    };
  };
  task_2?: {
    instruction: string;
    word_limit: number;
    time_limit_minutes: number;
  };
}

export function IELTSWritingTaskView() {
  const { contentId } = useParams<{ contentId: string }>();
  const [searchParams] = useSearchParams();
  const taskNumber = searchParams.get('task') || '1';
  const navigate = useNavigate();
  const { token } = useAuth();
  const [taskContent, setTaskContent] = useState<TaskContent | null>(null);
  const [task1ImageUrl, setTask1ImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [timeExpired, setTimeExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMovedToNextTask, setHasMovedToNextTask] = useState(false);
  const [task1Text, setTask1Text] = useState('');
  const [task2Text, setTask2Text] = useState('');
  const [task1Score, setTask1Score] = useState<number | null>(null);
  const [task2Score, setTask2Score] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Fetch task data
  useEffect(() => {
    const fetchTaskData = async () => {
      if (!token || !contentId) {
        setError('Missing authentication or content ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First, get the content item to find json_url
        const listResponse = await fetch(
          'https://api.intelliviq.com/api/ielts/writing/content/list.php',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          console.error('List response error:', errorText);
          throw new Error(`Failed to fetch content list: ${listResponse.status}`);
        }

        const listData = await listResponse.json();
        console.log('List data:', listData);
        
        if (!listData.success || !Array.isArray(listData.items)) {
          throw new Error('Invalid response format from API');
        }

        const item = listData.items.find((item: any) => item.content_id === contentId || item.id.toString() === contentId);

        if (!item) {
          console.error('Item not found. ContentId:', contentId, 'Available items:', listData.items);
          throw new Error('Content not found');
        }

        if (!item.json_url) {
          throw new Error('Content URL not found');
        }

        // Store task1_image_url if it exists
        if (item.task1_image_url) {
          setTask1ImageUrl(item.task1_image_url);
        }

        // Fetch the actual task data from json_url (CDN - no auth needed)
        console.log('Fetching from CDN:', item.json_url);
        const taskResponse = await fetch(item.json_url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // CDN URLs are public - don't send Authorization header
          },
        });

        if (!taskResponse.ok) {
          const errorText = await taskResponse.text();
          console.error('CDN response error:', errorText);
          throw new Error(`Failed to fetch task data: ${taskResponse.status}`);
        }

        const content: TaskContent = await taskResponse.json();
        console.log('Task content loaded:', content);
        setTaskContent(content);
        
        // Extract task data based on task number
        const isTask1 = taskNumber === '1';
        const task = isTask1 ? content.task_1 : content.task_2;
        
        if (!task) {
          throw new Error(`Task ${taskNumber} not found in content`);
        }
        
        // Set image URL for task 1
        if (isTask1 && task.visual?.url) {
          setTask1ImageUrl(task.visual.url);
        }
      } catch (err: any) {
        console.error('Error fetching task data:', err);
        setError(err.message || 'Failed to load writing task. Please try again.');
        setTaskContent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [token, contentId, taskNumber]);

  // Initialize start time when component mounts
  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  // Save task text when moving to next task
  const saveCurrentTaskText = () => {
    const isTask1 = taskNumber === '1';
    if (isTask1 && text.trim()) {
      setTask1Text(text);
    } else if (!isTask1 && text.trim()) {
      setTask2Text(text);
    }
  };

  // Clear text when task number changes, but save previous task text
  useEffect(() => {
    const isTask1 = taskNumber === '1';
    if (isTask1) {
      // Moving to task 1 - clear everything
      setText('');
      setWordCount(0);
      setTask1Text('');
      setTask2Text('');
    } else {
      // Moving to task 2 - save task 1 text before clearing
      // This will be handled by the navigation click handler
      setText('');
      setWordCount(0);
    }
  }, [taskNumber]);

  // Update word count when text changes
  useEffect(() => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [text]);

  // Timer countdown
  useEffect(() => {
    if (!taskContent) return;
    
    const isTask1 = taskNumber === '1';
    const currentTask = isTask1 ? taskContent.task_1 : taskContent.task_2;
    if (!currentTask) return;

    const totalSeconds = currentTask.time_limit_minutes * 60;
    setTimeRemaining(totalSeconds);
    setTimeExpired(false);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [taskContent, taskNumber]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if back navigation should be disabled
  const canGoBack = () => {
    if (hasMovedToNextTask) return false;
    if (timeExpired) return false;
    if (taskNumber === '2') return false;
    return true;
  };

  // Save results to API
  const saveResults = async (task1Text: string, task2Text: string, ieltsScore: number, task1Score: number | null, task2Score: number | null, rawResult: any) => {
    if (!token || !contentId) return;

    try {
      const totalTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      const response = await fetch('https://api.intelliviq.com/api/ielts/writing/results/save-result.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content_id: contentId,
          task1_text: task1Text || '',
          task2_text: task2Text || '',
          total_time_seconds: totalTimeSeconds,
          ielts_score: ieltsScore,
          task1_score: task1Score || 0,
          task2_score: task2Score || 0,
          raw_result_json: rawResult,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save results:', errorText);
      } else {
        const data = await response.json();
        console.log('Results saved successfully:', data);
      }
    } catch (err: any) {
      console.error('Error saving results:', err);
    }
  };

  // Handle exit
  const handleExit = async () => {
    if (window.confirm('Are you sure you want to exit? Your progress will be saved with a score of 0.')) {
      const isTask1 = taskNumber === '1';
      const currentTask1Text = isTask1 ? text : task1Text;
      const currentTask2Text = isTask1 ? '' : text;
      
      // Save with score 0 and "not attempted"
      await saveResults(
        currentTask1Text,
        currentTask2Text,
        0,
        null,
        null,
        { overall: { mock_ielts: { prediction: 0 }, status: "not attempted" } }
      );
      
      navigate('/ielts/writing');
    }
  };

  // Handle submit
  // Handle moving to Task 2 - evaluate Task 1 first
  const handleNextToTask2 = async () => {
    if (!taskContent || !contentId || !text.trim()) {
      alert('Please write your response for Task 1 before proceeding.');
      return;
    }

    const task1 = taskContent.task_1;
    if (!task1) return;

    setIsSubmitting(true);

    try {
      // Evaluate Task 1 with ChatGPT
      const proxyUrl = API_URLS.chatgptProxy;

      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: task1.instruction,
          answer: text,
          level: "advanced", // IELTS is advanced level
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const score = data.ieltsScore || 0;

      // Store Task 1 evaluation and text
      setTask1Score(score);
      setTask1Text(text);
      localStorage.setItem(`ielts_task1_eval_${contentId}`, JSON.stringify(data));
      localStorage.setItem(`ielts_task1_text_${contentId}`, text);

      console.log('Task 1 evaluated and stored:', {
        score,
        hasFeedback: !!data.feedback,
        contentId
      });

      // Save task 1 text in state
      setTask1Text(text);
      setHasMovedToNextTask(true);
      
      // Navigate to Task 2
      navigate(`/ielts/writing/${contentId}?task=2`, { replace: true });
    } catch (err: any) {
      console.error("Error evaluating Task 1:", err);
      alert(err.message || "Failed to evaluate Task 1. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!taskContent || !text.trim()) {
      alert('Please write your response before submitting.');
      return;
    }

    const isTask1 = taskNumber === '1';
    const currentTask = isTask1 ? taskContent.task_1 : taskContent.task_2;
    if (!currentTask) return;

    setIsSubmitting(true);

    try {
      const proxyUrl = API_URLS.chatgptProxy;

      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentTask.instruction,
          answer: text,
          level: "advanced", // IELTS is advanced level
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const score = data.ieltsScore || 0;
      
      // Update task scores and texts
      let task1FinalText = task1Text;
      let task2FinalText = '';
      let task1FinalScore = task1Score;
      let task2FinalScore: number | null = null;
      let task1Evaluation: any = null;
      let task2Evaluation: any = null;

      if (isTask1) {
        setTask1Score(score);
        setTask1Text(text);
        task1FinalText = text;
        task1FinalScore = score;
        task1Evaluation = data;
      } else {
        setTask2Score(score);
        setTask2Text(text);
        task2FinalText = text;
        task2FinalScore = score;
        task2Evaluation = data;
        // Get task 1 evaluation if available (from localStorage)
        const storedTask1Eval = localStorage.getItem(`ielts_task1_eval_${contentId}`);
        console.log('Retrieving Task 1 evaluation from localStorage:', {
          key: `ielts_task1_eval_${contentId}`,
          found: !!storedTask1Eval,
          value: storedTask1Eval ? storedTask1Eval.substring(0, 100) : 'not found'
        });
        
        if (storedTask1Eval) {
          try {
            const parsed = JSON.parse(storedTask1Eval);
            if (parsed && typeof parsed === 'object' && parsed !== null) {
              task1Evaluation = parsed;
              task1FinalScore = task1Evaluation.ieltsScore || null;
              console.log('Successfully retrieved Task 1 evaluation:', {
                hasIeltsScore: !!task1Evaluation.ieltsScore,
                score: task1Evaluation.ieltsScore,
                hasFeedback: !!task1Evaluation.feedback
              });
              
              const storedTask1Text = localStorage.getItem(`ielts_task1_text_${contentId}`);
              if (storedTask1Text) {
                task1FinalText = storedTask1Text;
              }
            } else {
              console.warn('Parsed Task 1 evaluation is not a valid object:', parsed);
            }
          } catch (e) {
            console.error('Error parsing stored task 1 evaluation:', e, storedTask1Eval);
          }
        } else {
          console.warn('Task 1 evaluation not found in localStorage for contentId:', contentId);
        }
      }

      // Store current task evaluation in localStorage
      localStorage.setItem(`ielts_task${taskNumber}_eval_${contentId}`, JSON.stringify(data));
      localStorage.setItem(`ielts_task${taskNumber}_text_${contentId}`, text);

      // Calculate overall score (average of task 1 and task 2, or just current task if only one completed)
      const overallScore = isTask1 
        ? score 
        : task1FinalScore !== null 
          ? (task1FinalScore + score) / 2 
          : score;

      // Save results after evaluation with correct structure
      const rawResultJson = {
        overall: {
          mock_ielts: {
            prediction: overallScore
          }
        },
        task1: task1Evaluation || null,
        task2: task2Evaluation || null
      };

      await saveResults(
        task1FinalText,
        task2FinalText,
        overallScore,
        task1FinalScore,
        task2FinalScore,
        rawResultJson
      );
      
      // Final check: If Task 1 evaluation is still null but we have Task 1 score/text, try to get it one more time
      if (!task1Evaluation && task1FinalScore !== null && task1FinalText) {
        const finalCheck = localStorage.getItem(`ielts_task1_eval_${contentId}`);
        if (finalCheck) {
          try {
            task1Evaluation = JSON.parse(finalCheck);
            console.log('Retrieved Task 1 evaluation in final check:', !!task1Evaluation);
          } catch (e) {
            console.error('Error in final check for Task 1 evaluation:', e);
          }
        }
      }

      console.log('Navigating to results with:', {
        hasTask1Evaluation: !!task1Evaluation,
        hasTask2Evaluation: !!task2Evaluation,
        task1Score: task1FinalScore,
        task2Score: task2FinalScore,
        task1Text: task1FinalText ? `${task1FinalText.substring(0, 30)}...` : 'empty',
        task2Text: task2FinalText ? `${task2FinalText.substring(0, 30)}...` : 'empty',
      });

      // Navigate to results page with both evaluations
      navigate(`/ielts/writing/${contentId}/results?task=${taskNumber}`, {
        state: {
          task1Evaluation: task1Evaluation || null,
          task2Evaluation: task2Evaluation || null,
          task1Text: task1FinalText,
          task2Text: task2FinalText,
          task1Score: task1FinalScore,
          task2Score: task2FinalScore,
          overallScore: overallScore,
          taskNumber,
          taskInstruction: currentTask.instruction,
          userResponse: text,
          wordCount,
          timeSpent: currentTask.time_limit_minutes * 60 - timeRemaining,
          totalTimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        },
      });
    } catch (err: any) {
      console.error("Error submitting answer:", err);
      alert(err.message || "Failed to submit your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent browser back navigation when on task 2 or time expired
  useEffect(() => {
    const isTask2 = taskNumber === '2';
    const shouldBlockBack = isTask2 || timeExpired || hasMovedToNextTask;

    if (shouldBlockBack) {
      // Replace current history entry to prevent going back
      window.history.pushState(null, '', window.location.href);

      const handlePopState = (e: PopStateEvent) => {
        // Prevent default back navigation
        window.history.pushState(null, '', window.location.href);
        // Optionally show a message
        alert('You cannot go back to the previous task. Please continue with the current task.');
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [taskNumber, timeExpired, hasMovedToNextTask]);

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      const clampedWidth = Math.max(30, Math.min(70, newWidth));
      setLeftPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(75, 85, 99, 0.5)',
            borderTopColor: '#22c55e',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}></div>
          <p style={{ color: '#d1d5db', fontSize: '16px' }}>Loading task...</p>
        </div>
      </div>
    );
  }

  if (error || !taskContent) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', marginBottom: '16px', fontSize: '16px' }}>{error || 'Task not found'}</p>
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

  const isTask1 = taskNumber === '1';
  const task = isTask1 ? taskContent.task_1 : taskContent.task_2;

  if (!task) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', marginBottom: '16px', fontSize: '16px' }}>Task {taskNumber} not found</p>
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(236, 72, 153, 0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ padding: '16px 24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => navigate('/ielts/writing')}
                disabled={!canGoBack()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: canGoBack() ? '#9ca3af' : '#4b5563',
                  cursor: canGoBack() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  padding: '4px 8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
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
              <button
                onClick={handleExit}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(248, 113, 113, 0.5)',
                  color: '#f87171',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '600',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.5)';
                }}
              >
                <X style={{ width: '16px', height: '16px', marginRight: '6px' }} />
                Exit Test
              </button>
            </div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Part {taskNumber}
            </h1>
            {/* Timer and Submit button in top right */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(236, 72, 153, 0.3)',
              }}>
                <Clock style={{ width: '18px', height: '18px', color: timeRemaining < 300 ? '#f87171' : '#22c55e' }} />
                <span style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: timeRemaining < 300 ? '#f87171' : '#22c55e',
                  fontFamily: 'monospace',
                }}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !text.trim() || timeExpired}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: isSubmitting || !text.trim() || timeExpired 
                    ? 'rgba(75, 85, 99, 0.5)' 
                    : 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #059669 100%)',
                  color: '#ffffff',
                  border: isSubmitting || !text.trim() || timeExpired 
                    ? '1px solid rgba(75, 85, 99, 0.5)' 
                    : '2px solid rgba(34, 197, 94, 0.5)',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: isSubmitting || !text.trim() || timeExpired ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '700',
                  opacity: isSubmitting || !text.trim() || timeExpired ? 0.5 : 1,
                  boxShadow: isSubmitting || !text.trim() || timeExpired 
                    ? 'none' 
                    : '0 4px 15px rgba(34, 197, 94, 0.4), 0 0 20px rgba(34, 197, 94, 0.2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && text.trim() && !timeExpired) {
                    e.currentTarget.style.transform = 'scale(1.08)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.6), 0 0 30px rgba(34, 197, 94, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting && text.trim() && !timeExpired) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(34, 197, 94, 0.4), 0 0 20px rgba(34, 197, 94, 0.2)';
                  }
                }}
              >
                <Check style={{ width: '20px', height: '20px', fontWeight: 'bold' }} />
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.6)',
            borderRadius: '4px',
            padding: '10px 16px',
            fontSize: '14px',
            color: '#d1d5db',
            border: '1px solid rgba(75, 85, 99, 0.5)',
          }}>
            You should spend about {task.time_limit_minutes} minutes on this task. Write at least {task.word_limit} words.
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Left Panel */}
        <div
          style={{
            borderRight: '1px solid rgba(75, 85, 99, 0.5)',
            overflowY: 'auto',
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            width: `${leftPanelWidth}%`,
          }}
        >
          <div style={{ padding: '24px' }}>
            {/* Task Description */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{
                color: '#ffffff',
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '16px',
              }}>
                {task.instruction}
              </p>
              {isTask1 && (
                <p style={{
                  color: '#d1d5db',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}>
                  Summarise the information by selecting and reporting the main features, and make comparisons where relevant.
                </p>
              )}
            </div>

            {/* Task 1 Image */}
            {isTask1 && task1ImageUrl && (
              <div style={{ marginTop: '24px' }}>
                <img
                  src={task1ImageUrl}
                  alt="Task 1 Chart"
                  style={{
                    width: '100%',
                    height: 'auto',
                    border: '1px solid rgba(75, 85, 99, 0.5)',
                    borderRadius: '4px',
                    maxHeight: '500px',
                    objectFit: 'contain',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          ref={resizeRef}
          style={{
            width: '4px',
            backgroundColor: 'rgba(75, 85, 99, 0.5)',
            cursor: 'col-resize',
            position: 'relative',
          }}
          onMouseDown={handleResizeStart}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.5)';
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.5)';
            }
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
          >
            <div style={{
              width: '20px',
              height: '24px',
              backgroundColor: 'rgba(236, 72, 153, 0.3)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
            }}>
              <div style={{ width: '2px', height: '16px', backgroundColor: '#ec4899' }}></div>
              <div style={{ width: '2px', height: '16px', backgroundColor: '#ec4899' }}></div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            width: `${100 - leftPanelWidth}%`,
          }}
        >
          <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Text Area */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={timeExpired ? "Time has expired. Please submit your response." : "Start writing your response here..."}
              disabled={timeExpired}
              style={{
                flex: 1,
                width: '100%',
                border: '1px solid rgba(75, 85, 99, 0.5)',
                borderRadius: '4px',
                padding: '16px',
                color: '#ffffff',
                backgroundColor: timeExpired ? 'rgba(31, 41, 55, 0.4)' : 'rgba(31, 41, 55, 0.6)',
                resize: 'none',
                outline: 'none',
                fontSize: '14px',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                minHeight: '400px',
                opacity: timeExpired ? 0.7 : 1,
                cursor: timeExpired ? 'not-allowed' : 'text',
              }}
              onFocus={(e) => {
                if (!timeExpired) {
                  e.currentTarget.style.borderColor = '#22c55e';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.2)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />

            {/* Word Counter and Navigation */}
            <div style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{
                fontSize: '14px',
                color: '#d1d5db',
              }}>
                Words: {wordCount}
              </div>
              <div style={{
                display: 'flex',
                gap: '8px',
              }}>
                <button
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '1px solid rgba(75, 85, 99, 0.5)',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(17, 24, 39, 0.8)',
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.5,
                  }}
                  disabled
                  title="Cannot go back to previous task"
                >
                  <ChevronLeft style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                </button>
                <button
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '1px solid rgba(34, 197, 94, 0.5)',
                    borderRadius: '4px',
                    background: isTask1 && taskContent?.task_2 && !timeExpired && !isSubmitting && text.trim() ? 'linear-gradient(to right, #22c55e, #10b981)' : 'rgba(17, 24, 39, 0.8)',
                    cursor: isTask1 && taskContent?.task_2 && !timeExpired && !isSubmitting && text.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isTask1 && taskContent?.task_2 && !timeExpired && !isSubmitting && text.trim() ? 1 : 0.5,
                  }}
                  disabled={!isTask1 || !taskContent?.task_2 || timeExpired || isSubmitting || !text.trim()}
                  onClick={() => {
                    if (isTask1 && taskContent?.task_2 && contentId && !timeExpired && !isSubmitting && text.trim()) {
                      handleNextToTask2();
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (isTask1 && taskContent?.task_2 && !timeExpired) {
                      e.currentTarget.style.background = 'linear-gradient(to right, #10b981, #059669)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isTask1 && taskContent?.task_2 && !timeExpired) {
                      e.currentTarget.style.background = 'linear-gradient(to right, #22c55e, #10b981)';
                    }
                  }}
                >
                  {isSubmitting && isTask1 ? (
                    <Loader2 style={{ width: '20px', height: '20px', color: '#ffffff', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <ChevronRight style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(75, 85, 99, 0.5)',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Part {taskNumber}
          </span>
        </div>
      </footer>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <Loader2 style={{
            width: '64px',
            height: '64px',
            color: '#22c55e',
            animation: 'spin 1s linear infinite',
            marginBottom: '24px',
          }} />
          <p style={{
            color: '#ffffff',
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '8px',
          }}>
            {taskNumber === '1' && !hasMovedToNextTask ? 'Evaluating Task 1...' : 'Submitting your response...'}
          </p>
          <p style={{
            color: '#9ca3af',
            fontSize: '16px',
          }}>
            {taskNumber === '1' && !hasMovedToNextTask ? 'Please wait while we evaluate Task 1 before moving to Task 2' : 'Please wait while we evaluate your writing'}
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
