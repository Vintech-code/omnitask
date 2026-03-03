import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Appearance } from 'react-native';
import { Storage, KEYS } from '../services/StorageService';

export interface Theme {
  dark: boolean;
  bg: string;
  bg2: string;
  card: string;
  border: string;
  text: string;
  textSub: string;
  textDim: string;
  tabBar: string;
  tabBorder: string;
  segBg: string;
  segActive: string;
  iconColor: string;
}

const LIGHT: Theme = {
  dark: false,
  bg: '#FFFFFF',
  bg2: '#F8F9FA',
  card: '#FFFFFF',
  border: '#EBEBEB',
  text: '#111111',
  textSub: '#555555',
  textDim: '#999999',
  tabBar: '#FFFFFF',
  tabBorder: '#F0F0F0',
  segBg: '#F2F2F2',
  segActive: '#FFFFFF',
  iconColor: '#222222',
};

const DARK: Theme = {
  dark: true,
  bg: '#111111',
  bg2: '#1A1A1A',
  card: '#1E1E1E',
  border: '#2A2A2A',
  text: '#F0F0F0',
  textSub: '#BBBBBB',
  textDim: '#777777',
  tabBar: '#161616',
  tabBorder: '#2A2A2A',
  segBg: '#1E1E1E',
  segActive: '#2A2A2A',
  iconColor: '#F0F0F0',
};

interface ThemeCtx {
  theme: Theme;
  isDark: boolean;
  useSystemTheme: boolean;
  toggleTheme: () => void;
  setUseSystemTheme: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: LIGHT,
  isDark: false,
  useSystemTheme: false,
  toggleTheme: () => {},
  setUseSystemTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [useSystemTheme, setUseSystemThemeState] = useState(false);

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      const systemPref = await Storage.get<boolean>(KEYS.SYSTEM_THEME);
      if (systemPref) {
        setUseSystemThemeState(true);
        const colorScheme = Appearance.getColorScheme();
        setIsDark(colorScheme === 'dark');
      } else {
        const saved = await Storage.get<boolean>(KEYS.THEME);
        if (saved !== null) setIsDark(saved);
      }
    })();
  }, []);

  // Listen for OS theme changes when systemTheme is on
  useEffect(() => {
    if (!useSystemTheme) return;
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDark(colorScheme === 'dark');
    });
    return () => sub.remove();
  }, [useSystemTheme]);

  const theme = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  const toggleTheme = () => {
    if (useSystemTheme) return; // no manual toggle while following system
    const next = !isDark;
    setIsDark(next);
    Storage.set(KEYS.THEME, next);
  };

  const setUseSystemTheme = (val: boolean) => {
    setUseSystemThemeState(val);
    Storage.set(KEYS.SYSTEM_THEME, val);
    if (val) {
      const colorScheme = Appearance.getColorScheme();
      setIsDark(colorScheme === 'dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, useSystemTheme, toggleTheme, setUseSystemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
