import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '../context/EventStore';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAlarmStore } from '../context/AlarmStore';
import { Storage, KEYS } from '../services/StorageService';
import { BurgerMenu } from '../components/BurgerMenu';

const BLUE = '#4A90D9';

const PRIORITY_BAR: Record<string, string> = {
  High: '#E05252', Medium: '#4A90D9', Low: '#3DAE7C',
};

function EventCard({ ev, onPress, theme }: any) {
  return (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.eventBar, { backgroundColor: PRIORITY_BAR[ev.priority] ?? BLUE }]} />
      <View style={styles.eventBody}>
        <View style={styles.eventTimeRow}>
          <Ionicons name="time-outline" size={13} color={theme.textDim} />
          <Text style={[styles.eventTime, { color: theme.textDim }]}> {ev.startTime || ev.startDate}</Text>
        </View>
        <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>{ev.title}</Text>
        {ev.location ? (
          <View style={styles.eventLocRow}>
            <Ionicons name="location-outline" size={12} color={theme.textDim} />
            <Text style={[styles.eventLoc, { color: theme.textDim }]} numberOfLines={1}> {ev.location}</Text>
          </View>
        ) : (
          <View style={styles.eventLocRow}>
            <Ionicons name="pricetag-outline" size={12} color={theme.textDim} />
            <Text style={[styles.eventLoc, { color: theme.textDim }]}> {ev.category}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }: any) {
  const { events } = useEvents();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { alarms } = useAlarmStore();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const [sessions, setSessions] = useState(0);
  useEffect(() => {
    Storage.get<number>(KEYS.SESSIONS).then(n => { if (n != null) setSessions(n); });
  }, []);

  // next active alarm sorted by time
  const nextAlarm = useMemo(() => {
    const active = alarms.filter(a => a.active);
    if (!active.length) return null;
    const toMins = (a: typeof active[0]) => {
      let h = a.hour;
      if (a.period === 'PM' && h !== 12) h += 12;
      if (a.period === 'AM' && h === 12) h = 0;
      return h * 60 + a.minute;
    };
    return [...active].sort((a, b) => toMins(a) - toMins(b))[0];
  }, [alarms]);

  const nextAlarmLabel = nextAlarm
    ? `${String(nextAlarm.hour).padStart(2, '0')}:${String(nextAlarm.minute).padStart(2, '0')}`
    : '--:--';

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const todayStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const h = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <View style={[styles.logoBox, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}>
          <Image source={require('../../assets/omnitasklogo.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
        </View>
        <Text style={[styles.topTitle, { color: theme.text }]}>Dashboard</Text>
        <View style={styles.topIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
            <Ionicons name="search-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Stats')}>
            <Ionicons name="bar-chart-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <BurgerMenu navigation={navigation} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textDim} />}>

        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={[styles.greetingTitle, { color: theme.text }]}>{greeting}, {firstName}! 👋</Text>
          <Text style={[styles.greetingSub, { color: theme.textDim }]}>{todayStr}</Text>
          <Text style={[styles.greetingMeta, { color: BLUE }]}>
            {events.length > 0
              ? `${events.length} upcoming event${events.length !== 1 ? 's' : ''} scheduled`
              : 'No upcoming events'}
          </Text>
        </View>

        {/* Quick Stats Bar */}
        <View style={[styles.quickStats, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.quickStat} onPress={() => navigation.navigate('EventAlarms')}>
            <Text style={[styles.quickStatNum, { color: theme.text }]}>{events.length}</Text>
            <Text style={[styles.quickStatLabel, { color: theme.textDim }]}>Events</Text>
          </TouchableOpacity>
          <View style={[styles.quickStatDiv, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={styles.quickStat} onPress={() => navigation.navigate('Focus')}>
            <Text style={[styles.quickStatNum, { color: theme.text }]}>{sessions}</Text>
            <Text style={[styles.quickStatLabel, { color: theme.textDim }]}>Sessions</Text>
          </TouchableOpacity>
          <View style={[styles.quickStatDiv, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={styles.quickStat} onPress={() => navigation.navigate('Alarm')}>
            <Text style={[styles.quickStatNum, { color: BLUE }]}>{nextAlarmLabel}</Text>
            <Text style={[styles.quickStatLabel, { color: theme.textDim }]}>Next Alarm</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Events */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming Events</Text>
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('EventAlarms')}>
            <Text style={[styles.viewAllText, { color: BLUE }]}>See all</Text>
            <Ionicons name="chevron-forward" size={13} color={BLUE} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}>
          {events.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyEventCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}
              onPress={() => navigation.navigate('CreateEvent')}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.textDim} />
              <Text style={[styles.emptyEventText, { color: theme.textDim }]}>Add an event</Text>
            </TouchableOpacity>
          ) : (
            events.slice(0, 6).map(ev => (
              <EventCard key={ev.id} ev={ev} theme={theme} onPress={() => navigation.navigate('EventDetail', { event: ev })} />
            ))
          )}
        </ScrollView>

        {/* Focus + Alarm widgets */}
        <View style={styles.widgetRow}>
          <TouchableOpacity
            style={[styles.widgetCard, { backgroundColor: theme.dark ? '#1A2A3A' : '#EBF4FF' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Focus')}
          >
            <View style={styles.widgetTitleRow}>
              <Ionicons name="timer-outline" size={14} color={BLUE} />
              <Text style={[styles.widgetTitle, { color: BLUE }]}> Focus</Text>
            </View>
            <View style={[styles.widgetPlayRing, { borderColor: BLUE }]}>
              <Ionicons name="play" size={24} color={BLUE} />
            </View>
            <Text style={[styles.timerTime, { color: theme.text }]}>25:00</Text>
            <Text style={[styles.timerGoal, { color: theme.textDim }]}>Pomodoro ready</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.widgetCard, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Alarm')}
          >
            <View style={styles.widgetTitleRow}>
              <Ionicons name="alarm-outline" size={14} color="#E09C52" />
              <Text style={[styles.widgetTitle, { color: '#E09C52' }]}> Alarm</Text>
            </View>
            <Text style={[styles.alarmTime, { color: theme.text }]}>{nextAlarmLabel}</Text>
            <View style={styles.alarmTagRow}>
              <View style={[styles.alarmTag, { backgroundColor: theme.dark ? '#2A2000' : '#FFF3E0' }]}>
                <Text style={styles.alarmTagText}>{nextAlarm ? nextAlarm.label : 'No alarms'}</Text>
              </View>
            </View>
            <View style={[styles.alarmBar, { backgroundColor: '#F5C842' }]} />
          </TouchableOpacity>
        </View>

        {/* Quick action shortcuts */}
        <TouchableOpacity
          style={[styles.actionRow, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => navigation.navigate('CreateEvent')}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={18} color={BLUE} />
          <Text style={[styles.actionText, { color: theme.text }]}>Create New Event</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 8 }]}
          onPress={() => navigation.navigate('Tasks')}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#3DAE7C" />
          <Text style={[styles.actionText, { color: theme.text }]}>View To-do List</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoBox: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  topTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center', marginRight: -42 },
  topIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 6, marginLeft: 4 },
  scroll: { flex: 1 },
  greetingBlock: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12 },
  greetingTitle: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  greetingSub: { fontSize: 13, marginBottom: 2 },
  greetingMeta: { fontSize: 13, fontWeight: '600' },
  quickStats: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 18,
    borderRadius: 14, paddingVertical: 14, borderWidth: 1,
  },
  quickStat: { flex: 1, alignItems: 'center' },
  quickStatNum: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  quickStatLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  quickStatDiv: { width: 1, height: 28 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 10, marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center' },
  viewAllText: { fontSize: 13, fontWeight: '600' },
  eventCard: {
    width: 185, borderRadius: 12,
    marginRight: 12, borderWidth: 1,
    overflow: 'hidden', marginBottom: 16, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
  },
  eventBar: { height: 4 },
  eventBody: { padding: 12 },
  eventTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  eventTime: { fontSize: 12 },
  eventTitle: { fontSize: 14, fontWeight: '700', marginBottom: 5 },
  eventLocRow: { flexDirection: 'row', alignItems: 'center' },
  eventLoc: { fontSize: 12, flex: 1 },
  emptyEventCard: {
    width: 160, borderRadius: 12,
    marginRight: 12, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24, marginBottom: 16,
  },
  emptyEventText: { fontSize: 12, fontWeight: '500' },
  widgetRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 20, marginTop: 4 },
  widgetCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
  widgetTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, alignSelf: 'flex-start' },
  widgetTitle: { fontSize: 13, fontWeight: '600' },
  widgetPlayRing: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  timerTime: { fontSize: 20, fontWeight: '800', marginBottom: 3 },
  timerGoal: { fontSize: 11, letterSpacing: 0.4 },
  alarmTime: { fontSize: 30, fontWeight: '800', marginBottom: 5 },
  alarmTagRow: { flexDirection: 'row', marginBottom: 4 },
  alarmTag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  alarmTagText: { fontSize: 11, color: '#E09C52', fontWeight: '600' },
  alarmBar: { width: '80%', height: 3, borderRadius: 2 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, borderRadius: 12,
    borderWidth: 1, paddingHorizontal: 16, paddingVertical: 15, gap: 12,
  },
  actionText: { flex: 1, fontSize: 15, fontWeight: '600' },
});

