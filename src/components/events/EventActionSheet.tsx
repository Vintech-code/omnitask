import { fontFamily } from '@/theme/typography';
import React from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/theme';

type EventActionTone = 'default' | 'accent' | 'danger';

export interface EventSheetAction {
  label: string;
  description?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone?: EventActionTone;
  disabled?: boolean;
  onPress: () => void;
}

interface EventActionSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  actions?: EventSheetAction[];
  closeLabel?: string;
  onClose: () => void;
}

export function EventActionSheet({
  visible,
  title,
  message,
  actions = [],
  closeLabel = 'Cancel',
  onClose,
}: EventActionSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: theme.glass.solid,
              borderColor: theme.glass.border,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.divider }]} />
          <Text style={[styles.title, { color: theme.content.primary }]} numberOfLines={2}>{title}</Text>
          {message ? <Text style={[styles.message, { color: theme.content.secondary }]}>{message}</Text> : null}

          {actions.length > 0 ? (
            <View style={[styles.actionGroup, { borderColor: theme.glass.border }]}>
              {actions.map((action, index) => {
                const color = action.tone === 'danger'
                  ? theme.semantic.danger
                  : action.tone === 'accent'
                    ? theme.accent.base
                    : theme.content.primary;
                return (
                  <TouchableOpacity
                    key={action.label}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: action.disabled }}
                    activeOpacity={0.78}
                    disabled={action.disabled}
                    style={[
                      styles.action,
                      index < actions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.divider },
                      action.disabled && styles.disabled,
                    ]}
                    onPress={action.onPress}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: action.tone === 'danger' ? `${theme.semantic.danger}18` : theme.accent.soft }]}>
                      <Ionicons name={action.icon} size={20} color={color} />
                    </View>
                    <View style={styles.actionCopy}>
                      <Text style={[styles.actionLabel, { color }]}>{action.label}</Text>
                      {action.description ? (
                        <Text style={[styles.actionDescription, { color: theme.content.muted }]}>{action.description}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={theme.content.muted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            style={[styles.closeButton, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}
            onPress={onClose}
          >
            <Text style={[styles.closeLabel, { color: theme.content.primary }]}>{closeLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 21, lineHeight: 27, fontFamily: fontFamily.bold },
  message: { fontSize: 14, lineHeight: 20, marginTop: 5 },
  actionGroup: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden', marginTop: 18 },
  action: { minHeight: 68, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  disabled: { opacity: 0.42 },
  iconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionCopy: { flex: 1, paddingVertical: 10 },
  actionLabel: { fontSize: 15, fontFamily: fontFamily.bold },
  actionDescription: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  closeButton: { minHeight: 50, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  closeLabel: { fontSize: 15, fontFamily: fontFamily.bold },
});
