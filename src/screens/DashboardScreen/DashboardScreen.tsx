import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, type StyleProp, TouchableOpacity, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AppBackground, GlassCard, PillButton, ScreenSkeleton } from '@/components/ui';
import { DayLensStrip } from '@/components/weather';
import { buttonShadow } from '@/theme';
import { useAlarmStore, type Alarm } from '@/context/AlarmStore';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventStore';
import { useTaskStore } from '@/context/TaskStore';
import { useTheme } from '@/context/ThemeContext';
import { useCurrentWeather } from '@/hooks/useCurrentWeather';
import { useDayLens } from '@/hooks/useDayLens';
import { hydrateFocusSessions } from '@/services/FocusStatsService';
import type { Note } from '@/types/note';
import type { DayLensInsight } from '@/types/weather';
import { eventOccurrenceStartOnDate, eventStart } from '@/utils/eventDate';
import { weatherConditionLabel } from '@/utils/weather';
import { weatherArtwork } from '@/components/weather/weatherArtwork';
import { styles } from './styles';

type DashboardNavigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

type DashboardTask = {
  note: Note;
  item: NonNullable<Note['todos']>[number];
};

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + amount);
  return result;
}

function alarmMinutes(alarm: Alarm) {
  let hour = alarm.hour;
  if (alarm.period === 'PM' && hour !== 12) hour += 12;
  if (alarm.period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + alarm.minute;
}

function nextAlarmOccurrence(alarm: Alarm, now: Date): Date | null {
  if (!alarm.active) return null;
  if (alarm.scheduledFor) {
    const scheduled = new Date(alarm.scheduledFor);
    return scheduled.getTime() > now.getTime() ? scheduled : null;
  }

  const selectedDays = alarm.days
    .map((selected, index) => selected ? index : -1)
    .filter(index => index >= 0);

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = addDays(now, offset);
    const minutes = alarmMinutes(alarm);
    candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    const dayMatches = selectedDays.length === 0 || selectedDays.includes(candidate.getDay());
    if (dayMatches && candidate.getTime() > now.getTime()) return candidate;
  }
  return null;
}

function nextAlarmFrom(alarms: Alarm[], now: Date) {
  return alarms
    .map(alarm => ({ alarm, occurrence: nextAlarmOccurrence(alarm, now) }))
    .filter((value): value is { alarm: Alarm; occurrence: Date } => Boolean(value.occurrence))
    .sort((left, right) => left.occurrence.getTime() - right.occurrence.getTime())[0] ?? null;
}

function taskMeta(note: Note) {
  return note.tags[0]?.label || note.category || 'Checklist';
}

function DashboardGlyph({
  name,
  color,
  tint,
  size = 23,
  style,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const backgroundColor = color === theme.semantic.success
    ? theme.dark ? '#26371F' : '#EAF5DE'
    : color === theme.semantic.danger
      ? theme.dark ? '#422624' : '#FCE8E6'
      : color === theme.semantic.warning
        ? theme.dark ? '#40331D' : '#FBF0D7'
        : color === theme.semantic.info
          ? theme.dark ? '#22333C' : '#E6F0F4'
          : color === theme.accent.base
            ? theme.dark ? '#3D2A19' : '#FFF0E1'
            : theme.dark ? '#2B2C29' : '#F2F1ED';
  return (
    <View
      style={[
        styles.glyphSurface,
        { backgroundColor },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

function SectionHeading({
  title,
  subtitle,
  action,
  onPress,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={[styles.sectionTitle, { color: theme.content.primary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: theme.content.muted }]}>{subtitle}</Text> : null}
      </View>
      {action && onPress ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${action} ${title}`}
          activeOpacity={0.76}
          onPress={onPress}
          style={styles.sectionAction}
        >
          <Text style={[styles.sectionActionText, { color: theme.accent.base }]}>{action}</Text>
          <Ionicons name="arrow-forward" size={13} color={theme.accent.base} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function DashboardScreen({ navigation }: { navigation: DashboardNavigation }) {
  const { width } = useWindowDimensions();
  const { events, isLoading: eventsLoading } = useEvents();
  const { theme } = useTheme();
  const { user, profilePhoto } = useAuth();
  const { alarms, isLoading: alarmsLoading } = useAlarmStore();
  const { notes, updateNote, isLoading: notesLoading } = useTaskStore();
  const currentWeather = useCurrentWeather();

  const [sessions, setSessions] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [dayLensRefresh, setDayLensRefresh] = useState(0);

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';
  const initial = firstName.charAt(0).toUpperCase();
  const greeting = now.getHours() < 12
    ? 'Good morning'
    : now.getHours() < 18
      ? 'Good afternoon'
      : 'Good evening';

  const upcomingEvents = useMemo(() => events
    .map(event => ({ event, date: eventStart(event) }))
    .filter(value => value.date && value.date.getTime() >= now.getTime())
    .sort((left, right) => left.date!.getTime() - right.date!.getTime())
    .slice(0, 8)
    .map(value => value.event), [events, now]);
  const dayLens = useDayLens(upcomingEvents, dayLensRefresh);

  const schedule = useMemo(() => events
    .map(event => ({ event, occurrence: eventOccurrenceStartOnDate(event, now) }))
    .filter((item): item is { event: typeof events[number]; occurrence: Date } => Boolean(item.occurrence))
    .sort((left, right) => left.occurrence.getTime() - right.occurrence.getTime())
    .slice(0, 5)
    .map(item => item.event), [events, now]);

  const tasks = useMemo<DashboardTask[]>(() => notes
    .filter(note => !note.archived)
    .flatMap(note => (note.todos ?? []).filter(item => !item.done).map(item => ({ note, item })))
    .slice(0, 4), [notes]);

  const nextAlarm = useMemo(() => nextAlarmFrom(alarms, now), [alarms, now]);
  const selectedInsight = useMemo(() => {
    const values = upcomingEvents
      .map(event => ({ event, insight: dayLens.insights[event.id] }))
      .filter((value): value is { event: typeof upcomingEvents[number]; insight: DayLensInsight } => Boolean(value.insight));
    return values.find(value => value.insight.level === 'severe')
      ?? values.find(value => value.insight.level === 'advisory')
      ?? values[0]
      ?? null;
  }, [dayLens.insights, upcomingEvents]);

  useEffect(() => {
    if (user) void hydrateFocusSessions(user.id, setSessions);
  }, [user?.id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setNow(new Date());
    setDayLensRefresh(value => value + 1);
    if (user) void hydrateFocusSessions(user.id, setSessions);
    void currentWeather.refresh().finally(() => setRefreshing(false));
  };

  const toggleTask = (task: DashboardTask) => {
    updateNote({
      ...task.note,
      updatedAt: Date.now(),
      todos: task.note.todos?.map(item => item.id === task.item.id
        ? { ...item, done: true, completedAt: Date.now() }
        : item),
    });
  };

  const openTasks = () => navigation.navigate('Tasks', { section: 'notes' });
  const createChecklist = () => navigation.navigate('Tasks', { section: 'notes', createType: 'checklist', createRequest: Date.now() });
  const openEvents = () => navigation.navigate('Tasks', { section: 'events' });
  const scheduleTitle = "Today's schedule";

  if (eventsLoading || alarmsLoading || notesLoading) {
    return <ScreenSkeleton variant="dashboard" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBackground weather={currentWeather.weather} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent.base}
            colors={[theme.accent.base]}
          />
        )}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.greeting, { color: theme.accent.base }]}>{greeting},</Text>
            <Text style={[styles.name, { color: theme.content.primary }]} numberOfLines={1}>{firstName}!</Text>
            <Text style={[styles.encouragement, { color: theme.content.secondary }]}>Make today count. You’ve got this!</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => navigation.navigate('Profile')}
              style={styles.avatar}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarPhoto} />
              ) : (
                <>
                  <LinearGradient
                    colors={theme.dark
                      ? ['rgba(255,255,255,0.14)', 'rgba(255,122,0,0.24)']
                      : ['rgba(255,255,255,0.92)', 'rgba(255,211,168,0.82)']}
                    start={{ x: 0.15, y: 0.08 }}
                    end={{ x: 0.85, y: 1 }}
                    style={styles.avatarGradient}
                  />
                  <Text style={[styles.avatarText, { color: theme.content.primary }]}>{initial}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dateLine}>
          <DashboardGlyph name="calendar-outline" color={theme.accent.base} tint={theme.accent.soft} size={18} style={styles.dateIcon} />
          <Text style={[styles.fullDate, { color: theme.content.primary }]}>
            {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

        <GlassCard style={styles.weatherCard} padding={0}>
          {currentWeather.status === 'loading' || currentWeather.status === 'checking-permission' ? (
            <View style={styles.weatherState}>
              <ActivityIndicator color={theme.accent.base} />
              <Text style={[styles.weatherStateText, { color: theme.content.secondary }]}>Checking your local forecast…</Text>
            </View>
          ) : currentWeather.status === 'permission-required' ? (
            <View style={styles.weatherState}>
              <DashboardGlyph name="location-outline" color={theme.accent.base} tint={theme.accent.soft} size={21} style={styles.weatherStateIcon} />
              <View style={styles.weatherStateCopy}>
                <Text style={[styles.weatherStateTitle, { color: theme.content.primary }]}>Local weather is off</Text>
                <Text style={[styles.weatherStateText, { color: theme.content.secondary }]}>Enable location for your forecast.</Text>
              </View>
              <PillButton label="Enable" variant="tonal" onPress={() => void currentWeather.requestPermission()} style={styles.weatherAction} />
            </View>
          ) : currentWeather.weather ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open full weather forecast"
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Weather')}
              style={styles.weatherReady}
            >
              <Image
                accessibilityIgnoresInvertColors
                accessibilityLabel={`${weatherConditionLabel(currentWeather.weather.weatherCode)} illustration`}
                source={weatherArtwork(currentWeather.weather.weatherCode, currentWeather.weather.isDay)}
                resizeMode="contain"
                style={styles.weatherArtwork}
              />
              <Text style={[styles.temperature, { color: theme.content.primary }]}>{Math.round(currentWeather.weather.temperatureC)}°</Text>
              <View style={styles.weatherCondition}>
                <Text style={[styles.conditionLabel, { color: theme.content.primary }]}>{weatherConditionLabel(currentWeather.weather.weatherCode)}</Text>
                <Text style={[styles.feelsLike, { color: theme.content.muted }]}>Feels like {Math.round(currentWeather.weather.apparentTemperatureC ?? currentWeather.weather.temperatureC)}°</Text>
              </View>
              {width >= 380 ? (
                <>
                  <View style={[styles.weatherDivider, { backgroundColor: theme.divider }]} />
                  <View style={styles.weatherDetail}>
                    <Ionicons name="rainy-outline" size={16} color={theme.content.muted} />
                    <Text style={[styles.weatherDetailLabel, { color: theme.content.muted }]}>Rain</Text>
                    <Text style={[styles.weatherDetailValue, { color: theme.content.primary }]}>{Math.round(currentWeather.weather.precipitationProbability)}%</Text>
                  </View>
                  <View style={styles.weatherDetail}>
                    <Ionicons name="speedometer-outline" size={16} color={theme.content.muted} />
                    <Text style={[styles.weatherDetailLabel, { color: theme.content.muted }]}>Wind</Text>
                    <Text style={[styles.weatherDetailValue, { color: theme.content.primary }]}>{Math.round(currentWeather.weather.windSpeedKmh)} km/h</Text>
                  </View>
                </>
              ) : null}
              <DashboardGlyph name="chevron-forward" color={theme.content.primary} tint={theme.glass.secondary} size={16} style={styles.weatherChevron} />
            </TouchableOpacity>
          ) : (
            <View style={styles.weatherState}>
              <View style={styles.weatherStateCopy}>
                <Text style={[styles.weatherStateTitle, { color: theme.content.primary }]}>Forecast unavailable</Text>
                <Text style={[styles.weatherStateText, { color: theme.content.secondary }]} numberOfLines={2}>{currentWeather.error || 'Try again when you are online.'}</Text>
              </View>
              <PillButton label="Retry" variant="tonal" onPress={() => void currentWeather.refresh()} style={styles.weatherAction} />
            </View>
          )}
        </GlassCard>

        <DayLensStrip
          events={upcomingEvents}
          insights={dayLens.insights}
          isLoading={dayLens.isLoading}
          onOpenEvent={event => navigation.navigate('EventDetail', { event })}
        />

        <View style={styles.overviewRow}>
          <GlassCard style={styles.overviewCard} padding={0}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open alarms"
              activeOpacity={0.78}
              onPress={() => navigation.navigate('Alarm')}
              style={styles.overviewItem}
            >
              <DashboardGlyph name="alarm-outline" color={theme.accent.base} tint={theme.accent.soft} size={24} style={styles.overviewIcon} />
              <View style={styles.overviewCopy}>
                <Text style={[styles.overviewLabel, { color: theme.content.secondary }]}>Next alarm</Text>
                <Text style={[styles.overviewValue, { color: theme.content.primary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {nextAlarm ? nextAlarm.occurrence.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--:--'}
                </Text>
                <Text style={[styles.overviewMeta, { color: theme.content.muted }]} numberOfLines={1}>
                  {nextAlarm ? `${nextAlarm.alarm.label || 'Alarm'} · ${nextAlarm.occurrence.toLocaleDateString([], { weekday: 'short' })}` : 'No active alarms'}
                </Text>
              </View>
            </TouchableOpacity>
          </GlassCard>
          <GlassCard style={styles.overviewCard} padding={0}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open focus timer"
              activeOpacity={0.78}
              onPress={() => navigation.navigate('Focus')}
              style={styles.overviewItem}
            >
              <DashboardGlyph name="leaf-outline" color={theme.semantic.success} tint={`${theme.semantic.success}24`} size={24} style={styles.overviewIcon} />
              <View style={styles.overviewCopy}>
                <Text style={[styles.overviewLabel, { color: theme.content.secondary }]}>Focus session</Text>
                <Text style={[styles.overviewValue, { color: theme.content.primary }]}>25:00</Text>
                <Text style={[styles.overviewMeta, { color: theme.content.muted }]} numberOfLines={1}>{sessions} sessions completed</Text>
              </View>
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={styles.planningStack}>
          <GlassCard style={styles.sectionCard} padding={14}>
            <SectionHeading title={scheduleTitle} subtitle="Events happening today" action="See all" onPress={openEvents} />
            {schedule.length ? schedule.map((event, index) => (
              <TouchableOpacity
                key={event.id}
                accessibilityRole="button"
                onPress={() => navigation.navigate('EventDetail', { event })}
                style={styles.timelineRow}
              >
                <Text style={[styles.timelineTime, { color: index === 0 ? theme.accent.base : theme.content.secondary }]}>{event.allDay ? 'All day' : event.startTime}</Text>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, { backgroundColor: index === 0 ? theme.accent.base : theme.glass.solid, borderColor: index === 0 ? theme.accent.base : theme.content.muted }]} />
                  {index < schedule.length - 1 ? <View style={[styles.timelineLine, { backgroundColor: theme.divider }]} /> : null}
                </View>
                <View style={styles.timelineCopy}>
                  <Text style={[styles.timelineTitle, { color: theme.content.primary }]} numberOfLines={1}>{event.title}</Text>
                  <Text style={[styles.timelineMeta, { color: theme.content.muted }]} numberOfLines={1}>{event.location || event.category}</Text>
                </View>
              </TouchableOpacity>
            )) : (
              <View style={styles.compactEmpty}>
                <DashboardGlyph name="calendar-outline" color={theme.accent.base} tint={theme.accent.soft} size={23} style={styles.emptyIcon} />
                <View style={styles.emptyCopy}>
                  <Text style={[styles.emptyTitle, { color: theme.content.primary }]}>Your day is open</Text>
                  <Text style={[styles.emptyText, { color: theme.content.muted }]}>Add an event when you’re ready.</Text>
                </View>
                <PillButton label="Add event" icon="add" variant="tonal" onPress={() => navigation.navigate('CreateEvent')} style={styles.emptyAction} />
              </View>
            )}
          </GlassCard>

          <GlassCard style={styles.sectionCard} padding={14}>
            <SectionHeading title="Open checklist items" subtitle="Unfinished items from your Notes" action="View all" onPress={openTasks} />
            {tasks.length ? tasks.map((task, index) => (
              <View key={`${task.note.id}_${task.item.id}`} style={[styles.taskRow, index > 0 && { borderTopColor: theme.divider, borderTopWidth: 1 }]}>
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: false }}
                  accessibilityLabel={`Complete ${task.item.text}`}
                  onPress={() => toggleTask(task)}
                  style={[styles.checkbox, { borderColor: theme.content.muted }]}
                />
                <TouchableOpacity style={styles.taskCopy} onPress={openTasks} activeOpacity={0.7}>
                  <Text style={[styles.taskTitle, { color: theme.content.primary }]} numberOfLines={1}>{task.item.text}</Text>
                  <Text style={[styles.taskMeta, { color: task.note.pinned ? theme.accent.base : theme.content.muted }]}>{taskMeta(task.note)}</Text>
                </TouchableOpacity>
                {task.note.pinned ? <Ionicons name="star" size={16} color={theme.accent.base} /> : null}
              </View>
            )) : (
              <View style={styles.compactEmpty}>
                <DashboardGlyph name="checkmark" color={theme.semantic.success} tint={`${theme.semantic.success}24`} size={23} style={styles.emptyIcon} />
                <View style={styles.emptyCopy}>
                  <Text style={[styles.emptyTitle, { color: theme.content.primary }]}>All caught up</Text>
                  <Text style={[styles.emptyText, { color: theme.content.muted }]}>Your open checklist items will appear here.</Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={createChecklist}
              style={[
                styles.addTask,
                buttonShadow,
                { backgroundColor: theme.dark ? '#3D2A19' : '#FFF0E1' },
              ]}
            >
              <Ionicons name="add" size={19} color={theme.accent.base} />
              <Text style={[styles.addTaskText, { color: theme.accent.base }]}>New checklist</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        <GlassCard style={styles.outlookCard} padding={14}>
          <SectionHeading title="Today's insight" action="Stats" onPress={() => navigation.navigate('Stats')} />
          <TouchableOpacity
            accessibilityRole={selectedInsight ? 'button' : undefined}
            disabled={!selectedInsight}
            activeOpacity={0.78}
            onPress={() => selectedInsight && navigation.navigate('EventDetail', { event: selectedInsight.event })}
            style={styles.insightBody}
          >
            <DashboardGlyph
              name={selectedInsight?.insight.level === 'severe' ? 'warning-outline' : 'partly-sunny-outline'}
              size={25}
              color={selectedInsight?.insight.level === 'severe' ? theme.semantic.danger : theme.accent.base}
              tint={selectedInsight?.insight.level === 'severe' ? `${theme.semantic.danger}24` : theme.accent.soft}
              style={styles.insightIcon}
            />
            <Text style={[styles.insightText, { color: theme.content.secondary }]} numberOfLines={4}>
              {selectedInsight?.insight.guidance
                || (currentWeather.weather
                  ? `${weatherConditionLabel(currentWeather.weather.weatherCode)} today with a ${Math.round(currentWeather.weather.precipitationProbability)}% chance of rain.`
                  : 'Add event locations and enable weather for practical planning insights.')}
            </Text>
            {selectedInsight ? <Ionicons name="chevron-forward" size={18} color={theme.content.muted} /> : null}
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
