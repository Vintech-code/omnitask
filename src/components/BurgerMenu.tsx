import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * BurgerMenu button — tap to navigate to ProfileScreen.
 */
export function BurgerMenu({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(scale, { toValue: 0.82, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={1}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="menu-outline" size={26} color={theme.iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * PulsingFAB — a blue FAB with an idle pulsing glow ring + press scale.
 */
export function PulsingFAB({ onPress, size = 56 }: { onPress: () => void; size?: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.55)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  // Idle loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.45, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0,    duration: 900, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.55, duration: 900, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const pressIn  = () => Animated.spring(pressScale, { toValue: 0.88, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  const r = size / 2;

  return (
    <View style={[styles.fabWrap, { width: size, height: size }]}>
      {/* Pulsing ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          {
            width: size, height: size, borderRadius: r,
            transform: [{ scale: pulse }],
            opacity: pulseOpacity,
          },
        ]}
      />
      {/* FAB */}
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <TouchableOpacity
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={onPress}
          activeOpacity={1}
          style={[styles.fab, { width: size, height: size, borderRadius: r }]}
        >
          <Ionicons name="add" size={size * 0.5} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const BLUE = '#4A90D9';

const styles = StyleSheet.create({
  fabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: BLUE,
  },
  fab: {
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});
