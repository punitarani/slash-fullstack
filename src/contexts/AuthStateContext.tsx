'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthState {
  impersonatedUserId: string | null;
  setImpersonatedUserId: (userId: string | null) => void;
}

const AuthStateContext = createContext<AuthState | undefined>(undefined);

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);

  useEffect(() => {
    // Load the impersonated user ID from sessionStorage on initial render
    const storedUserId = sessionStorage.getItem('impersonatedUserId');
    if (storedUserId) {
      setImpersonatedUserId(storedUserId);
    }
  }, []);

  const updateImpersonatedUserId = (userId: string | null) => {
    setImpersonatedUserId(userId);
    if (userId) {
      sessionStorage.setItem('impersonatedUserId', userId);
    } else {
      sessionStorage.removeItem('impersonatedUserId');
    }
  };

  return (
    <AuthStateContext.Provider value={{ impersonatedUserId, setImpersonatedUserId: updateImpersonatedUserId }}>
      {children}
    </AuthStateContext.Provider>
  );
}

export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthStateProvider');
  }
  return context;
}
