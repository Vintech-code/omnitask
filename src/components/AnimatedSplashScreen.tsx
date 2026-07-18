import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = { onFinish: () => void };

export function AnimatedSplashScreen({ onFinish }: Props) {
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(10)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 72, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(titleOpacity, { toValue: 1, duration: 360, delay: 180, useNativeDriver: true }),
      Animated.timing(titleY, { toValue: 0, duration: 360, delay: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(orbit, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]);

    Animated.sequence([
      entrance,
      Animated.delay(180),
      Animated.timing(screenOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onFinish();
    });
  }, [logoOpacity, logoScale, onFinish, orbit, screenOpacity, titleOpacity, titleY]);

  const rotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '325deg'] });

  return (
    <Animated.View pointerEvents="auto" style={[styles.container, { opacity: screenOpacity }]}>
      <LinearGradient
        colors={['#F8F8F5', '#F3F4F2', '#EEF2F4']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.brand}>
        <View style={styles.logoStage}>
          <Animated.View style={[styles.orbit, { transform: [{ rotate: rotation }] }]}>
            <View style={styles.orbitDot} />
          </Animated.View>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
            <Image source={require('../../assets/omnitasklogo.png')} resizeMode="contain" style={styles.logo} />
          </Animated.View>
        </View>
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}>
          <Text style={styles.title}>OmniTask</Text>
          <Text style={styles.subtitle}>Everything in its time.</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 1000, alignItems: 'center', justifyContent: 'center' },
  brand: { alignItems: 'center', marginTop: -24 },
  logoStage: { width: 154, height: 154, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  logo: { width: 124, height: 124 },
  orbit: { position: 'absolute', width: 148, height: 148, borderRadius: 74, borderWidth: 1, borderColor: 'rgba(255,122,0,0.18)' },
  orbitDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF7A00', top: 11, right: 18 },
  title: { textAlign: 'center', color: '#171717', fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { marginTop: 5, textAlign: 'center', color: '#747671', fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.2 },
});
