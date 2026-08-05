import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from './utils/api';

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
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Silent refresh using HttpOnly cookie on startup
    const tryRefreshSession = async () => {
      try {
        const res = await apiFetch('/api/v1/auth/refresh-token', { method: 'POST' });
        if (res && res.token && res.user) {
          setToken(res.token);
          setUser(res.user);
        }
      } catch (e) {
        // No active session cookie
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    tryRefreshSession();
  }, []);

  const signInWithEmailPassword = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
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
        setToken(res.token);
        setUser(res.user);
      }
    } catch (e: any) {
      alert(`Registration Error: ${e.message}`);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = async () => {
    alert("Guest access is disabled in production mode. Please sign in with registered credentials.");
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
    setToken(null);
    setUser(null);
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
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
