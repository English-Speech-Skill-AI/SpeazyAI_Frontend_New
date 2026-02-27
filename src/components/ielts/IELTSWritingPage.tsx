import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, PenTool, Loader2, AlertCircle, Sparkles, LogOut, FileText } from 'lucide-react';
import { useLocalizedNavigate } from '../LocaleLayout';

interface WritingItem {
  id: number;
  content_id: string;
  title: string;
  json_url: string;
  is_published: number;
  created_at: string;
  task1_image_url?: string;
}

interface WritingResponse {
  success: boolean;
  items: WritingItem[];
  paging: {
    limit: number;
    offset: number;
  };
}



export function IELTSWritingPage() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [items, setItems] = useState<WritingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch writing items from API
  useEffect(() => {
    const fetchWritingItems = async () => {
      if (!token) {
        setError(t('modules.ielts.authRequired'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          'https://api.intelliviq.com/api/ielts/writing/content/list.php',
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

        const data: WritingResponse = await response.json();
        
        if (data.success && Array.isArray(data.items)) {
          // Don't fetch content here - just use the items as-is
          // Content will be fetched in the task view
          setItems(data.items);
        } else {
          setItems([]);
        }
      } catch (err: any) {
        console.error('Error fetching writing content:', err);
        setError(err.message || t('modules.ielts.loadFailed'));
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWritingItems();
  }, [token, t]);

  const handleTileClick = (item: WritingItem) => {
    // Always start with Task 1 when clicking a tile
    const contentId = item.content_id || item.id.toString();
    // Clear any previous evaluations for this content when starting new test
    localStorage.removeItem(`ielts_task1_eval_${contentId}`);
    localStorage.removeItem(`ielts_task2_eval_${contentId}`);
    localStorage.removeItem(`ielts_task1_text_${contentId}`);
    localStorage.removeItem(`ielts_task2_text_${contentId}`);
    const url = `/ielts/writing/${contentId}?task=1`;
    navigate(url);
  };

  // Inline styles matching the theme
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
    position: 'relative',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(236, 72, 153, 0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    border: '1px solid rgba(75, 85, 99, 0.5)',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
    position: 'relative',
    transition: 'all 0.3s ease',
  };

  const titleCardStyle: React.CSSProperties = {
    ...cardStyle,
    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
    border: '2px solid rgba(34, 197, 94, 0.3)',
  };

  const taskCardStyle: React.CSSProperties = {
    ...cardStyle,
    cursor: 'pointer',
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
            <Button
              variant="ghost"
              onClick={() => navigate('/ielts')}
              style={{
                color: '#9ca3af',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                fontSize: '12px',
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
              {t('modules.ielts.writing')}
            </h1>

            <Button
              variant="ghost"
              onClick={logout}
              style={{
                color: '#9ca3af',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                fontSize: '12px',
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
                color: '#22c55e',
                animation: 'spin 1s linear infinite',
                marginBottom: '24px',
              }} />
              <p style={{ color: '#d1d5db', fontSize: '18px' }}>
                {t('modules.ielts.loadingWriting')}
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
                  color: '#ffffff',
                  marginBottom: '12px',
                }}>
                  {t('modules.ielts.errorLoadingContent')}
                </h3>
                <p style={{ color: '#9ca3af', marginBottom: '32px', fontSize: '18px' }}>
                  {error}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    background: 'linear-gradient(to right, #22c55e, #10b981)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    fontSize: '18px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  {t('modules.ielts.tryAgain')}
                </button>
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card style={cardStyle}>
              <CardContent style={{ padding: '48px', textAlign: 'center' }}>
                <PenTool style={{
                  width: '64px',
                  height: '64px',
                  color: '#22c55e',
                  margin: '0 auto 24px',
                }} />
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: '12px',
                }}>
                  No Content Available
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '18px' }}>
                  There are no writing materials available at the moment.
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
                  <Sparkles style={{ width: '32px', height: '32px', color: '#22c55e', marginRight: '12px' }} />
                  <h2 style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.02em',
                  }}>
                    Writing Tasks
                  </h2>
                  <Sparkles style={{ width: '32px', height: '32px', color: '#22c55e', marginLeft: '12px' }} />
                </div>
                <p style={{ color: '#d1d5db', fontSize: '20px' }}>
                  Select a writing task to practice your essay composition skills
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: '32px',
              }}>
                {items.map((item, itemIndex) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px',
                    }}
                  >
                    {/* Single Clickable Tile */}
                    <Card
                      style={{
                        ...taskCardStyle,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleTileClick(item)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.6)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                      }}
                    >
                      {/* Gradient top border */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(to right, #22c55e, #10b981)',
                      }} />
                      
                      <CardHeader style={{ padding: '24px', textAlign: 'center', position: 'relative' }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          margin: '0 auto 16px',
                          background: 'linear-gradient(to bottom right, #22c55e, #10b981)',
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3)',
                        }}>
                          <FileText style={{ width: '32px', height: '32px', color: '#ffffff' }} />
                        </div>
                        <CardTitle style={{
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: '#ffffff',
                          marginBottom: '8px',
                        }}>
                          {item.title}
                        </CardTitle>
                        <p style={{
                          color: '#9ca3af',
                          fontSize: '14px',
                          marginTop: '8px',
                        }}>
                          Click to start writing
                        </p>
                      </CardHeader>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
