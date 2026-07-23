import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

type LoaderSize = 'small' | 'medium' | 'large';

interface OmniLoaderProps {
  size?: LoaderSize;
  onPrimary?: boolean;
  accessibilityLabel?: string;
}

const dimensions: Record<LoaderSize, { dot: number; travel: number; width: number }> = {
  small: { dot: 7, travel: 5, width: 22 },
  medium: { dot: 10, travel: 7, width: 30 },
  large: { dot: 13, travel: 9, width: 38 },
};

/** Two crossing dots inspired by TikTok's loading motion, recolored for OmniTask. */
export function OmniLoader({
  size = 'medium',
  onPrimary = false,
  accessibilityLabel = 'Loading',
}: OmniLoaderProps) {
  const { theme } = useTheme();
  const phase = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const metric = dimensions[size];

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    phase.stopAnimation();
    phase.setValue(0);
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: 720,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, reduceMotion]);

  const firstTranslate = phase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-metric.travel, metric.travel, -metric.travel],
  });
  const secondTranslate = phase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [metric.travel, -metric.travel, metric.travel],
  });
  const firstScale = phase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.72, 1],
  });
  const secondScale = phase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.72, 1, 0.72],
  });
  const primary = onPrimary ? '#FFFFFF' : theme.accent.base;
  const companion = onPrimary ? '#F7D8D0' : theme.accent.warm;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { width: metric.width, height: metric.dot * 1.7 }]}
    >
      <Animated.View
        style={[
          styles.dot,
          {
            width: metric.dot,
            height: metric.dot,
            borderRadius: metric.dot / 2,
            backgroundColor: primary,
            transform: [{ translateX: firstTranslate }, { scale: firstScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: metric.dot,
            height: metric.dot,
            borderRadius: metric.dot / 2,
            backgroundColor: companion,
            transform: [{ translateX: secondTranslate }, { scale: secondScale }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute' },
});
