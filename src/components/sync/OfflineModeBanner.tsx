import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/ui/AppText';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useTheme } from '@/context/ThemeContext';
import { fontFamily } from '@/theme/typography';
import { isOfflineModeVisible } from './offlineMode';

/**
 * A temporary, non-blocking mode strip inspired by Messenger's Basic mode.
 * Its negative safe-area margin lets child screens keep their existing inset
 * without creating a second blank status-bar gap.
 */
export function OfflineModeBanner() {
  const { user, emailVerified, hasSeenOnboarding } = useAuth();
  const sync = useSync();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const visible = Boolean(user && emailVerified && hasSeenOnboarding)
    && isOfflineModeVisible(sync.isConnected, sync.status);

  useEffect(() => {
    if (!visible) setExpanded(false);
  }, [visible]);

  if (!visible) return null;

  const waiting = sync.mutations.filter(mutation => mutation.state !== 'confirmed').length;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          marginBottom: -insets.top,
          backgroundColor: theme.glass.solid,
          borderBottomColor: theme.divider,
        },
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Offline mode"
        accessibilityHint="Shows how offline changes are saved"
        accessibilityState={{ expanded }}
        activeOpacity={0.72}
        onPress={() => setExpanded(value => !value)}
        style={styles.row}
      >
        <View style={styles.mode}>
          <Ionicons name="cloud-offline-outline" size={18} color={theme.semantic.warning} />
          <Text style={[styles.title, { color: theme.content.primary }]}>Offline mode</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.content.secondary}
          />
        </View>
        <Text style={[styles.state, { color: theme.content.secondary }]}>
          {waiting > 0 ? `${waiting} waiting` : 'Saved locally'}
        </Text>
      </TouchableOpacity>

      {expanded ? (
        <View style={[styles.details, { borderTopColor: theme.divider }]}>
          <Text style={[styles.detailsText, { color: theme.content.secondary }]}>
            {waiting > 0
              ? `${waiting} change${waiting === 1 ? '' : 's'} ${waiting === 1 ? 'is' : 'are'} safe on this device and will sync automatically when internet returns.`
              : 'You can keep working. New changes stay on this device and sync automatically when internet returns.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 30,
    elevation: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mode: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  title: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: fontFamily.bold,
  },
  state: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: fontFamily.semibold,
  },
  details: {
    minHeight: 44,
    marginHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  detailsText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fontFamily.medium,
  },
});
