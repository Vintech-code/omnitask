import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/context/ThemeContext';
import { OMNITASK_PALETTE } from '@/theme/colors';
import type { CurrentWeather } from '@/types/weather';

/** Static layered atmospheric background used throughout OmniTask. */
function AppBackgroundComponent({ weather: _weather }: { weather?: CurrentWeather | null }) {
  const { theme } = useTheme();

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.canvas]}>
      <LinearGradient
        colors={theme.dark
          ? [theme.background.top, theme.background.base, theme.background.bottom, theme.background.bottom]
          : [OMNITASK_PALETTE.headerTeal, OMNITASK_PALETTE.mistBlue, OMNITASK_PALETTE.skyTint, OMNITASK_PALETTE.pearlIce]}
        locations={[0, 0.18, 0.36, 0.58]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export const AppBackground = memo(AppBackgroundComponent);

const styles = StyleSheet.create({
  canvas: { overflow: 'hidden' },
});
