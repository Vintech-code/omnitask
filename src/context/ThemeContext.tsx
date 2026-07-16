import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { Storage, KEYS } from '../services/StorageService';

export interface Theme {
  dark: boolean;
  background: {
    base: string;
    top: string;
    bottom: string;
    ambientLavender: string;
    ambientBlue: string;
  };
  glass: {
    primary: string;
    secondary: string;
    solid: string;
    border: string;
    highlight: string;
  };
  content: { primary: string; secondary: string; muted: string };
  accent: { base: string; pressed: string; soft: string; glow: string };
  semantic: { success: string; warning: string; danger: string; info: string };
  divider: string;
  icon: string;

  // Compatibility aliases while legacy screens migrate to semantic tokens.
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

const createTheme = (dark: boolean): Theme => {
  const background = dark
    ? { base: '#121311', top: '#1A1B19', bottom: '#0E0F0E', ambientLavender: '#454858', ambientBlue: '#304A55' }
    : { base: '#ECEDEB', top: '#F3F3F1', bottom: '#E1E3E6', ambientLavender: '#B9BDCF', ambientBlue: '#B6CFDC' };
  const glass = dark
    ? { primary: 'rgba(38,39,37,0.68)', secondary: 'rgba(49,50,47,0.48)', solid: 'rgba(34,35,33,0.92)', border: 'rgba(255,255,255,0.13)', highlight: 'rgba(255,255,255,0.15)' }
    : { primary: 'rgba(255,255,255,0.58)', secondary: 'rgba(255,255,255,0.38)', solid: 'rgba(255,255,255,0.86)', border: 'rgba(255,255,255,0.76)', highlight: 'rgba(255,255,255,0.92)' };
  const content = dark
    ? { primary: '#F7F7F3', secondary: '#B8B9B4', muted: '#81827E' }
    : { primary: '#171717', secondary: '#666765', muted: '#92938F' };
  const accent = dark
    ? { base: '#FF861A', pressed: '#F17608', soft: 'rgba(255,134,26,0.17)', glow: 'rgba(255,134,26,0.30)' }
    : { base: '#FF7A00', pressed: '#E66E00', soft: 'rgba(255,122,0,0.13)', glow: 'rgba(255,160,55,0.30)' };
  const semantic = dark
    ? { success: '#8ACB42', warning: '#F0AE3D', danger: '#F0706A', info: '#7DB1CF' }
    : { success: '#74B82A', warning: '#E7A126', danger: '#E45B55', info: '#6E9FBD' };
  const divider = dark ? 'rgba(255,255,255,0.10)' : 'rgba(23,23,23,0.09)';

  return {
    dark,
    background,
    glass,
    content,
    accent,
    semantic,
    divider,
    icon: dark ? '#F1F1ED' : '#191A19',
    bg: background.base,
    bg2: dark ? '#1A1B19' : '#ECEDEB',
    card: glass.solid,
    border: glass.border,
    text: content.primary,
    textSub: content.secondary,
    textDim: content.muted,
    tabBar: glass.solid,
    tabBorder: glass.border,
    segBg: glass.secondary,
    segActive: glass.solid,
    iconColor: dark ? '#F1F1ED' : '#191A19',
  };
};

const LIGHT = createTheme(false);
const DARK = createTheme(true);

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

  useEffect(() => {
    (async () => {
      const systemPref = await Storage.get<boolean>(KEYS.SYSTEM_THEME);
      if (systemPref) {
        setUseSystemThemeState(true);
        setIsDark(Appearance.getColorScheme() === 'dark');
      } else {
        const saved = await Storage.get<boolean>(KEYS.THEME);
        if (saved !== null) setIsDark(saved);
      }
    })();
  }, []);

  useEffect(() => {
    if (!useSystemTheme) return;
    const sub = Appearance.addChangeListener(({ colorScheme }) => setIsDark(colorScheme === 'dark'));
    return () => sub.remove();
  }, [useSystemTheme]);

  const theme = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  const toggleTheme = () => {
    if (useSystemTheme) return;
    const next = !isDark;
    setIsDark(next);
    Storage.set(KEYS.THEME, next);
  };

  const setUseSystemTheme = (val: boolean) => {
    setUseSystemThemeState(val);
    Storage.set(KEYS.SYSTEM_THEME, val);
    if (val) setIsDark(Appearance.getColorScheme() === 'dark');
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
