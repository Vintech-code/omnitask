import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'tonal';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PillButton({ label, onPress, icon, variant = 'primary', disabled, style }: Props) {
  const { theme } = useTheme();
  const primary = variant === 'primary';
  const tonal = variant === 'tonal';
  const color = primary ? '#FFFDF8' : tonal ? theme.accent.base : theme.content.primary;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.78}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: primary ? theme.accent.base : tonal ? theme.accent.soft : theme.glass.secondary,
          borderColor: primary ? theme.accent.base : theme.glass.border,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={color} />}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
});
