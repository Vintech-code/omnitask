import React, { createContext, useContext, useState, useEffect } from 'react';
import { Storage, KEYS } from '../services/StorageService';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  hasSeenOnboarding: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateUser: async () => {},
  markOnboardingSeen: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Load persisted user on mount
  useEffect(() => {
    (async () => {
      const storedUser = await Storage.get<User>(KEYS.USER);
      const onboardingDone = await Storage.get<boolean>(KEYS.ONBOARDING_DONE);
      setUser(storedUser);
      setHasSeenOnboarding(!!onboardingDone);
      setIsLoading(false);
    })();
  }, []);

  const signIn = async (email: string, _password: string) => {
    const u: User = {
      id: Date.now().toString(),
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      email,
    };
    await Storage.set(KEYS.USER, u);
    setUser(u);
  };

  const signUp = async (name: string, email: string, _password: string) => {
    const u: User = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.trim(),
    };
    await Storage.set(KEYS.USER, u);
    setUser(u);
  };

  const signOut = async () => {
    await Storage.remove(KEYS.USER);
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await Storage.set(KEYS.USER, updated);
    setUser(updated);
  };

  const markOnboardingSeen = async () => {
    await Storage.set(KEYS.ONBOARDING_DONE, true);
    setHasSeenOnboarding(true);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, hasSeenOnboarding, signIn, signUp, signOut, updateUser, markOnboardingSeen }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
