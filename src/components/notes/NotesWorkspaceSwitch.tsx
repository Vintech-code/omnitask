import { fontFamily } from '@/theme/typography';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export type NotesWorkspaceMode = 'standard' | 'canvas';

export function NotesWorkspaceSwitch({ value, onChange }: { value: NotesWorkspaceMode; onChange: (value: NotesWorkspaceMode) => void }) {
  const { theme } = useTheme();
  return <View style={[styles.root, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>{([
    ['standard', 'Notes', 'note-text-outline'], ['canvas', 'Canvas', 'vector-square'],
  ] as const).map(([mode, label, icon]) => {
    const active = mode === value;
    return <TouchableOpacity key={mode} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.tab, active && { backgroundColor: theme.glass.solid, borderColor: theme.glass.highlight }]} onPress={() => onChange(mode)}><MaterialCommunityIcons name={icon} size={17} color={active ? theme.accent.base : theme.content.secondary} /><Text style={[styles.label, { color: active ? theme.accent.base : theme.content.secondary }]}>{label}</Text></TouchableOpacity>;
  })}</View>;
}

const styles = StyleSheet.create({ root: { marginHorizontal: 20, marginBottom: 8, padding: 3, minHeight: 44, borderWidth: 1, borderRadius: 16, flexDirection: 'row', gap: 4 }, tab: { flex: 1, minHeight: 36, borderWidth: 1, borderColor: 'transparent', borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, label: { fontSize: 13, fontFamily: fontFamily.extrabold } });
