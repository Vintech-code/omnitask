import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { AppBackground } from './AppBackground';

interface SkeletonBlockProps {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock({ width = '100%', height, radius = 12, style }: SkeletonBlockProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.46)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.64);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.82, duration: 950, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.46, duration: 950, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, opacity, backgroundColor: theme.dark ? '#3A3B38' : '#D9DAD6' },
        style,
      ]}
    />
  );
}

export type SkeletonVariant = 'dashboard' | 'list' | 'form' | 'profile';

export function ScreenSkeleton({ variant = 'list' }: { variant?: SkeletonVariant }) {
  const rows = useMemo(() => variant === 'form' ? 4 : 3, [variant]);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBackground />
      <View style={styles.content}>
        <View style={styles.header}>
          <SkeletonBlock width={44} height={44} radius={22} />
          <SkeletonBlock width={variant === 'profile' ? '42%' : '52%'} height={26} radius={8} />
          <SkeletonBlock width={44} height={44} radius={22} />
        </View>

        {variant === 'dashboard' && (
          <>
            <SkeletonBlock width="48%" height={18} radius={7} style={styles.smallGap} />
            <SkeletonBlock width="72%" height={32} radius={9} />
            <SkeletonBlock height={76} radius={22} style={styles.sectionGap} />
            <View style={styles.twoColumn}>
              <SkeletonBlock width="48%" height={150} radius={22} />
              <SkeletonBlock width="48%" height={150} radius={22} />
            </View>
          </>
        )}

        {variant === 'profile' && (
          <SkeletonBlock height={122} radius={26} style={styles.sectionGap} />
        )}

        {variant === 'form' && (
          <SkeletonBlock height={62} radius={18} style={styles.sectionGap} />
        )}

        <View style={styles.sectionGap}>
          <SkeletonBlock width="34%" height={20} radius={7} style={styles.titleGap} />
          {Array.from({ length: rows }, (_, index) => (
            <SkeletonBlock key={index} height={variant === 'form' ? 58 : 76} radius={20} style={styles.rowGap} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smallGap: { marginTop: 24, marginBottom: 8 },
  sectionGap: { marginTop: 24 },
  titleGap: { marginBottom: 14 },
  rowGap: { marginBottom: 10 },
  twoColumn: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
});
