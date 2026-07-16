import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { glassShadow, radii } from '@/theme';

type GlassVariant = 'standard' | 'elevated' | 'subtle' | 'solid';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: GlassVariant;
  padding?: number;
}

export function GlassCard({ children, style, contentStyle, variant = 'standard', padding = 16 }: GlassCardProps) {
  const { theme } = useTheme();
  const fill = variant === 'solid'
    ? theme.glass.solid
    : variant === 'subtle'
      ? theme.glass.secondary
      : theme.glass.primary;

  return (
    <View style={[styles.shell, variant === 'elevated' && glassShadow, { borderColor: theme.glass.border }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
      <View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.glass.highlight }]} />
      <View style={[{ padding }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  highlight: { position: 'absolute', top: 0, left: 22, right: 22, height: 1, opacity: 0.8 },
});
