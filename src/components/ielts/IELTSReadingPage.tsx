import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, BookOpen, Loader2, AlertCircle, CheckCircle2, Sparkles, LogOut, Trophy } from 'lucide-react';
import { useLocalizedNavigate } from '../LocaleLayout';

interface ReadingItem {
  id: number;
  content_id: string;
  title: string;
  json_url: string;
  is_published: number;
  created_at: string;
}

interface ReadingResponse {
  success: boolean;
  items: ReadingItem[];
  paging: {
    limit: number;
    offset: number;
  };
}

interface Question {
  question_id: number;
  type: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: string;
}

interface ReadingContent {
  id?: string;
  title?: string;
  section?: string;
  created_at?: string;
  passage?: string;
  questions?: Question[];
  [key: string]: any;
}

interface ScoreResult {
  mark: number;
  total: number;
  percentage: number;
  ieltsScore: number;
  answerResults: { [questionId: number]: boolean };
}

export function IELTSReadingPage() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { token, logout } = useAuth();
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ReadingItem | null>(null);
  const [contentData, setContentData] = useState<ReadingContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: number]: string }>({});
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<{ [questionId: number]: string }>({});

  // Fetch reading items from API
  useEffect(() => {
    const fetchReadingItems = async () => {
      if (!token) {
        setError(t('modules.ielts.authRequired'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          'https://api.intelliviq.com/api/ielts/reading/content/list.php',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
        }

        const data: ReadingResponse = await response.json();
        
        if (data.success && Array.isArray(data.items)) {
          setItems(data.items);
        } else {
          setItems([]);
        }
      } catch (err: any) {
        console.error('Error fetching reading content:', err);
        setError(err.message || t('modules.ielts.loadFailed'));
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReadingItems();
  }, [token, t]);

  // Fetch content from JSON URL when item is selected
  useEffect(() => {
    const fetchContent = async () => {
      if (!selectedItem?.json_url) return;

      try {
        setLoadingContent(true);
        const response = await fetch(selectedItem.json_url);

        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status}`);
        }

        const data: ReadingContent = await response.json();
        setContentData(data);
        setUserAnswers({});
        setScoreResult(null);
        
        // Store correct answers separately (not in HTML)
        const answers: { [questionId: number]: string } = {};
        if (Array.isArray(data.questions)) {
          data.questions.forEach((q: Question) => {
            answers[q.question_id] = q.correct_answer;
          });
        }
        setCorrectAnswers(answers);
      } catch (err: any) {
        console.error('Error fetching reading content:', err);
        setContentData(null);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchContent();
  }, [selectedItem]);

  const handleItemClick = (item: ReadingItem) => {
    setSelectedItem(item);
    setContentData(null);
    setUserAnswers({});
    setScoreResult(null);
  };

  const handleBack = () => {
    setSelectedItem(null);
    setContentData(null);
    setUserAnswers({});
    setScoreResult(null);
  };

  const handleOptionSelect = (questionId: number, option: string) => {
    if (scoreResult) return; // Don't allow changes after submission
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const calculateScore = (): ScoreResult => {
    const questions = Array.isArray(contentData?.questions) ? contentData.questions : [];
    const answerResults: { [questionId: number]: boolean } = {};
    let correctCount = 0;

    questions.forEach((question: Question) => {
      const userAnswer = userAnswers[question.question_id];
      const correctAnswer = correctAnswers[question.question_id];
      const isCorrect = userAnswer === correctAnswer;
      
      answerResults[question.question_id] = isCorrect;
      if (isCorrect) correctCount++;
    });

    const total = questions.length;
    const mark = correctCount;
    const percentage = total > 0 ? Math.round((mark / total) * 100) : 0;
    
    // Calculate IELTS band score (0-9 scale)
    // Simple mapping: 100% = 9.0, 90% = 8.0, 80% = 7.0, etc.
    let ieltsScore = 0;
    if (percentage >= 95) ieltsScore = 9.0;
    else if (percentage >= 85) ieltsScore = 8.5;
    else if (percentage >= 75) ieltsScore = 8.0;
    else if (percentage >= 65) ieltsScore = 7.5;
    else if (percentage >= 55) ieltsScore = 7.0;
    else if (percentage >= 45) ieltsScore = 6.5;
    else if (percentage >= 35) ieltsScore = 6.0;
    else if (percentage >= 25) ieltsScore = 5.5;
    else if (percentage >= 15) ieltsScore = 5.0;
    else if (percentage >= 5) ieltsScore = 4.5;
    else ieltsScore = 4.0;

    return {
      mark,
      total,
      percentage,
      ieltsScore,
      answerResults,
    };
  };

  const handleSubmit = async () => {
    const questions = Array.isArray(contentData?.questions) ? contentData.questions : [];
    if (Object.keys(userAnswers).length !== questions.length) {
      return;
    }
    const result = calculateScore();
    setScoreResult(result);

    // Save result to database
    if (token && selectedItem && result.ieltsScore > 0) {
      try {
        const requestBody = {
          id: selectedItem.id,
          content_id: selectedItem.content_id,
          title: contentData?.title || selectedItem.title,
          ielts_score: result.ieltsScore,
        };

        console.log('Saving result with data:', requestBody);

        const response = await fetch(
          'https://api.intelliviq.com/api/ielts/reading/save-result.php',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to save result:', response.status, response.statusText, errorText);
        } else {
          const responseData = await response.json();
          console.log('Result saved successfully:', responseData);
        }
      } catch (err: any) {
        console.error('Error saving result to database:', err);
      }
    } else {
      console.warn('Cannot save result - missing data:', {
        hasToken: !!token,
        hasSelectedItem: !!selectedItem,
        ieltsScore: result.ieltsScore,
        selectedItemContentId: selectedItem?.content_id,
      });
    }
  };

  // Inline styles
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '"Georgia", "Times New Roman", serif',
  };

  const backgroundBlurStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    opacity: 0.1,
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(236, 72, 153, 0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: 'none',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    backdropFilter: 'blur(8px)',
    borderRadius: '16px',
    overflow: 'hidden',
  };

  const gradientHeaderBlue: React.CSSProperties = {
    background: 'linear-gradient(to right, #2563eb, #3b82f6, #06b6d4)',
    padding: '24px',
  };

  const gradientHeaderPurple: React.CSSProperties = {
    background: 'linear-gradient(to right, #9333ea, #ec4899, #f43f5e)',
    padding: '24px',
  };

  // Render detail view when item is selected
  if (selectedItem) {
    const passage = contentData?.passage || '';
    const questions = Array.isArray(contentData?.questions) ? contentData.questions : [];

    return (
      <div style={containerStyle}>
        {/* Animated background elements */}
        <div style={backgroundBlurStyle}>
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '80px',
            width: '288px',
            height: '288px',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            mixBlendMode: 'multiply',
            filter: 'blur(60px)',
            animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}></div>
          <div style={{
            position: 'absolute',
            top: '160px',
            right: '80px',
            width: '288px',
            height: '288px',
            backgroundColor: '#9333ea',
            borderRadius: '50%',
            mixBlendMode: 'multiply',
            filter: 'blur(60px)',
            animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '2s',
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '80px',
            left: '160px',
            width: '288px',
            height: '288px',
            backgroundColor: '#06b6d4',
            borderRadius: '50%',
            mixBlendMode: 'multiply',
            filter: 'blur(60px)',
            animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '4s',
          }}></div>
        </div>

        <header style={headerStyle}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
              <Button
                variant="ghost"
                onClick={handleBack}
                style={{
                  color: '#d1d5db',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#d1d5db';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline-block' }} />
                {t('modules.back')}
              </Button>
              
              <h1 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {contentData?.title || selectedItem.title}
              </h1>

              <Button
                variant="ghost"
                onClick={logout}
                style={{
                  color: '#d1d5db',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#d1d5db';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline-block' }} />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px' }}>
            {loadingContent ? (
              <Card style={cardStyle}>
                <CardContent style={{ padding: '64px', textAlign: 'center' }}>
                  <Loader2 style={{
                    width: '64px',
                    height: '64px',
                    color: '#3b82f6',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 24px',
                  }} />
                  <p style={{ color: '#6b7280', fontSize: '18px' }}>
                    {t('modules.ielts.loadingReading')}
                  </p>
                </CardContent>
              </Card>
            ) : contentData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Reading Passage */}
                {passage && (
                  <Card style={cardStyle}>
                    <div style={gradientHeaderBlue}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '16px',
                          backdropFilter: 'blur(8px)',
                        }}>
                          <BookOpen style={{ width: '24px', height: '24px', color: '#ffffff' }} />
                        </div>
                        <div>
                          <CardTitle style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                            marginBottom: '4px',
                          }}>
                            Reading Passage
                          </CardTitle>
                          <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                            Read the passage carefully before answering the questions
                          </p>
                        </div>
                      </div>
                    </div>
                     <CardContent style={{ padding: '48px 48px 0 48px', paddingBottom: '0', marginBottom: '0', overflow: 'hidden' }}>
                       <div style={{ 
                         height: '650px', 
                         overflowY: 'auto',
                         overflowX: 'hidden',
                         paddingRight: '32px',
                         paddingBottom: '0',
                         marginBottom: '0',
                         boxSizing: 'border-box',
                       }}>
                         <div style={{
                           color: '#1a1a1a',
                           lineHeight: '1.9',
                           fontSize: '22px',
                           fontFamily: '"Merriweather", "Crimson Text", "Georgia", "Palatino Linotype", "Book Antiqua", serif',
                           display: 'block',
                           letterSpacing: '0.015em',
                           textAlign: 'justify',
                           maxWidth: '100%',
                           fontWeight: 400,
                           padding: '0',
                           paddingBottom: '0',
                           marginBottom: '0',
                           boxSizing: 'border-box',
                           position: 'relative',
                         }}>
                           {passage.split('\n\n').map((paragraph, idx, arr) => {
                             const isLast = idx === arr.length - 1;
                             return (
                               <p key={idx} style={{
                                 margin: idx === 0 ? (isLast ? '0' : '0 0 28px 0') : (isLast ? '28px 0 0 0' : '28px 0'),
                                 padding: '0',
                                 paddingBottom: isLast ? '0' : '20px',
                                 borderBottom: !isLast ? '1px solid #e5e7eb' : 'none',
                                 textIndent: '0',
                                 wordSpacing: '0.08em',
                                 display: 'block',
                                 lineHeight: '1.9',
                                 fontSize: '22px',
                                 marginBottom: isLast ? '-0.5em' : (idx === 0 ? '28px' : '28px'),
                                 marginTop: idx === 0 ? '0' : '28px',
                               }}>
                                 {paragraph.trim()}
                               </p>
                             );
                           })}
                         </div>
                       </div>
                     </CardContent>
                  </Card>
                )}

                {/* Multiple Choice Questions */}
                {questions.length > 0 && (
                  <Card style={cardStyle}>
                    <div style={gradientHeaderPurple}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <CardTitle style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                            marginBottom: '4px',
                          }}>
                            Comprehension Questions
                          </CardTitle>
                          <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                            Select the best answer for each question below
                          </p>
                        </div>
                        <div style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          backdropFilter: 'blur(8px)',
                        }}>
                          <span style={{ color: '#ffffff', fontWeight: '600' }}>
                            {Object.keys(userAnswers).length} / {questions.length} Answered
                          </span>
                        </div>
                      </div>
                    </div>
                    <CardContent style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {questions.map((question) => {
                        const selectedAnswer = userAnswers[question.question_id];
                        const options = question.options || {};
                        const optionKeys = ['A', 'B', 'C', 'D'] as const;
                        const isCorrect = scoreResult ? scoreResult.answerResults[question.question_id] : null;
                        const showResult = scoreResult !== null;

                        return (
                          <Card
                            key={question.question_id}
                            style={{
                              background: showResult && isCorrect
                                ? 'linear-gradient(to bottom right, #f0fdf4, #dcfce7)'
                                : showResult && !isCorrect
                                  ? 'linear-gradient(to bottom right, #fef2f2, #fee2e2)'
                                  : 'linear-gradient(to bottom right, #f9fafb, #ffffff)',
                              border: showResult && isCorrect
                                ? '2px solid #22c55e'
                                : showResult && !isCorrect
                                  ? '2px solid #ef4444'
                                  : '1px solid #e5e7eb',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              borderRadius: '12px',
                              transition: 'all 0.3s',
                            }}
                          >
                            <CardContent style={{ padding: '24px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '24px' }}>
                                <div style={{
                                  flexShrink: 0,
                                  width: '40px',
                                  height: '40px',
                                  background: showResult && isCorrect
                                    ? 'linear-gradient(to bottom right, #22c55e, #16a34a)'
                                    : showResult && !isCorrect
                                      ? 'linear-gradient(to bottom right, #ef4444, #dc2626)'
                                      : 'linear-gradient(to bottom right, #3b82f6, #06b6d4)',
                                  borderRadius: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: '16px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                }}>
                                  <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>
                                    {question.question_id}
                                  </span>
                                </div>
                                <p style={{
                                  color: '#1f2937',
                                  fontWeight: '600',
                                  fontSize: '20px',
                                  flex: 1,
                                  lineHeight: '1.75',
                                  paddingTop: '4px',
                                }}>
                                  {question.question}
                                </p>
                              </div>
                              
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '16px',
                                marginLeft: '56px',
                              }}>
                                {optionKeys.map((key) => {
                                  const optionText = options[key];
                                  if (!optionText) return null;
                                  
                                  const isSelected = selectedAnswer === key;
                                  const isCorrectOption = showResult && correctAnswers[question.question_id] === key;
                                  // Only show correct answer if user selected it (don't reveal if they got it wrong)
                                  const shouldShowCorrect = showResult && isCorrect && isCorrectOption;

                                  return (
                                    <button
                                      key={key}
                                      onClick={() => handleOptionSelect(question.question_id, key)}
                                      disabled={showResult}
                                      style={{
                                        position: 'relative',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: shouldShowCorrect
                                          ? '2px solid #22c55e'
                                          : showResult && isSelected && !isCorrect
                                            ? '2px solid #ef4444'
                                            : isSelected
                                              ? '2px solid #3b82f6'
                                              : '2px solid #d1d5db',
                                        textAlign: 'left',
                                        transition: 'all 0.3s',
                                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                        background: shouldShowCorrect
                                          ? 'linear-gradient(to bottom right, #dcfce7, #bbf7d0)'
                                          : showResult && isSelected && !isCorrect
                                            ? 'linear-gradient(to bottom right, #fee2e2, #fecaca)'
                                            : isSelected
                                              ? 'linear-gradient(to bottom right, #dbeafe, #cffafe)'
                                              : '#ffffff',
                                        boxShadow: isSelected
                                          ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(59, 130, 246, 0.2)'
                                          : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                        cursor: showResult ? 'default' : 'pointer',
                                        opacity: showResult ? 0.9 : 1,
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!showResult && !isSelected) {
                                          e.currentTarget.style.borderColor = '#60a5fa';
                                          e.currentTarget.style.backgroundColor = '#f0f9ff';
                                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                          e.currentTarget.style.transform = 'scale(1.01)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!showResult && !isSelected) {
                                          e.currentTarget.style.borderColor = '#d1d5db';
                                          e.currentTarget.style.backgroundColor = '#ffffff';
                                          e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                          e.currentTarget.style.transform = 'scale(1)';
                                        }
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{
                                          width: '48px',
                                          height: '48px',
                                          borderRadius: '12px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          marginRight: '16px',
                                          fontWeight: 'bold',
                                          fontSize: '16px',
                                          flexShrink: 0,
                                          transition: 'all 0.3s',
                                          background: shouldShowCorrect
                                            ? 'linear-gradient(to bottom right, #22c55e, #16a34a)'
                                            : showResult && isSelected && !isCorrect
                                              ? 'linear-gradient(to bottom right, #ef4444, #dc2626)'
                                              : isSelected
                                                ? 'linear-gradient(to bottom right, #3b82f6, #06b6d4)'
                                                : '#e5e7eb',
                                          color: (shouldShowCorrect) || (isSelected && !showResult)
                                            ? '#ffffff'
                                            : '#6b7280',
                                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                                        }}>
                                          {key}
                                        </div>
                                        <span style={{
                                          flex: 1,
                                          fontSize: '18px',
                                          lineHeight: '1.75',
                                          color: shouldShowCorrect
                                            ? '#166534'
                                            : showResult && isSelected && !isCorrect
                                              ? '#991b1b'
                                              : isSelected
                                                ? '#1e40af'
                                                : '#374151',
                                          fontWeight: isSelected ? '500' : '400',
                                        }}>
                                          {optionText}
                                        </span>
                                        {isSelected && !showResult && (
                                          <CheckCircle2 style={{
                                            width: '24px',
                                            height: '24px',
                                            color: '#3b82f6',
                                            marginLeft: '12px',
                                            flexShrink: 0,
                                          }} />
                                        )}
                                        {shouldShowCorrect && (
                                          <CheckCircle2 style={{
                                            width: '24px',
                                            height: '24px',
                                            color: '#22c55e',
                                            marginLeft: '12px',
                                            flexShrink: 0,
                                          }} />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      {!scoreResult && (
                        <div style={{
                          paddingTop: '24px',
                          borderTop: '2px solid #e5e7eb',
                          marginTop: '32px',
                        }}>
                          <Button 
                            onClick={handleSubmit}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(to right, #3b82f6, #2563eb, #06b6d4)',
                              color: '#ffffff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontSize: '18px',
                              padding: '28px',
                              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: '600',
                              cursor: Object.keys(userAnswers).length === questions.length ? 'pointer' : 'not-allowed',
                              opacity: Object.keys(userAnswers).length === questions.length ? 1 : 0.6,
                              transition: 'all 0.3s',
                            }}
                            disabled={Object.keys(userAnswers).length !== questions.length}
                            onMouseEnter={(e) => {
                              if (Object.keys(userAnswers).length === questions.length) {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
                            }}
                          >
                            {Object.keys(userAnswers).length === questions.length ? (
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle2 style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                                Submit Answers
                              </span>
                            ) : (
                              `Answer ${questions.length - Object.keys(userAnswers).length} more question${questions.length - Object.keys(userAnswers).length > 1 ? 's' : ''}`
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Score Display */}
                      {scoreResult && (
                        <Card style={{
                          background: 'linear-gradient(to bottom right, #f0fdf4, #dcfce7)',
                          border: '2px solid #22c55e',
                          boxShadow: '0 20px 25px -5px rgba(34, 197, 94, 0.2)',
                          borderRadius: '16px',
                          marginTop: '32px',
                        }}>
                          <CardContent style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                              <div style={{
                                width: '64px',
                                height: '64px',
                                background: 'linear-gradient(to bottom right, #22c55e, #16a34a)',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '16px',
                                boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3)',
                              }}>
                                <Trophy style={{ width: '32px', height: '32px', color: '#ffffff' }} />
                              </div>
                              <div>
                                <h3 style={{
                                  fontSize: '28px',
                                  fontWeight: 'bold',
                                  color: '#166534',
                                  marginBottom: '4px',
                                }}>
                                  Your Results
                                </h3>
                                <p style={{ color: '#15803d', fontSize: '16px' }}>
                                  Great job completing the reading comprehension!
                                </p>
                              </div>
                            </div>
                            
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: '24px',
                              marginTop: '24px',
                            }}>
                              <div style={{
                                backgroundColor: '#ffffff',
                                padding: '24px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              }}>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                                  Correct Answers
                                </p>
                                <p style={{ color: '#166534', fontSize: '36px', fontWeight: 'bold', marginBottom: '4px' }}>
                                  {scoreResult.mark}
                                </p>
                                <p style={{ color: '#9ca3af', fontSize: '16px', fontWeight: '400' }}>
                                  out of {scoreResult.total} questions
                                </p>
                              </div>
                              
                              <div style={{
                                backgroundColor: '#ffffff',
                                padding: '24px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              }}>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                                  Score
                                </p>
                                <p style={{ color: '#166534', fontSize: '36px', fontWeight: 'bold', marginBottom: '4px' }}>
                                  {scoreResult.mark}/{scoreResult.total}
                                </p>
                                <p style={{ color: '#9ca3af', fontSize: '16px', fontWeight: '400' }}>
                                  {scoreResult.percentage}% correct
                                </p>
                              </div>
                            </div>
                            
                            <div style={{
                              backgroundColor: '#ffffff',
                              padding: '24px',
                              borderRadius: '12px',
                              textAlign: 'center',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              marginTop: '24px',
                            }}>
                              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                                {t('modules.ielts.ieltsBandScore')}
                              </p>
                              <p style={{ color: '#166534', fontSize: '48px', fontWeight: 'bold' }}>
                                {scoreResult.ieltsScore.toFixed(1)}
                              </p>
                              <p style={{ color: '#15803d', fontSize: '14px', fontWeight: '400', marginTop: '8px' }}>
                                {scoreResult.ieltsScore >= 7.0 ? t('modules.ielts.excellent') : scoreResult.ieltsScore >= 6.0 ? t('modules.ielts.goodWork') : t('modules.ielts.keepPracticing')}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!passage && questions.length === 0 && (
                  <Card style={{
                    ...cardStyle,
                    backgroundColor: 'rgba(254, 243, 199, 0.95)',
                  }}>
                    <CardContent style={{ padding: '48px', textAlign: 'center' }}>
                      <AlertCircle style={{
                        width: '64px',
                        height: '64px',
                        color: '#eab308',
                        margin: '0 auto 16px',
                      }} />
                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#854d0e',
                        marginBottom: '8px',
                      }}>
                        {t('modules.ielts.noContentAvailable')}
                      </h3>
                      <p style={{ color: '#a16207' }}>
                        {t('modules.ielts.noContentYet')}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card style={{
                ...cardStyle,
                backgroundColor: 'rgba(254, 242, 242, 0.95)',
              }}>
                <CardContent style={{ padding: '48px', textAlign: 'center' }}>
                  <AlertCircle style={{
                    width: '64px',
                    height: '64px',
                    color: '#ef4444',
                    margin: '0 auto 16px',
                  }} />
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#991b1b',
                    marginBottom: '8px',
                  }}>
                    {t('modules.ielts.failedToLoad')}
                  </h3>
                  <p style={{ color: '#b91c1c', marginBottom: '24px' }}>
                    {t('modules.ielts.unableToLoad')}
                  </p>
                  <Button
                    onClick={handleBack}
                    style={{
                      background: 'linear-gradient(to right, #3b82f6, #06b6d4)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('modules.ielts.goBack')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render tiles view
  return (
    <div style={containerStyle}>
      {/* Animated background elements */}
      <div style={backgroundBlurStyle}>
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '80px',
          width: '384px',
          height: '384px',
          backgroundColor: '#3b82f6',
          borderRadius: '50%',
          mixBlendMode: 'multiply',
          filter: 'blur(60px)',
          animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}></div>
        <div style={{
          position: 'absolute',
          top: '160px',
          right: '80px',
          width: '384px',
          height: '384px',
          backgroundColor: '#9333ea',
          borderRadius: '50%',
          mixBlendMode: 'multiply',
          filter: 'blur(60px)',
          animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          animationDelay: '2s',
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '160px',
          width: '384px',
          height: '384px',
          backgroundColor: '#06b6d4',
          borderRadius: '50%',
          mixBlendMode: 'multiply',
          filter: 'blur(60px)',
          animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          animationDelay: '4s',
        }}></div>
      </div>

      <header style={headerStyle}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
            <Button
              variant="ghost"
              onClick={() => navigate('/ielts')}
              style={{
                color: '#d1d5db',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#d1d5db';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline-block' }} />
              {t('modules.ielts.backToIelts')}
            </Button>
            
            <h1 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              IELTS Reading
            </h1>

            <Button
              variant="ghost"
              onClick={logout}
              style={{
                color: '#d1d5db',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#d1d5db';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline-block' }} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 32px' }}>
          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '128px 0',
            }}>
              <Loader2 style={{
                width: '64px',
                height: '64px',
                color: '#60a5fa',
                animation: 'spin 1s linear infinite',
                marginBottom: '24px',
              }} />
              <p style={{ color: '#d1d5db', fontSize: '18px' }}>
                {t('modules.ielts.loadingReading')}
              </p>
            </div>
          ) : error ? (
            <Card style={cardStyle}>
              <CardContent style={{ padding: '48px', textAlign: 'center' }}>
                <AlertCircle style={{
                  width: '64px',
                  height: '64px',
                  color: '#f87171',
                  margin: '0 auto 24px',
                }} />
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '12px',
                }}>
                  {t('modules.ielts.errorLoadingContent')}
                </h3>
                <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '18px' }}>
                  {error}
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  style={{
                    background: 'linear-gradient(to right, #3b82f6, #06b6d4)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    fontSize: '18px',
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card style={cardStyle}>
              <CardContent style={{ padding: '48px', textAlign: 'center' }}>
                <BookOpen style={{
                  width: '64px',
                  height: '64px',
                  color: '#60a5fa',
                  margin: '0 auto 24px',
                }} />
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '12px',
                }}>
                  {t('modules.ielts.noContentAvailable')}
                </h3>
                <p style={{ color: '#6b7280', fontSize: '18px' }}>
                  There are no reading materials available at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              <div style={{ marginBottom: '48px', textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Sparkles style={{ width: '32px', height: '32px', color: '#60a5fa', marginRight: '12px' }} />
                  <h2 style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.02em',
                  }}>
                    Reading Materials
                  </h2>
                  <Sparkles style={{ width: '32px', height: '32px', color: '#60a5fa', marginLeft: '12px' }} />
                </div>
                <p style={{ color: '#d1d5db', fontSize: '20px' }}>
                  Select a reading passage to practice your comprehension skills
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '32px',
              }}>
                {items.map((item, index) => (
                  <Card
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      ...cardStyle,
                      cursor: 'pointer',
                      transition: 'all 0.5s',
                      animationDelay: `${index * 100}ms`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05) translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1) translateY(0)';
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                    }}
                  >
                    {/* Gradient overlay on hover */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0), rgba(6, 182, 212, 0))',
                      transition: 'all 0.5s',
                      pointerEvents: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.05), rgba(6, 182, 212, 0.05))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to bottom right, rgba(59, 130, 246, 0), rgba(6, 182, 212, 0))';
                    }}
                    ></div>
                    
                    <CardHeader style={{ paddingBottom: '16px', paddingTop: '24px', position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          background: 'linear-gradient(to bottom right, #3b82f6, #06b6d4)',
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '16px',
                          boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.3)',
                          transition: 'all 0.5s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1) rotate(3deg)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                        }}
                        >
                          <BookOpen style={{ width: '32px', height: '32px', color: '#ffffff' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <CardTitle style={{
                            fontSize: '20px',
                            color: '#1f2937',
                            fontWeight: 'bold',
                            transition: 'color 0.3s',
                            lineHeight: '1.25',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#2563eb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#1f2937';
                          }}
                          >
                            {item.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent style={{ position: 'relative' }}>
                      <p style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        marginBottom: '24px',
                        lineHeight: '1.75',
                      }}>
                        Click to start reading and answer comprehension questions
                      </p>
                      <Button style={{
                        width: '100%',
                        background: 'linear-gradient(to right, #3b82f6, #2563eb, #06b6d4)',
                        color: '#ffffff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        border: 'none',
                        padding: '24px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(to right, #2563eb, #1d4ed8, #0891b2)';
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(to right, #3b82f6, #2563eb, #06b6d4)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0,0, 0.1)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      >
                        Start Reading
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
