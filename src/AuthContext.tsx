import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from './utils/api';

export type AppRole = 'admin' | 'staff' | 'user' | 'intern';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

interface AuthContextType {
  user: UserProfile | null;
  role: AppRole | null;
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
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmailPassword: async () => {},
  registerWithEmailPassword: async () => {},
  signInAsGuest: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on startup
    const storedUser = localStorage.getItem('nexa_user_profile');
    const storedToken = localStorage.getItem('nexa_auth_token');

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('nexa_user_profile');
        localStorage.removeItem('nexa_auth_token');
      }
    }
    setLoading(false);
  }, []);

  const signInWithEmailPassword = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res && res.token && res.user) {
        localStorage.setItem('nexa_auth_token', res.token);
        localStorage.setItem('nexa_user_profile', JSON.stringify(res.user));
        setUser(res.user);
      }
    } catch (e: any) {
      alert(`Login Error: ${e.message}`);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmailPassword = async (email: string, password: string, name: string, role = 'intern') => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role })
      });
      if (res && res.token && res.user) {
        localStorage.setItem('nexa_auth_token', res.token);
        localStorage.setItem('nexa_user_profile', JSON.stringify(res.user));
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
    // Standard guest role with guest credentials in the client state
    const guestUser: UserProfile = {
      id: 'guest-admin-uid',
      email: 'guest-admin@nexainventory.com',
      name: 'Guest Administrator',
      role: 'admin'
    };
    localStorage.setItem('nexa_auth_token', 'guest-token-mock');
    localStorage.setItem('nexa_user_profile', JSON.stringify(guestUser));
    setUser(guestUser);
  };

  const signInWithGoogle = async () => {
    alert("Google Sign-In has been removed for absolute Firebase Independence. Please register a local credentials profile or run as Guest Admin.");
  };

  const signOut = async () => {
    localStorage.removeItem('nexa_auth_token');
    localStorage.removeItem('nexa_user_profile');
    setUser(null);
  };

  const role = user ? user.role : null;

  return (
    <AuthContext.Provider value={{
      user,
      role,
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
