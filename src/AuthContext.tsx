import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, setApiAuthToken, clearApiAuth, refreshAuthToken, getApiAuthToken, getApiRefreshToken } from './utils/api';

export type AppRole = 'admin' | 'manager' | 'staff' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

interface AuthContextType {
  user: UserProfile | null;
  role: AppRole | null;
  token: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  registerWithEmailPassword: (email: string, password: string, name: string, role?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  updateCurrentUser: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  token: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmailPassword: async () => {},
  registerWithEmailPassword: async () => {},
  signInAsGuest: async () => {},
  signOut: async () => {},
  updateCurrentUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('experimind_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('experimind_auth_token');
    } catch (_) {}
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      setApiAuthToken(token);
    }
  }, [token]);

  useEffect(() => {
    // Listen for auth expired events dispatched from api.ts
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('experimind_auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('experimind_auth_expired', handleAuthExpired);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Silent refresh / session validation on startup
    const tryRefreshSession = async () => {
      const storedToken = localStorage.getItem('experimind_auth_token');
      const storedRefreshToken = localStorage.getItem('experimind_refresh_token');

      // If no token or refresh token at all, stay logged out and finish loading
      if (!storedToken && !storedRefreshToken) {
        if (isMounted) {
          setToken(null);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const refreshResult = await refreshAuthToken();
        if (refreshResult && refreshResult.token) {
          if (isMounted) {
            setToken(refreshResult.token);
            if (refreshResult.user) {
              setUser(refreshResult.user);
            }
          }
        } else {
          // Token is dead / expired and refresh failed
          if (isMounted) {
            setToken(null);
            setUser(null);
            clearApiAuth();
          }
        }
      } catch (e) {
        if (isMounted) {
          setToken(null);
          setUser(null);
          clearApiAuth();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    tryRefreshSession();

    // 2. Proactive 10-minute token renewal timer (keeps active sessions permanently alive)
    const refreshTimer = setInterval(async () => {
      if (localStorage.getItem('experimind_auth_token') || localStorage.getItem('experimind_refresh_token')) {
        try {
          const refreshResult = await refreshAuthToken();
          if (refreshResult && refreshResult.token && isMounted) {
            setToken(refreshResult.token);
            if (refreshResult.user) {
              setUser(refreshResult.user);
            }
          }
        } catch (_) {}
      }
    }, 10 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
    };
  }, []);

  const signInWithEmailPassword = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res && res.token && res.user) {
        setApiAuthToken(res.token, res.refreshToken);
        setToken(res.token);
        setUser(res.user);
        try {
          localStorage.setItem('experimind_user_profile', JSON.stringify(res.user));
        } catch (_) {}
      }
    } catch (e: any) {
      alert(`Login Error: ${e.message}`);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmailPassword = async (email: string, password: string, name: string, role = 'viewer') => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role })
      });
      if (res && res.token && res.user) {
        setApiAuthToken(res.token, res.refreshToken);
        setToken(res.token);
        setUser(res.user);
        try {
          localStorage.setItem('experimind_user_profile', JSON.stringify(res.user));
        } catch (_) {}
      }
    } catch (e: any) {
      alert(`Registration Error: ${e.message}`);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = async () => {
    if ((import.meta as any).env?.PROD) {
      alert("Guest access is disabled in production mode. Please sign in with registered credentials.");
      return;
    }
    return signInWithEmailPassword('admin@experimindlabs.com', 'AdminPass123!');
  };

  const signInWithGoogle = async () => {
    alert("Google Sign-In has been removed for Firebase Independence. Please register local credentials.");
  };

  const signOut = async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore logout errors
    }
    setApiAuthToken(null, null);
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('experimind_user_profile');
    } catch (_) {}
  };

  const updateCurrentUser = (updates: Partial<UserProfile>) => {
    setUser(prev => {
      const updated = prev ? { ...prev, ...updates } : null;
      if (updated) {
        try {
          localStorage.setItem('experimind_user_profile', JSON.stringify(updated));
        } catch (_) {}
      }
      return updated;
    });
  };

  const role = user ? user.role : null;

  return (
    <AuthContext.Provider value={{
      user,
      role,
      token,
      loading,
      signInWithGoogle,
      signInWithEmailPassword,
      registerWithEmailPassword,
      signInAsGuest,
      signOut,
      updateCurrentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
