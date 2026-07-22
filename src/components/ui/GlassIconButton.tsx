import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { buttonShadow, radii } from '@/theme';

interface Props {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlassIconButton({ name, onPress, accessibilityLabel, active, style }: Props) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.72}
      onPress={onPress}
      style={[
        styles.button,
        buttonShadow,
        {
          backgroundColor: active
            ? theme.dark ? '#3D2A19' : '#FFF0E1'
            : theme.dark ? '#2B2C29' : '#F8F5F0',
        },
        style,
      ]}
    >
      <Ionicons name={name} size={21} color={active ? theme.accent.base : theme.icon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
