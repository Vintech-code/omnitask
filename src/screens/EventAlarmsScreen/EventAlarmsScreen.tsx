import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEvents, AppEvent } from '@/context/EventStore';
import { useTheme } from '@/context/ThemeContext';
import { BurgerMenu, PulsingFAB } from '@/components/BurgerMenu';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { calS, styles } from './styles';


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
          // -- CALENDAR VIEW --
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
                    {event.startDate}{event.startDate && event.startTime ? ' � ' : ''}{event.startTime}
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
                      <Text style={[styles.alarmMetaDot, { color: theme.textDim }]}>�</Text>
                    </>
                  ) : null}
                  <MaterialCommunityIcons name="music-note" size={12} color={theme.textDim} />
                  <Text style={[styles.alarmMetaText, { color: theme.textDim }]}>Chimes</Text>
                  <Text style={[styles.alarmMetaDot, { color: theme.textDim }]}>�</Text>
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

// -- CALENDAR VIEW COMPONENT --------------------------------------------------
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

