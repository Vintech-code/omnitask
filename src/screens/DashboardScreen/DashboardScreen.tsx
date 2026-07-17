import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useEvents } from '@/context/EventStore';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useAlarmStore } from '@/context/AlarmStore';
import { useTaskStore } from '@/context/TaskStore';
import { AppBackground, GlassCard, GlassIconButton, PillButton, ScreenSkeleton } from '@/components/ui';
import { hydrateFocusSessions } from '@/services/FocusStatsService';
import { eventStart, formatEventSchedule } from '@/utils/eventDate';
import { styles } from './styles';

const priorityColor = (priority: string, theme: ReturnType<typeof useTheme>['theme']) => ({
  High: theme.semantic.danger,
  Medium: theme.semantic.warning,
  Low: theme.semantic.success,
}[priority] ?? theme.accent.base);

export default function DashboardScreen({ navigation }: any) {
  const { events, isLoading: eventsLoading } = useEvents();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { alarms, isLoading: alarmsLoading } = useAlarmStore();
  const { notes, isLoading: notesLoading } = useTaskStore();
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const initial = firstName.charAt(0).toUpperCase();

  const [sessions, setSessions] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  const upcomingEvents = useMemo(() => events
    .map(event => ({ event, date: eventStart(event) }))
    .filter(item => item.date && item.date.getTime() >= now.getTime())
    .sort((left, right) => left.date!.getTime() - right.date!.getTime())
    .slice(0, 6)
    .map(item => item.event), [events, now]);

  useEffect(() => {
    if (user) void hydrateFocusSessions(user.id, setSessions);
  }, [user?.id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const nextAlarm = useMemo(() => {
    const active = alarms.filter(a => a.active);
    const toMinutes = (alarm: typeof active[0]) => {
      let hour = alarm.hour;
      if (alarm.period === 'PM' && hour !== 12) hour += 12;
      if (alarm.period === 'AM' && hour === 12) hour = 0;
      return hour * 60 + alarm.minute;
    };
    return [...active].sort((a, b) => toMinutes(a) - toMinutes(b))[0] ?? null;
  }, [alarms]);

  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index - 3);
    return date;
  }), [now.toDateString()]);

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => b.timestamp - a.timestamp).slice(0, 4),
    [notes],
  );

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const nextAlarmLabel = nextAlarm
    ? `${String(nextAlarm.hour).padStart(2, '0')}:${String(nextAlarm.minute).padStart(2, '0')} ${nextAlarm.period}`
    : '--:--';

  const onRefresh = () => {
    setRefreshing(true);
    if (user) void hydrateFocusSessions(user.id, setSessions);
    setTimeout(() => setRefreshing(false), 650);
  };

  if (eventsLoading || alarmsLoading || notesLoading) {
    return <ScreenSkeleton variant="dashboard" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.base} />}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.content.secondary }]}>{greeting}</Text>
            <Text style={[styles.title, { color: theme.content.primary }]}>{firstName}!</Text>
          </View>
          <View style={styles.headerActions}>
            <GlassIconButton name="search-outline" onPress={() => navigation.navigate('Search')} accessibilityLabel="Search" />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => navigation.navigate('Profile')}
              style={[styles.avatar, { backgroundColor: theme.accent.base, borderColor: theme.glass.border }]}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dateHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.content.primary }]}>Plan your day</Text>
            <Text style={[styles.dateLabel, { color: theme.content.muted }]}>{dateLabel}</Text>
          </View>
          <GlassIconButton name="stats-chart-outline" onPress={() => navigation.navigate('Stats')} accessibilityLabel="View statistics" />
        </View>

        <GlassCard variant="subtle" padding={8} style={styles.weekCard} contentStyle={styles.weekRow}>
          {week.map(date => {
            const selected = date.toDateString() === now.toDateString();
            return (
              <View key={date.toISOString()} style={[styles.day, selected && { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
                <Text style={[styles.dayName, { color: selected ? theme.accent.base : theme.content.muted }]}>
                  {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                </Text>
                <Text style={[styles.dayNumber, { color: theme.content.primary }]}>{date.getDate()}</Text>
                <View style={[styles.dayDot, { backgroundColor: selected ? theme.accent.base : 'transparent' }]} />
              </View>
            );
          })}
        </GlassCard>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.content.primary }]}>Upcoming events</Text>
          <TouchableOpacity style={styles.inlineAction} onPress={() => navigation.navigate('Tasks', { section: 'events' })}>
            <Text style={[styles.inlineActionText, { color: theme.accent.base }]}>See all</Text>
            <Ionicons name="arrow-forward" size={15} color={theme.accent.base} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {upcomingEvents.length ? upcomingEvents.map(event => (
            <TouchableOpacity key={event.id} activeOpacity={0.82} onPress={() => navigation.navigate('EventDetail', { event })}>
              <GlassCard style={styles.eventCard} padding={16}>
                <View style={styles.eventTopRow}>
                  <View style={[styles.eventIcon, { backgroundColor: theme.accent.soft }]}>
                    <Ionicons name="calendar-outline" size={18} color={theme.accent.base} />
                  </View>
                  <View style={[styles.priorityDot, { backgroundColor: priorityColor(event.priority, theme) }]} />
                </View>
                <Text style={[styles.eventTitle, { color: theme.content.primary }]} numberOfLines={2}>{event.title}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color={theme.content.muted} />
                  <Text style={[styles.metaText, { color: theme.content.muted }]} numberOfLines={1}>
                    {formatEventSchedule(event)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name={event.location ? 'location-outline' : 'pricetag-outline'} size={14} color={theme.content.muted} />
                  <Text style={[styles.metaText, { color: theme.content.muted }]} numberOfLines={1}>
                    {event.location || event.category}
                  </Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          )) : (
            <GlassCard style={styles.emptyEvent} variant="subtle" padding={18}>
              <View style={[styles.eventIcon, { backgroundColor: theme.accent.soft }]}>
                <Ionicons name="calendar-outline" size={20} color={theme.accent.base} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.content.primary }]}>A clear day</Text>
              <Text style={[styles.emptyCopy, { color: theme.content.muted }]}>Create an event when you're ready.</Text>
              <PillButton label="Add event" icon="add" variant="tonal" onPress={() => navigation.navigate('CreateEvent')} />
            </GlassCard>
          )}
        </ScrollView>

        <View style={styles.metricsRow}>
          <TouchableOpacity style={styles.metricTouch} activeOpacity={0.82} onPress={() => navigation.navigate('Focus')}>
            <GlassCard style={styles.metricCard} padding={16}>
              <View style={styles.metricTop}>
                <View style={[styles.metricIcon, { backgroundColor: theme.accent.soft }]}>
                  <Ionicons name="timer-outline" size={20} color={theme.accent.base} />
                </View>
                <Text style={[styles.metricKicker, { color: theme.content.secondary }]}>Focus</Text>
              </View>
              <Text style={[styles.metricValue, { color: theme.content.primary }]}>25:00</Text>
              <Text style={[styles.metricMeta, { color: theme.content.muted }]}>{sessions} sessions completed</Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
                <View style={[styles.progressFill, { width: `${Math.min(sessions / 8, 1) * 100}%`, backgroundColor: theme.accent.base }]} />
              </View>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.metricTouch} activeOpacity={0.82} onPress={() => navigation.navigate('Alarm')}>
            <GlassCard style={styles.metricCard} padding={16}>
              <View style={styles.metricTop}>
                <View style={[styles.metricIcon, { backgroundColor: theme.accent.soft }]}>
                  <Ionicons name="alarm-outline" size={20} color={theme.accent.base} />
                </View>
                <Text style={[styles.metricKicker, { color: theme.content.secondary }]}>Next alarm</Text>
              </View>
              <Text style={[styles.alarmValue, { color: theme.content.primary }]} numberOfLines={1}>{nextAlarmLabel}</Text>
              <Text style={[styles.metricMeta, { color: theme.content.muted }]} numberOfLines={1}>{nextAlarm?.label || 'No active alarms'}</Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
                <View style={[styles.progressFill, { width: nextAlarm ? '68%' : '0%', backgroundColor: theme.accent.base }]} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.content.primary }]}>Agenda</Text>
            <Text style={[styles.sectionSub, { color: theme.content.muted }]}>{notes.length} notes and task lists</Text>
          </View>
          <PillButton label="Add" icon="add-circle-outline" variant="secondary" onPress={() => navigation.navigate('Tasks', { section: 'notes' })} style={styles.addButton} />
        </View>

        <GlassCard padding={0} style={styles.agendaCard}>
          {recentNotes.length ? recentNotes.map((note, index) => {
            const done = note.todos?.length ? note.todos.filter(todo => todo.done).length : 0;
            return (
              <TouchableOpacity
                key={note.id}
                style={[styles.agendaRow, index < recentNotes.length - 1 && { borderBottomColor: theme.divider, borderBottomWidth: 1 }]}
                activeOpacity={0.72}
                onPress={() => navigation.navigate('Tasks', { section: 'notes' })}
              >
                <View style={[styles.agendaIcon, { backgroundColor: theme.accent.soft }]}>
                  <Ionicons name={note.todos?.length ? 'checkbox-outline' : 'document-text-outline'} size={20} color={theme.accent.base} />
                </View>
                <View style={styles.agendaCopy}>
                  <Text style={[styles.agendaTitle, { color: theme.content.primary }]} numberOfLines={1}>{note.title || 'Untitled note'}</Text>
                  <Text style={[styles.agendaMeta, { color: theme.content.muted }]} numberOfLines={1}>
                    {note.category}{note.todos?.length ? ` · ${done}/${note.todos.length} complete` : ` · ${note.date}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={theme.content.muted} />
              </TouchableOpacity>
            );
          }) : (
            <View style={styles.agendaEmpty}>
              <Text style={[styles.emptyTitle, { color: theme.content.primary }]}>Nothing on your list</Text>
              <Text style={[styles.emptyCopy, { color: theme.content.muted }]}>Add a note or checklist to get started.</Text>
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
