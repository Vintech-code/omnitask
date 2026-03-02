import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const BLUE = '#4A90D9';

const EVENT_ALARMS = [
  {
    id: '1',
    time: '08:30',
    period: 'AM',
    active: true,
    title: 'Product Sync: Q3 Roadmap',
    eventTime: 'Today • 9:00 AM',
    status: 'going',
    locationAlert: true,
    ringtone: 'Chimes',
    repeat: 'MON,WED,FRI',
    timeBefore: ['15m before', '5m before'],
    avatars: ['A', 'B', 'C', '+2'],
  },
  {
    id: '2',
    time: '06:15',
    period: 'PM',
    active: false,
    title: 'Dinner at Blue Bayou',
    eventTime: 'Tomorrow • 7:00 PM',
    status: 'pending',
    locationAlert: false,
    ringtone: 'Piano Bloom',
    repeat: 'ONCE',
    timeBefore: ['1h before'],
    avatars: [],
  },
  {
    id: '3',
    time: '09:00',
    period: 'AM',
    active: true,
    title: 'Morning Yoga Session',
    eventTime: 'Daily',
    status: 'going',
    locationAlert: false,
    ringtone: 'Zen Flute',
    repeat: 'EVERYDAY',
    timeBefore: ['10m before'],
    avatars: [],
  },
];

export default function EventAlarmsScreen() {
  const [alarms, setAlarms] = useState(EVENT_ALARMS);
  const [waterPlantsActive, setWaterPlantsActive] = useState(true);

  const toggleAlarm = (id: string) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const deleteAlarm = (id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const handleAddAlarm = () => {
    Alert.alert('New Event Alarm', 'Event alarm creation coming soon.');
  };

  const handleSettings = () => {
    Alert.alert('Alarm Settings', 'Default ringtone, vibration, and snooze settings coming soon.');
  };

  const handleManageAll = () => {
    Alert.alert('Manage All Alarms', 'Bulk options', [
      { text: 'Disable All', onPress: () => setAlarms(prev => prev.map(a => ({ ...a, active: false }))) },
      { text: 'Enable All', onPress: () => setAlarms(prev => prev.map(a => ({ ...a, active: true }))) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const activeCount = alarms.filter(a => a.active).length;
  const nextEvent = alarms.filter(a => a.active)[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Event Alarms</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleAddAlarm}>
            <Ionicons name="add-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleSettings}>
            <Ionicons name="settings-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stat Cards */}
        <View style={styles.statRow}>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <Text style={styles.statLabel}>ACTIVE ALARMS</Text>
            <Text style={styles.statValueBlue}>{activeCount}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWhite]}>
            <Text style={styles.statLabel}>NEXT EVENT</Text>
            <Text style={styles.statValueDark}>{nextEvent ? nextEvent.title.split(':')[0].split(' ').slice(0, 2).join(' ') : 'None'}</Text>
          </View>
        </View>

        {/* EVENT ALARMS header */}
        <View style={styles.sectionHeader}>
          <View style={styles.blueDot} />
          <Text style={styles.sectionTitle}>EVENT ALARMS</Text>
          <TouchableOpacity style={styles.manageAllBtn} onPress={handleManageAll}>
            <Text style={styles.manageAllText}>Manage All</Text>
          </TouchableOpacity>
        </View>

        {/* Event Alarm Cards */}
        {alarms.map(alarm => (
          <View key={alarm.id} style={styles.alarmCard}>
            {/* Blue left border */}
            <View style={styles.alarmLeftBorder} />
            <View style={styles.alarmCardBody}>
              {/* Time + Toggle row */}
              <View style={styles.alarmTopRow}>
                <View style={styles.alarmTimeBlock}>
                  <Text style={[styles.alarmTime, !alarm.active && styles.alarmTimeInactive]}>
                    {alarm.time}
                  </Text>
                  <Text style={[styles.alarmPeriod, !alarm.active && styles.alarmTimeInactive]}>
                    {' '}{alarm.period}
                  </Text>
                </View>
                <Switch
                  value={alarm.active}
                  onValueChange={() => toggleAlarm(alarm.id)}
                  trackColor={{ false: '#E0E0E0', true: '#B8D4F5' }}
                  thumbColor={alarm.active ? BLUE : '#f0f0f0'}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
              </View>

              {/* Event Name + Meta */}
              <Text style={[styles.alarmTitle, !alarm.active && styles.alarmTitleInactive]}>
                {alarm.title}
              </Text>
              <View style={styles.alarmEventRow}>
                <Ionicons name="calendar-outline" size={12} color="#888" />
                <Text style={styles.alarmEventText}>{alarm.eventTime}</Text>
                <View style={[styles.statusBadge, alarm.status === 'going' ? styles.statusGoing : styles.statusPending]}>
                  <Text style={[styles.statusText, alarm.status === 'going' ? styles.statusTextGoing : styles.statusTextPending]}>
                    {alarm.status}
                  </Text>
                </View>
              </View>

              {/* Ringtone + Repeat row */}
              <View style={styles.alarmMetaRow}>
                {alarm.locationAlert && (
                  <>
                    <Ionicons name="location-outline" size={12} color={BLUE} />
                    <Text style={styles.alarmMetaBlue}>Location Alert</Text>
                    <Text style={styles.alarmMetaDot}>·</Text>
                  </>
                )}
                <MaterialCommunityIcons name="music-note" size={12} color="#888" />
                <Text style={styles.alarmMetaText}>{alarm.ringtone}</Text>
                <Text style={styles.alarmMetaDot}>·</Text>
                <View style={styles.repeatBadge}>
                  <Text style={styles.repeatBadgeText}>{alarm.repeat}</Text>
                </View>
              </View>

              {/* Time Before Chips + Avatars */}
              <View style={styles.alarmBottomRow}>
                <View style={styles.chipsRow}>
                  {alarm.timeBefore.map((chip, i) => (
                    <View key={i} style={styles.chip}>
                      <Ionicons name="alarm-outline" size={11} color="#888" />
                      <Text style={styles.chipText}>{chip}</Text>
                    </View>
                  ))}
                </View>
                {alarm.avatars.length > 0 && (
                  <View style={styles.avatarStack}>
                    {alarm.avatars.map((a, i) => (
                      <View key={i} style={[styles.avatar, { marginLeft: i > 0 ? -8 : 0 }, a.startsWith('+') && styles.avatarMore]}>
                        <Text style={a.startsWith('+') ? styles.avatarMoreText : styles.avatarText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}

        {/* OTHER REMINDERS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>OTHER REMINDERS</Text>
        </View>

        <View style={styles.reminderRow}>
          <View style={styles.reminderIconWrap}>
            <Ionicons name="notifications-outline" size={20} color={BLUE} />
          </View>
          <View style={styles.reminderBody}>
            <Text style={styles.reminderTitle}>Water Plants</Text>
            <Text style={styles.reminderSub}>Every Sat at 10:00 AM</Text>
          </View>
          <Switch
            value={waterPlantsActive}
            onValueChange={setWaterPlantsActive}
            trackColor={{ false: '#E0E0E0', true: '#B8D4F5' }}
            thumbColor={waterPlantsActive ? BLUE : '#f0f0f0'}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddAlarm}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6FA' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111', textAlign: 'center' },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 14 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 20 },

  statRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14,
  },
  statCardBlue: { backgroundColor: '#EBF4FF' },
  statCardWhite: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#888', letterSpacing: 1, marginBottom: 6 },
  statValueBlue: { fontSize: 28, fontWeight: '800', color: '#111' },
  statValueDark: { fontSize: 16, fontWeight: '800', color: '#111', marginTop: 4 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4,
  },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  sectionTitle: { flex: 1, fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1 },
  manageAllBtn: {},
  manageAllText: { fontSize: 12, color: BLUE, fontWeight: '600' },

  alarmCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  alarmLeftBorder: { width: 4, backgroundColor: BLUE },
  alarmCardBody: { flex: 1, padding: 14 },

  alarmTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  alarmTimeBlock: { flexDirection: 'row', alignItems: 'flex-end' },
  alarmTime: { fontSize: 26, fontWeight: '800', color: '#111', lineHeight: 30 },
  alarmPeriod: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 2 },
  alarmTimeInactive: { color: '#CCC' },

  alarmTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 5 },
  alarmTitleInactive: { color: '#BBB' },

  alarmEventRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  alarmEventText: { fontSize: 12, color: '#888' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusGoing: { backgroundColor: '#E9F7EF' },
  statusPending: { backgroundColor: '#FEF9E7' },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  statusTextGoing: { color: '#27AE60' },
  statusTextPending: { color: '#F39C12' },

  alarmMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, flexWrap: 'wrap' },
  alarmMetaBlue: { fontSize: 12, color: BLUE, fontWeight: '600' },
  alarmMetaText: { fontSize: 12, color: '#888' },
  alarmMetaDot: { fontSize: 12, color: '#ccc' },
  repeatBadge: {
    backgroundColor: '#F0F0F0', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  repeatBadgeText: { fontSize: 10, fontWeight: '700', color: '#666' },

  alarmBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  chipText: { fontSize: 11, color: '#555', fontWeight: '600' },

  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#B8D4F5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff',
  },
  avatarMore: { backgroundColor: '#E0E0E0' },
  avatarText: { fontSize: 9, fontWeight: '700', color: BLUE },
  avatarMoreText: { fontSize: 9, fontWeight: '700', color: '#666' },

  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  reminderIconWrap: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#EBF4FF',
    alignItems: 'center', justifyContent: 'center',
  },
  reminderBody: { flex: 1 },
  reminderTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  reminderSub: { fontSize: 12, color: '#888', marginTop: 2 },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
    shadowColor: BLUE, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
});
