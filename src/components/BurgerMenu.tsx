import React, { useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
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

