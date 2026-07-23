import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { Storage, KEYS } from '../services/StorageService';
import { OMNITASK_PALETTE } from '@/theme/colors';

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
  accent: { base: string; pressed: string; soft: string; glow: string; warm: string; warmSoft: string };
  iconTile: { coral: string; cyan: string; teal: string; blue: string; foreground: string };
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
    ? { base: OMNITASK_PALETTE.smokedNavy, top: OMNITASK_PALETTE.darkGradientTop, bottom: OMNITASK_PALETTE.darkGradientEnd, ambientLavender: OMNITASK_PALETTE.darkGradientTop, ambientBlue: OMNITASK_PALETTE.slateBlue }
    : { base: OMNITASK_PALETTE.pearlIce, top: OMNITASK_PALETTE.headerTeal, bottom: OMNITASK_PALETTE.lightGradientEnd, ambientLavender: OMNITASK_PALETTE.skyTint, ambientBlue: OMNITASK_PALETTE.mistBlue };
  const glass = dark
    ? { primary: 'rgba(29,46,47,0.84)', secondary: 'rgba(42,62,63,0.72)', solid: 'rgba(24,38,39,0.96)', border: 'rgba(196,224,225,0.16)', highlight: 'rgba(237,237,239,0.16)' }
    : { primary: 'rgba(255,255,255,0.88)', secondary: 'rgba(255,255,255,0.64)', solid: '#FFFFFF', border: 'rgba(255,255,255,0.92)', highlight: '#FFFFFF' };
  const content = dark
    ? { primary: '#EDEDEF', secondary: '#B9CACA', muted: '#819596' }
    : { primary: '#171A1A', secondary: '#5C6666', muted: '#8A9292' };
  const accent = dark
    ? { base: OMNITASK_PALETTE.brightCyan, pressed: OMNITASK_PALETTE.actionBlue, soft: 'rgba(52,199,217,0.16)', glow: 'rgba(52,199,217,0.22)', warm: OMNITASK_PALETTE.warmCoral, warmSoft: 'rgba(242,104,65,0.18)' }
    : { base: OMNITASK_PALETTE.actionBlue, pressed: OMNITASK_PALETTE.actionBluePressed, soft: 'rgba(196,224,225,0.72)', glow: 'rgba(51,175,173,0.22)', warm: OMNITASK_PALETTE.warmCoral, warmSoft: OMNITASK_PALETTE.warmCoralSoft };
  const semantic = dark
    ? { success: '#46C9B9', warning: '#F0A06F', danger: '#F27B5A', info: OMNITASK_PALETTE.brightCyan }
    : { success: OMNITASK_PALETTE.actionBlue, warning: OMNITASK_PALETTE.warmCoral, danger: '#D84F37', info: OMNITASK_PALETTE.infoBlue };
  const divider = dark ? 'rgba(196,224,225,0.13)' : 'rgba(23,26,26,0.08)';
  const iconTile = {
    coral: OMNITASK_PALETTE.warmCoral,
    cyan: OMNITASK_PALETTE.brightCyan,
    teal: OMNITASK_PALETTE.actionBlue,
    blue: OMNITASK_PALETTE.infoBlue,
    foreground: OMNITASK_PALETTE.iconForeground,
  };

  return {
    dark,
    background,
    glass,
    content,
    accent,
    iconTile,
    semantic,
    divider,
    icon: dark ? '#EDEDEF' : '#171A1A',
    bg: background.base,
    bg2: dark ? OMNITASK_PALETTE.darkGradientTop : OMNITASK_PALETTE.pearlIce,
    card: glass.solid,
    border: glass.border,
    text: content.primary,
    textSub: content.secondary,
    textDim: content.muted,
    tabBar: glass.solid,
    tabBorder: glass.border,
    segBg: glass.secondary,
    segActive: glass.solid,
    iconColor: dark ? '#EDEDEF' : '#171A1A',
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
    const next = !isDark;
    if (useSystemTheme) {
      setUseSystemThemeState(false);
      Storage.set(KEYS.SYSTEM_THEME, false);
    }
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
