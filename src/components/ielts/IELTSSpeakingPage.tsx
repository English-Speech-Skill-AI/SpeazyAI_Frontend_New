import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Mic, Loader2, AlertCircle, LogOut } from 'lucide-react';

interface SpeakingItem {
  id?: number;
  content_id?: string;
  json_key?: string; // API returns json_key instead of content_id
  title: string;
  json_url: string;
  is_published?: number;
  created_at?: string;
}

interface SpeakingResponse {
  success: boolean;
  items: SpeakingItem[];
  paging: {
    limit: number;
    offset: number;
  };
}

export function IELTSSpeakingPage() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [items, setItems] = useState<SpeakingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch speaking items from API
  useEffect(() => {
    const fetchSpeakingItems = async () => {
      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          'https://api.intelliviq.com/api/ielts/speaking/content/list.php',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
        }

        const data: SpeakingResponse = await response.json();
        if (data.success && Array.isArray(data.items)) {
          setItems(data.items);
        } else {
          setItems([]);
        }
      } catch (err: any) {
        console.error('Error fetching speaking content:', err);
        setError(err.message || 'Failed to load speaking content. Please try again.');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSpeakingItems();
  }, [token]);

  const deriveContentId = (item: SpeakingItem): string | null => {
    if (item.content_id) return item.content_id;
    if (item.json_key) {
      const parts = item.json_key.split('/').filter(Boolean);
      const idx = parts.indexOf('speaking');
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      if (parts.length > 0) return parts[parts.length - 1].replace('content.json', '').replace('.json', '');
    }
    if (item.json_url) {
      try {
        const url = new URL(item.json_url);
        const segments = url.pathname.split('/').filter(Boolean);
        const idx = segments.indexOf('speaking');
        if (idx >= 0 && segments[idx + 1]) return segments[idx + 1];
        if (segments.length > 0) return segments[segments.length - 1].replace('content.json', '').replace('.json', '');
      } catch {
        // ignore parse errors
      }
    }
    if (item.id != null) return item.id.toString();
    return null;
  };

  const handleTileClick = (item: SpeakingItem) => {
    if (!item) return;
    const contentId = deriveContentId(item);
    if (!contentId) return;
    navigate(`/ielts/speaking/${encodeURIComponent(contentId)}`, { state: { item } });
  };

  // Inline styles matching the theme
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #000000, rgba(147, 51, 234, 0.3), rgba(99, 102, 241, 0.3))',
    padding: '32px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(236, 72, 153, 0.3)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  };

  const tileStyle: React.CSSProperties = {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    border: '1px solid rgba(75, 85, 99, 0.5)',
    borderRadius: '16px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '200px',
  };

  const tileHoverStyle: React.CSSProperties = {
    ...tileStyle,
    borderColor: 'rgba(236, 72, 153, 0.6)',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(236, 72, 153, 0.4)',
  };

  const tileTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const tileDescriptionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#d1d5db',
    marginTop: 'auto',
    paddingTop: '16px',
    borderTop: '1px solid rgba(75, 85, 99, 0.5)',
  };

  const backButtonStyle: React.CSSProperties = {
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
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#ffffff',
    gap: '16px',
  };

  const errorStyle: React.CSSProperties = {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '24px',
    color: '#f87171',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  };

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={headerStyle}>
          <button
            onClick={() => navigate('/ielts')}
            style={backButtonStyle}
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
            Back
          </button>
          <h1 style={titleStyle}>
            <Mic style={{ width: '24px', height: '24px', color: '#ec4899' }} />
            IELTS Speaking
          </h1>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: '12px',
              padding: '8px 16px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
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
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={errorStyle}>
            <AlertCircle style={{ width: '20px', height: '20px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={loadingStyle}>
            <Loader2 style={{ width: '48px', height: '48px', animation: 'spin 1s linear infinite', color: '#ec4899' }} />
            <p style={{ color: '#d1d5db' }}>Loading speaking content...</p>
          </div>
        ) : items.length === 0 ? (
          <div style={loadingStyle}>
            <Mic style={{ width: '64px', height: '64px', color: '#6b7280', opacity: 0.5 }} />
            <p style={{ color: '#9ca3af' }}>No speaking content available</p>
          </div>
        ) : (
          /* Tiles Grid */
          <div style={gridStyle}>
            {items
              .filter((item) => item && item.title && deriveContentId(item)) // Filter out invalid items
              .map((item, index) => {
                const contentId = deriveContentId(item) || `item-${index}`;
                const itemTitle = item.title || 'Untitled Speaking Exercise';
                
                return (
                  <div
                    key={contentId}
                    onClick={() => handleTileClick(item)}
                    style={tileStyle}
                    onMouseEnter={(e) => {
                      const target = e.currentTarget;
                      target.style.borderColor = 'rgba(236, 72, 153, 0.6)';
                      target.style.backgroundColor = 'rgba(17, 24, 39, 0.95)';
                      target.style.transform = 'translateY(-4px)';
                      target.style.boxShadow = '0 8px 24px rgba(236, 72, 153, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      const target = e.currentTarget;
                      target.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                      target.style.backgroundColor = 'rgba(17, 24, 39, 0.8)';
                      target.style.transform = 'translateY(0)';
                      target.style.boxShadow = 'none';
                    }}
                  >
                    <div style={tileTitleStyle}>
                      <Mic style={{ width: '20px', height: '20px', color: '#ec4899' }} />
                      {itemTitle}
                    </div>
                    <div style={tileDescriptionStyle}>
                      Click to start speaking exercise
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
