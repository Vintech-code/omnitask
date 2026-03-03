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
      </ScrollView>

      {/* FAB */}
      <View style={styles.fab}>
        <PulsingFAB onPress={() => navigation?.navigate('CreateEvent')} />
      </View>
    </SafeAreaView>
  );
}

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