import { fontFamily } from '@/theme/typography';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';

export type OrganizerSection = 'tasks' | 'notes' | 'canvas' | 'events';

interface OrganizerSwitchProps {
  value: OrganizerSection;
  onChange: (value: OrganizerSection) => void;
}

const OPTIONS: Array<{
  value: OrganizerSection;
  label: string;
  icon: 'checkbox-outline' | 'document-text-outline' | 'expand-outline' | 'calendar-outline';
}> = [
  { value: 'tasks', label: 'Tasks', icon: 'checkbox-outline' },
  { value: 'notes', label: 'Notes', icon: 'document-text-outline' },
  { value: 'canvas', label: 'Canvas', icon: 'expand-outline' },
  { value: 'events', label: 'Events', icon: 'calendar-outline' },
];

export function OrganizerSwitch({ value, onChange }: OrganizerSwitchProps) {
  const { theme } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border },
      ]}
    >
      {OPTIONS.map(option => {
        const selected = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Show ${option.label}`}
            activeOpacity={0.82}
            style={[
              styles.option,
              selected && {
                backgroundColor: theme.accent.soft,
                borderColor: theme.glass.highlight,
              },
            ]}
            onPress={() => onChange(option.value)}
          >
            <Ionicons
              name={option.icon}
              size={17}
              color={selected ? theme.accent.base : theme.content.secondary}
            />
            <Text style={[styles.label, { color: selected ? theme.accent.base : theme.content.secondary }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
  },
  option: {
    flex: 1,
    minHeight: 36,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: { fontSize: 11, fontFamily: fontFamily.bold },
});
