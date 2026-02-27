import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../LocaleLayout';
import { ArrowLeft, Headphones, Loader2, AlertCircle, LogOut } from 'lucide-react';

interface ListeningItem {
  id: number;
  content_id: string;
  title: string;
  json_url: string;
  is_published: number;
  created_at: string;
}

interface ListeningResponse {
  success: boolean;
  items: ListeningItem[];
  paging: {
    limit: number;
    offset: number;
  };
}

export function IELTSListeningPage() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { token, logout } = useAuth();
  const [items, setItems] = useState<ListeningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch listening items from API
  useEffect(() => {
    const fetchListeningItems = async () => {
      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          'https://api.intelliviq.com/api/ielts/listening/content/list.php',
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

        const data: ListeningResponse = await response.json();
        
        if (data.success && Array.isArray(data.items)) {
          setItems(data.items);
        } else {
          setItems([]);
        }
      } catch (err: any) {
        console.error('Error fetching listening content:', err);
        setError(err.message || t('modules.ielts.loadFailed'));
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListeningItems();
  }, [token, t]);

  const handleTileClick = (item: ListeningItem) => {
    const contentId = item.content_id || item.id.toString();
    // Navigate to listening detail page (to be created)
    navigate(`/ielts/listening/${contentId}`);
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
    borderColor: 'rgba(168, 85, 247, 0.6)',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)',
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
            {t('modules.back')}
          </button>
          <h1 style={titleStyle}>
            <Headphones style={{ width: '24px', height: '24px', color: '#a855f7' }} />
            {t('modules.ielts.listening')}
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
            <Loader2 style={{ width: '48px', height: '48px', animation: 'spin 1s linear infinite', color: '#a855f7' }} />
            <p style={{ color: '#d1d5db' }}>{t('modules.ielts.loadingListening')}</p>
          </div>
        ) : items.length === 0 ? (
          <div style={loadingStyle}>
            <Headphones style={{ width: '64px', height: '64px', color: '#6b7280', opacity: 0.5 }} />
            <p style={{ color: '#9ca3af' }}>No listening content available</p>
          </div>
        ) : (
          /* Tiles Grid */
          <div style={gridStyle}>
            {items.map((item) => (
              <div
                key={item.content_id || item.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTileClick(item);
                }}
                style={tileStyle}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, tileHoverStyle);
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, tileStyle);
                }}
              >
                <div style={tileTitleStyle}>
                  <Headphones style={{ width: '20px', height: '20px', color: '#a855f7' }} />
                  {item.title}
                </div>
                <div style={tileDescriptionStyle}>
                  {t('modules.listening.clickToView')}
                </div>
              </div>
            ))}
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