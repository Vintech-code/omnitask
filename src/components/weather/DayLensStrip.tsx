import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import type { AppEvent } from '@/types/event';
import type { DayLensInsight } from '@/types/weather';
import { dayLensBadge } from '@/utils/dayLens';
import { fontFamily } from '@/theme/typography';

interface DayLensStripProps {
  events: AppEvent[];
  insights: Record<string, DayLensInsight>;
  isLoading: boolean;
  onOpenEvent: (event: AppEvent) => void;
}

export function DayLensStrip({ events, insights, isLoading, onOpenEvent }: DayLensStripProps) {
  const { theme } = useTheme();
  const selected = useMemo(() => {
    const ranked = events.map(event => ({ event, insight: insights[event.id] })).filter(item => item.insight);
    return ranked.find(item => item.insight.level === 'severe')
      ?? ranked.find(item => item.insight.level === 'advisory')
      ?? ranked[0];
  }, [events, insights]);

  const accent = selected?.insight.level === 'severe' ? theme.semantic.danger
    : selected?.insight.level === 'advisory' ? theme.semantic.warning
      : theme.semantic.info;
  const iconBackground = selected?.insight.level === 'severe'
    ? theme.dark ? '#422624' : '#FCE8E6'
    : selected?.insight.level === 'advisory'
      ? theme.dark ? '#40331D' : '#FBF0D7'
      : theme.dark ? '#22333C' : '#E6F0F4';

  return (
    <TouchableOpacity
      accessibilityRole={selected ? 'button' : undefined}
      accessibilityLabel={selected ? `Day Lens for ${selected.event.title}. ${selected.insight.guidance}` : 'Day Lens weather preparation status'}
      activeOpacity={selected ? 0.76 : 1}
      disabled={!selected}
      onPress={() => selected && onOpenEvent(selected.event)}
      style={[styles.root, { borderTopColor: theme.divider, borderBottomColor: theme.divider }]}
    >
      <View style={[styles.icon, { backgroundColor: iconBackground }]}>
        <Ionicons name={selected?.insight.level === 'severe' ? 'warning-outline' : 'navigate-outline'} size={20} color={accent} />
      </View>
      <View style={styles.copy}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.accent.base }]}>DAY LENS</Text>
          {selected ? <Text style={[styles.badge, { color: accent }]}>{dayLensBadge(selected.insight)}</Text> : null}
        </View>
        {isLoading && !selected ? (
          <View style={styles.loading}><ActivityIndicator size="small" color={theme.accent.base} /><Text style={[styles.body, { color: theme.content.muted }]}>Checking event conditions…</Text></View>
        ) : selected ? (
          <><Text style={[styles.title, { color: theme.content.primary }]} numberOfLines={1}>{selected.event.title}</Text><Text style={[styles.body, { color: theme.content.secondary }]} numberOfLines={2}>{selected.insight.guidance}</Text></>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.content.primary }]}>{events.length ? 'Add locations to plan ahead' : 'Plan around the weather'}</Text>
            <Text style={[styles.body, { color: theme.content.muted }]} numberOfLines={2}>
              {events.length
                ? 'Events with a saved map location can show weather preparation guidance.'
                : 'Add an event with a location to unlock practical weather guidance.'}
            </Text>
          </>
        )}
      </View>
      {selected ? <Ionicons name="chevron-forward" size={18} color={theme.content.muted} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 78, marginBottom: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  copy: { flex: 1, marginRight: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 9, fontFamily: fontFamily.black, letterSpacing: 1.1 },
  badge: { fontSize: 10, fontFamily: fontFamily.extrabold },
  title: { marginTop: 3, fontSize: 14, lineHeight: 18, fontFamily: fontFamily.extrabold },
  body: { marginTop: 2, fontSize: 11, lineHeight: 15, fontFamily: fontFamily.regular },
  loading: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
