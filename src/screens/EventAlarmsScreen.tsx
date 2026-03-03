import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEvents, AppEvent } from '../context/EventStore';
import { useTheme } from '../context/ThemeContext';
import { BurgerMenu, PulsingFAB } from '../components/BurgerMenu';

const BLUE = '#4A90D9';

function parseTime(timeStr: string): { time: string; period: 'AM' | 'PM' } {
  const parts = timeStr.trim().split(' ');
  const period: 'AM' | 'PM' = (parts[1] || '').toUpperCase() === 'PM' ? 'PM' : 'AM';
  return { time: parts[0] || '--:--', period };
}

export default function EventAlarmsScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const { events, isLoading, toggleAlarmActive, removeEvent } = useEvents();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calDate, setCalDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 700); };

  const activeCount = events.filter(e => e.alarmActive).length;
  const nextEvent   = events.find(e => e.alarmActive);

  const handleManageAll = () =>
    Alert.alert('Manage All Alarms', 'Bulk options', [
      { text: 'Disable All',  onPress: () => events.forEach(e => { if (e.alarmActive)  toggleAlarmActive(e.id); }) },
      { text: 'Enable All',   onPress: () => events.forEach(e => { if (!e.alarmActive) toggleAlarmActive(e.id); }) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const handleSettings = () =>
    Alert.alert('Alarm Settings', 'Default ringtone, vibration and snooze settings coming soon.');

  const openEventMenu = (event: AppEvent) =>
    Alert.alert(event.title, undefined, [
      { text: 'Edit Event',    onPress: () => navigation?.navigate('CreateEvent', { event }) },
      { text: 'Toggle Alarm',  onPress: () => toggleAlarmActive(event.id) },
      { text: 'Delete Event',  style: 'destructive', onPress: () => removeEvent(event.id) },
      { text: 'Cancel',        style: 'cancel' },
    ]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg2 }]} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg2 }]} edges={['top']}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <BurgerMenu navigation={navigation} />
        <Text style={[styles.topBarTitle, { color: theme.text }]}>Event Alarms</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { setViewMode(v => v === 'list' ? 'calendar' : 'list'); setSelectedDay(null); }}>
            <Ionicons name={viewMode === 'list' ? 'calendar-outline' : 'list-outline'} size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation?.navigate('CreateEvent')}>
            <Ionicons name="add-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleSettings}>
            <Ionicons name="settings-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textDim} />}
      >
        {viewMode === 'calendar' ? (
          // ── CALENDAR VIEW ──
          <CalendarView
            events={events}
            theme={theme}
            isDark={isDark}
            calDate={calDate}
            setCalDate={setCalDate}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            navigation={navigation}
          />
        ) : (
          <>
        {/* Stat Cards */}
        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1A2A3A' : '#EBF4FF' }]}>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>ACTIVE ALARMS</Text>
            <Text style={[styles.statValueBlue, { color: theme.text }]}>{activeCount}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>NEXT EVENT</Text>
            <Text style={[styles.statValueDark, { color: theme.text }]} numberOfLines={1}>
              {nextEvent ? nextEvent.title : 'None'}
            </Text>
          </View>
        </View>

        {/* EVENT ALARMS header */}
        <View style={styles.sectionHeader}>
          <View style={styles.blueDot} />
          <Text style={[styles.sectionTitle, { color: theme.textDim }]}>EVENT ALARMS</Text>
          {events.length > 0 && (
            <TouchableOpacity style={styles.manageAllBtn} onPress={handleManageAll}>
              <Text style={styles.manageAllText}>Manage All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Empty state */}
        {events.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={theme.textDim} />
            <Text style={[styles.emptyTitle, { color: theme.textDim }]}>No events yet</Text>
            <Text style={[styles.emptySub, { color: theme.textDim }]}>Create an event to see it here</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation?.navigate('CreateEvent')}
            >
              <Text style={styles.emptyAddText}>+ New Event</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Event Alarm Cards */}
        {events.map(event => {
          const { time, period } = parseTime(event.startTime);
          const repeat = event.reminders.includes('Daily Repeat') ? 'EVERYDAY' : 'ONCE';
          const notificationChips = event.reminders.filter(r => r !== 'Daily Repeat');

          return (
            <TouchableOpacity
              key={event.id}
              style={[styles.alarmCard, { backgroundColor: theme.card }]}
              onPress={() => navigation?.navigate('EventDetail', { event })}
              onLongPress={() => openEventMenu(event)}
              delayLongPress={400}
              activeOpacity={0.97}
            >
              <View style={styles.alarmLeftBorder} />
              <View style={styles.alarmCardBody}>
                {/* Time + Toggle */}
                <View style={styles.alarmTopRow}>
                  <View style={styles.alarmTimeBlock}>
                    <Text style={[styles.alarmTime, { color: theme.text }, !event.alarmActive && styles.alarmTimeInactive]}>
                      {time}
                    </Text>
                    <Text style={[styles.alarmPeriod, { color: theme.textSub }, !event.alarmActive && styles.alarmTimeInactive]}>
                      {' '}{period}
                    </Text>
                  </View>
                  <View style={styles.alarmTopActions}>
                    <Switch
                      value={event.alarmActive}
                      onValueChange={() => toggleAlarmActive(event.id)}
                      trackColor={{ false: '#E0E0E0', true: '#B8D4F5' }}
                      thumbColor={event.alarmActive ? BLUE : '#f0f0f0'}
                      style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                    />
                    <TouchableOpacity
                      onPress={() => openEventMenu(event)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color={theme.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Event Name + Meta */}
                <Text style={[styles.alarmTitle, { color: theme.text }, !event.alarmActive && styles.alarmTitleInactive]}>
                  {event.title}
                </Text>

                <View style={styles.alarmEventRow}>
                  <Ionicons name="calendar-outline" size={12} color={theme.textDim} />
                  <Text style={[styles.alarmEventText, { color: theme.textDim }]}>
                    {event.startDate}{event.startDate && event.startTime ? ' • ' : ''}{event.startTime}
                  </Text>
                  <View style={[styles.statusBadge, styles.statusGoing]}>
                    <Text style={[styles.statusText, styles.statusTextGoing]}>confirmed</Text>
                  </View>
                </View>

                {/* Meta row */}
                <View style={styles.alarmMetaRow}>
                  {event.location ? (
                    <>
                      <Ionicons name="location-outline" size={12} color={BLUE} />
                      <Text style={styles.alarmMetaBlue} numberOfLines={1}>{event.location}</Text>
                      <Text style={[styles.alarmMetaDot, { color: theme.textDim }]}>·</Text>
                    </>
                  ) : null}
                  <MaterialCommunityIcons name="music-note" size={12} color={theme.textDim} />
                  <Text style={[styles.alarmMetaText, { color: theme.textDim }]}>Chimes</Text>
                  <Text style={[styles.alarmMetaDot, { color: theme.textDim }]}>·</Text>
                  <View style={[styles.repeatBadge, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                    <Text style={[styles.repeatBadgeText, { color: theme.textSub }]}>{repeat}</Text>
                  </View>
                </View>

                {/* Category badge + notification chips */}
                <View style={styles.alarmBottomRow}>
                  <View style={styles.chipsRow}>
                    <View style={[styles.categoryChip, { backgroundColor: isDark ? '#1A2A3A' : '#EBF4FF' }]}>
                      <Text style={styles.categoryChipText}>{event.category}</Text>
                    </View>
                    {notificationChips.slice(0, 2).map((chip, i) => (
                      <View key={i} style={[styles.chip, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                        <Ionicons name="alarm-outline" size={11} color={theme.textDim} />
                        <Text style={[styles.chipText, { color: theme.textSub }]}>{chip}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.priorityBadge, {
                    backgroundColor:
                      event.priority === 'High' ? '#FDECEA' :
                      event.priority === 'Medium' ? '#FEF9E7' : '#E9F7EF',
                  }]}>
                    <Text style={[styles.priorityBadgeText, {
                      color:
                        event.priority === 'High' ? '#E05252' :
                        event.priority === 'Medium' ? '#E09C52' : '#52B788',
                    }]}>
                      {event.priority}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <View style={styles.fab}>
        <PulsingFAB onPress={() => navigation?.navigate('CreateEvent')} />
      </View>
    </SafeAreaView>
  );
}

// ── CALENDAR VIEW COMPONENT ──────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseEventDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function CalendarView({ events, theme, isDark, calDate, setCalDate, selectedDay, setSelectedDay, navigation }: any) {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const dayEvents: Record<number, AppEvent[]> = {};
  events.forEach((e: AppEvent) => {
    const d = parseEventDate(e.startDate);
    if (d && d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!dayEvents[day]) dayEvents[day] = [];
      dayEvents[day].push(e);
    }
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents: AppEvent[] = selectedDay ? (dayEvents[selectedDay] ?? []) : [];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      {/* Month navigation */}
      <View style={calS.monthRow}>
        <TouchableOpacity onPress={() => setCalDate(new Date(year, month - 1, 1))} style={calS.navBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[calS.monthTitle, { color: theme.text }]}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={() => setCalDate(new Date(year, month + 1, 1))} style={calS.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Day name headers */}
      <View style={calS.dayNamesRow}>
        {DAY_NAMES.map(d => (
          <Text key={d} style={[calS.dayName, { color: theme.textDim }]}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={calS.grid}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`empty-${idx}`} style={calS.cell} />;
          const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
          const isSelected = selectedDay === day;
          const hasDots = (dayEvents[day] ?? []).length > 0;
          return (
            <TouchableOpacity
              key={day}
              style={[calS.cell, isSelected && { backgroundColor: BLUE + '22', borderRadius: 10 }]}
              onPress={() => setSelectedDay(isSelected ? null : day)}
            >
              <Text style={[
                calS.dayNum,
                { color: theme.text },
                isToday && calS.todayNum,
                isSelected && { color: BLUE, fontWeight: '800' },
              ]}>{day}</Text>
              {hasDots && (
                <View style={calS.dotsRow}>
                  {(dayEvents[day] ?? []).slice(0, 3).map((_, i) => (
                    <View key={i} style={[calS.dot, { backgroundColor: BLUE }]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day events */}
      {selectedDay !== null && (
        <View style={{ marginTop: 16 }}>
          <Text style={[calS.dayEventsTitle, { color: theme.textDim }]}>
            {MONTH_NAMES[month]} {selectedDay}
          </Text>
          {selectedEvents.length === 0 && (
            <Text style={{ color: theme.textDim, fontSize: 14, paddingVertical: 10 }}>No events this day</Text>
          )}
          {selectedEvents.map(ev => (
            <TouchableOpacity
              key={ev.id}
              style={[calS.eventRow, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navigation?.navigate('EventDetail', { event: ev })}
            >
              <View style={calS.eventDot} />
              <View style={{ flex: 1 }}>
                <Text style={[calS.eventRowTitle, { color: theme.text }]} numberOfLines={1}>{ev.title}</Text>
                <Text style={[calS.eventRowTime, { color: theme.textDim }]}>{ev.startTime}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{ height: 40 }} />
    </View>
  );
}

const calS = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 17, fontWeight: '800' },
  dayNamesRow: { flexDirection: 'row', marginBottom: 4 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%` as any, alignItems: 'center', paddingVertical: 6, minHeight: 44 },
  dayNum: { fontSize: 14, fontWeight: '500' },
  todayNum: { color: BLUE, fontWeight: '800' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dayEventsTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  eventRowTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  eventRowTime: { fontSize: 12 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 14 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20 },

  statRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 12, padding: 10 },
  statCardBlue: {},
  statCardWhite: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 3 },
  statValueBlue: { fontSize: 22, fontWeight: '800' },
  statValueDark: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4,
  },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  sectionTitle: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  manageAllBtn: {},
  manageAllText: { fontSize: 12, color: BLUE, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 12 },
  emptyAddBtn: {
    backgroundColor: BLUE, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 8,
  },
  emptyAddText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  alarmCard: {
    flexDirection: 'row', borderRadius: 12,
    marginBottom: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  alarmLeftBorder: { width: 4, backgroundColor: BLUE },
  alarmCardBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },

  alarmTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  alarmTimeBlock: { flexDirection: 'row', alignItems: 'flex-end' },
  alarmTime: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  alarmPeriod: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  alarmTimeInactive: { color: '#CCC' },
  alarmTopActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  alarmTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  alarmTitleInactive: { color: '#BBB' },

  alarmEventRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  alarmEventText: { fontSize: 12, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusGoing: { backgroundColor: '#E9F7EF' },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  statusTextGoing: { color: '#27AE60' },

  alarmMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7, flexWrap: 'wrap' },
  alarmMetaBlue: { fontSize: 11, color: BLUE, fontWeight: '600', maxWidth: 120 },
  alarmMetaText: { fontSize: 11 },
  alarmMetaDot: { fontSize: 11 },
  repeatBadge: {
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  repeatBadgeText: { fontSize: 10, fontWeight: '700' },

  alarmBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  categoryChip: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  categoryChipText: { fontSize: 11, color: BLUE, fontWeight: '700' },
  priorityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  priorityBadgeText: { fontSize: 11, fontWeight: '700' },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
  },
});