import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    : variant === 'subtle' || (!theme.dark && variant === 'standard')
      ? theme.glass.secondary
      : theme.glass.primary;

  return (
    <View style={[styles.shell, variant === 'elevated' && glassShadow, { borderColor: theme.glass.border }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
      <LinearGradient
        pointerEvents="none"
        colors={theme.dark
          ? ['rgba(255,255,255,0.10)', 'rgba(150,177,185,0.035)', 'rgba(0,0,0,0.08)']
          : ['rgba(255,255,255,0.48)', 'rgba(233,242,244,0.14)', 'rgba(211,224,228,0.20)']}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.glass.highlight }]} />
      <View pointerEvents="none" style={[styles.lowerEdge, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.12)' : 'rgba(153,177,183,0.12)' }]} />
      <View style={[{ padding }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  highlight: { position: 'absolute', top: 1, left: 18, right: 18, height: 1, opacity: 0.94 },
  lowerEdge: { position: 'absolute', left: 22, right: 22, bottom: 0, height: 1 },
});
