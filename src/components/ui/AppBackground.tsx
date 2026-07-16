import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

function alpha(hex: string, opacity: string) {
  return `${hex}${opacity}`;
}

function AppBackgroundComponent() {
  const { theme } = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[theme.background.top, theme.background.base, theme.background.bottom]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[alpha(theme.background.ambientLavender, '00'), alpha(theme.background.ambientLavender, theme.dark ? '8A' : 'A8'), alpha(theme.background.ambientLavender, '00')]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.12, y: 0.1 }}
        end={{ x: 0.9, y: 0.95 }}
        style={[styles.field, styles.topField]}
      />
      <LinearGradient
        colors={[alpha(theme.background.ambientBlue, '00'), alpha(theme.background.ambientBlue, theme.dark ? '70' : '8C'), alpha(theme.background.ambientBlue, '00')]}
        locations={[0, 0.46, 1]}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.15, y: 1 }}
        style={[styles.field, styles.leftField]}
      />
      <LinearGradient
        colors={[alpha(theme.background.ambientLavender, '00'), alpha(theme.background.ambientLavender, theme.dark ? '66' : '82'), alpha(theme.background.ambientLavender, '00')]}
        locations={[0, 0.48, 1]}
        style={[styles.field, styles.bottomField]}
      />
      <LinearGradient
        colors={theme.dark
          ? ['rgba(255,255,255,0.035)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.025)']
          : ['rgba(255,255,255,0.40)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.28)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export const AppBackground = memo(AppBackgroundComponent);

const styles = StyleSheet.create({
  field: { position: 'absolute', borderRadius: 999, overflow: 'hidden' },
  topField: { width: 440, height: 410, top: -225, right: -175, transform: [{ rotate: '-14deg' }] },
  leftField: { width: 420, height: 520, top: '27%', left: -285, transform: [{ rotate: '18deg' }] },
  bottomField: { width: 480, height: 390, bottom: -235, right: -245, transform: [{ rotate: '-22deg' }] },
});
