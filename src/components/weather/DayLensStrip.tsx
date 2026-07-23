import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText as Text } from '@/components/ui/AppText';
import { OmniLoader } from '@/components/ui/OmniLoader';
import { useTheme } from '@/context/ThemeContext';
import { fontFamily } from '@/theme/typography';
import type { AppEvent } from '@/types/event';
import type { DayLensInsight } from '@/types/weather';
import { dayLensBadge } from '@/utils/dayLens';

interface DayLensStripProps {
  events: AppEvent[];
  insights: Record<string, DayLensInsight>;
  isLoading: boolean;
  onOpenEvent: (event: AppEvent) => void;
}

export function DayLensStrip({ events, insights, isLoading, onOpenEvent }: DayLensStripProps) {
  const { theme } = useTheme();
  const selected = useMemo(() => {
    const ranked = events
      .map(event => ({ event, insight: insights[event.id] }))
      .filter((item): item is { event: AppEvent; insight: DayLensInsight } => Boolean(item.insight));
    return ranked.find(item => item.insight.level === 'severe')
      ?? ranked.find(item => item.insight.level === 'advisory')
      ?? ranked[0];
  }, [events, insights]);

  const severe = selected?.insight.level === 'severe';
  const advisory = selected?.insight.level === 'advisory';
  const statusColor = severe
    ? theme.semantic.danger
    : advisory
      ? theme.semantic.warning
      : theme.accent.base;
  const iconBackground = severe || advisory
    ? theme.iconTile.coral
    : theme.iconTile.blue;

  return (
    <TouchableOpacity
      accessibilityRole={selected ? 'button' : undefined}
      accessibilityLabel={selected ? `Day Lens for ${selected.event.title}. ${selected.insight.guidance}` : 'Day Lens weather preparation status'}
      activeOpacity={selected ? 0.76 : 1}
      disabled={!selected}
      onPress={() => selected && onOpenEvent(selected.event)}
      style={[styles.root, { borderColor: theme.glass.border }]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={theme.dark
          ? ['rgba(42,62,63,0.96)', 'rgba(24,38,39,0.96)']
          : ['rgba(255,255,255,0.96)', 'rgba(196,224,225,0.72)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: iconBackground }]}>
          <Ionicons
            name={severe ? 'warning-outline' : 'compass-outline'}
            size={23}
            color={theme.iconTile.foreground}
          />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.label, { color: theme.content.primary }]}>Day Lens</Text>
          <Text style={[styles.subtitle, { color: theme.content.secondary }]}>Weather-aware planning for your events</Text>
        </View>
        {selected ? (
          <View style={[styles.badge, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{dayLensBadge(selected.insight)}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.divider }]} />
      <View style={styles.bodyRow}>
        <View style={styles.copy}>
          {isLoading && !selected ? (
            <View style={styles.loading}>
              <OmniLoader size="small" accessibilityLabel="Checking event conditions" />
              <Text style={[styles.body, { color: theme.content.secondary }]}>Checking event conditions…</Text>
            </View>
          ) : selected ? (
            <>
              <Text style={[styles.title, { color: theme.content.primary }]} numberOfLines={1}>{selected.event.title}</Text>
              <Text style={[styles.body, { color: theme.content.secondary }]} numberOfLines={3}>{selected.insight.guidance}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: theme.content.primary }]}>{events.length ? 'Add locations to plan ahead' : 'Plan around the weather'}</Text>
              <Text style={[styles.body, { color: theme.content.secondary }]} numberOfLines={3}>
                {events.length
                  ? 'Events with a saved map location can show weather preparation guidance.'
                  : 'Add an event with a location to unlock practical weather guidance.'}
              </Text>
            </>
          )}
        </View>
        {selected ? <Ionicons name="chevron-forward" size={20} color={theme.content.secondary} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 132, marginTop: 2, borderRadius: 22, borderWidth: 1, overflow: 'hidden', padding: 15 },
  header: { minHeight: 46, flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  headingCopy: { flex: 1, minWidth: 0 },
  label: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.extrabold },
  subtitle: { marginTop: 1, fontSize: 12, lineHeight: 16, fontFamily: fontFamily.medium },
  badge: { minHeight: 30, maxWidth: 112, marginLeft: 8, borderRadius: 15, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.extrabold },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 11 },
  bodyRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.extrabold },
  body: { marginTop: 3, fontSize: 13, lineHeight: 18, fontFamily: fontFamily.medium },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
});
