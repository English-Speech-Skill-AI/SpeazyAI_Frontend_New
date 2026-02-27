import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { clearAllPdfTextCache } from '../utils/pdfTextExtractor';
import useHeartbeat from '../hooks/useHeartbeat';
import { API_URLS } from '@/config/apiConfig';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  organisation_id: number | null;
  organisation_name?: string | null;  // From login.php API response
  class: string | string[] | null;
  created_at: string;
}

interface AuthData {
  token: string;
  user: User;
  session_id?: string; // Session ID for analytics tracking
  refresh_token?: string; // Refresh token for token renewal
  tokenExpiry?: number; // Timestamp when token expires
  lastActivity?: number; // Timestamp of last user activity
}

interface AuthContextType {
  authData: AuthData | null;
  isAuthenticated: boolean;
  userRole: string | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  updateActivity: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// API base URL for analytics endpoints
const API_BASE_URL = 'https://api.intelliviq.com/api';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Token expires after 1 hour (3600000 ms)
  const TOKEN_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds
  const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour of inactivity
  const REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry

  useEffect(() => {
    // Load auth data from localStorage on mount
    const storedAuthData = localStorage.getItem('authData');
    if (storedAuthData) {
      try {
        const parsed = JSON.parse(storedAuthData);
        // Set current activity time if not present
        if (!parsed.lastActivity) {
          parsed.lastActivity = Date.now();
        }
        // Set token expiry if not present (default to 1 hour from now)
        if (!parsed.tokenExpiry) {
          parsed.tokenExpiry = Date.now() + TOKEN_EXPIRY_TIME;
        }
        setAuthData(parsed);
        localStorage.setItem('authData', JSON.stringify(parsed));
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        localStorage.removeItem('authData');
      }
    }
    setLoading(false);
  }, []);

  // Use heartbeat hook when user is authenticated
  useHeartbeat({
    token: authData?.token || null,
    sessionId: authData?.session_id || null,
    apiBaseUrl: API_BASE_URL,
    intervalMs: 60000, // 60 seconds
  });

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!authData?.refresh_token) {
      console.warn('No refresh token available');
      return false;
    }

    try {
      // Use the refresh token API endpoint
      const refreshUrl = `${API_BASE_URL}/auth/refresh.php`;
      
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: authData.refresh_token,
          platform: 'web',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Token refresh failed:', response.status, errorData);
        return false;
      }

      const data = await response.json();
      
      if (data.success && data.data?.token) {
        const now = Date.now();
        const updatedAuthData: AuthData = {
          ...authData,
          token: data.data.token,
          // Update refresh_token if a new one is provided
          refresh_token: data.data.refresh_token || authData.refresh_token,
          tokenExpiry: now + TOKEN_EXPIRY_TIME,
          lastActivity: now,
        };
        setAuthData(updatedAuthData);
        localStorage.setItem('authData', JSON.stringify(updatedAuthData));
        console.log('Token refreshed successfully');
        return true;
      } else {
        console.error('Token refresh response missing token:', data);
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }, [authData]);

  const updateActivity = useCallback(() => {
    if (authData) {
      const updatedAuthData: AuthData = {
        ...authData,
        lastActivity: Date.now(),
      };
      setAuthData(updatedAuthData);
      localStorage.setItem('authData', JSON.stringify(updatedAuthData));
    }
  }, [authData]);

  const logout = useCallback(async () => {
    // End session on logout
    const currentAuthData = authData;
    if (currentAuthData?.token && currentAuthData?.session_id) {
      try {
        await fetch(`${API_BASE_URL}/analytics/end-session.php`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentAuthData.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: currentAuthData.session_id }),
        });
      } catch (e) {
        // ignore errors on logout
        console.debug('End session call failed on logout:', e);
      }
    }

    setAuthData(null);
    localStorage.removeItem('authData');
    // Clear PDF text cache
    try {
      clearAllPdfTextCache();
    } catch (error) {
      console.error('Error clearing PDF cache on logout:', error);
    }
  }, [authData]);

  // Set up token refresh and inactivity tracking
  useEffect(() => {
    if (!authData?.token) {
      // Clear timers if no auth data
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
        activityCheckIntervalRef.current = null;
      }
      return;
    }

    // Set up token refresh timer
    const setupTokenRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      const timeUntilExpiry = (authData.tokenExpiry || Date.now() + TOKEN_EXPIRY_TIME) - Date.now();
      const refreshTime = Math.max(0, timeUntilExpiry - REFRESH_BUFFER);

      refreshTimerRef.current = setTimeout(async () => {
        console.log('Refreshing token before expiry...');
        const success = await refreshToken();
        if (!success) {
          console.error('Token refresh failed, logging out...');
          logout();
        } else {
          setupTokenRefresh(); // Set up next refresh
        }
      }, refreshTime);
    };

    // Set up inactivity timer
    const setupInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      const lastActivity = authData.lastActivity || Date.now();
      const timeSinceActivity = Date.now() - lastActivity;
      const remainingTime = Math.max(0, INACTIVITY_TIMEOUT - timeSinceActivity);

      inactivityTimerRef.current = setTimeout(() => {
        console.log('Inactivity timeout reached, logging out...');
        logout();
      }, remainingTime);
    };

    // Set up activity monitoring
    const setupActivityMonitoring = () => {
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
      }

      // Check activity every 30 seconds
      activityCheckIntervalRef.current = setInterval(() => {
        const storedAuthData = localStorage.getItem('authData');
        if (storedAuthData) {
          try {
            const parsed = JSON.parse(storedAuthData);
            const lastActivity = parsed.lastActivity || Date.now();
            const timeSinceActivity = Date.now() - lastActivity;

            if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
              console.log('Inactivity detected, logging out...');
              logout();
            } else {
              // Update inactivity timer
              setupInactivityTimer();
            }
          } catch (error) {
            console.error('Error checking activity:', error);
          }
        }
      }, 30000); // Check every 30 seconds
    };

    // Track user activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      updateActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    setupTokenRefresh();
    setupInactivityTimer();
    setupActivityMonitoring();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [authData, refreshToken, logout, updateActivity]);

  const login = async (email: string, password: string) => {
    try {
      // Always use API_URLS.authProxy (DigitalOcean) - includes localhost
      const apiUrl = API_URLS.authProxy
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        // Handle HTTP errors
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid email or password. Please try again.');
        }
        throw new Error(`Login failed with status ${response.status}. Please try again.`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const now = Date.now();
        const authData: AuthData = {
          token: data.data.token,
          user: data.data.user,
          session_id: data.data.session_id, // Store session_id from login response
          refresh_token: data.data.refresh_token, // Store refresh_token from login response
          tokenExpiry: now + TOKEN_EXPIRY_TIME,
          lastActivity: now,
        };
        setAuthData(authData);
        localStorage.setItem('authData', JSON.stringify(authData));
        
        // Also store separately for easy access (as per requirements)
        if (data.data.session_id) {
          localStorage.setItem('session_id', data.data.session_id);
        }
        if (data.data.token) {
          localStorage.setItem('token', data.data.token);
        }
        if (data.data.refresh_token) {
          localStorage.setItem('refresh_token', data.data.refresh_token);
        }
      } else {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network or CORS error
        throw new Error('Network error. Please check your connection or contact support if the problem persists.');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  };


  // Set up beforeunload handler to end session on tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      const token = authData?.token || localStorage.getItem('token');
      const sessionId = authData?.session_id || localStorage.getItem('session_id');
      
      if (!token || !sessionId) return;

      const url = `${API_BASE_URL}/analytics/end-session.php`;
      const blob = new Blob(
        [JSON.stringify({ session_id: sessionId })],
        { type: 'application/json' }
      );

      // Note: sendBeacon cannot set Authorization header.
      // The backend may need to accept session_id without token for this case,
      // or we can try to include token in the body if backend supports it.
      // For now, we'll send it and let the backend handle it appropriately.
      try {
        navigator.sendBeacon(url, blob);
      } catch (e) {
        // Fallback: try to send with fetch (may not work on page unload)
        console.debug('sendBeacon failed, trying fetch:', e);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [authData]);

  const value: AuthContextType = {
    authData,
    isAuthenticated: !!authData?.token,
    userRole: authData?.user.role || null,
    token: authData?.token || null,
    login,
    logout,
    refreshToken,
    updateActivity,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

