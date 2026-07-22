import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/context/ThemeContext';
import type { CurrentWeather } from '@/types/weather';

/** Static layered atmospheric background used throughout OmniTask. */
function AppBackgroundComponent({ weather: _weather }: { weather?: CurrentWeather | null }) {
  const { theme } = useTheme();

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.canvas]}>
      <LinearGradient
        colors={theme.dark
          ? [theme.background.top, theme.background.base, theme.background.bottom]
          : ['#FBF6EE', '#F4F5F1', '#E8F0F2']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={theme.dark
          ? ['rgba(255,122,0,0.09)', 'rgba(255,255,255,0)', 'rgba(87,139,166,0.11)']
          : ['rgba(255,186,119,0.18)', 'rgba(255,255,255,0.06)', 'rgba(156,194,207,0.23)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={theme.dark
          ? ['rgba(103,153,180,0.07)', 'rgba(255,255,255,0.02)', 'rgba(255,151,67,0.05)']
          : ['rgba(194,215,222,0.16)', 'rgba(255,255,255,0.40)', 'rgba(255,211,169,0.09)']}
        locations={[0, 0.46, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={theme.dark
          ? ['rgba(255,255,255,0.045)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.16)']
          : ['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.04)', 'rgba(213,225,229,0.22)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export const AppBackground = memo(AppBackgroundComponent);

const styles = StyleSheet.create({
  canvas: { overflow: 'hidden' },
});
