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
import { useEvents } from '@/context/EventStore';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useAlarmStore } from '@/context/AlarmStore';
import { Storage, KEYS } from '@/services/StorageService';
import { BurgerMenu } from '@/components/BurgerMenu';
import { useTaskStore } from '@/context/TaskStore';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { styles } from './styles';


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
  const { notes } = useTaskStore();
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
          <Image source={require('../../../assets/omnitasklogo.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
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

        {/* Recent Notes */}
        {notes.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Notes</Text>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('Tasks')}>
                <Text style={[styles.viewAllText, { color: BLUE }]}>See all</Text>
                <Ionicons name="chevron-forward" size={13} color={BLUE} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
            >
              {[...notes].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6).map(note => (
                <TouchableOpacity
                  key={note.id}
                  style={{
                    width: 160, borderRadius: 12, padding: 12,
                    marginRight: 10, marginBottom: 16,
                    backgroundColor: note.cardColor,
                    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
                  }}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Tasks')}
                >
                  {note.title.length > 0 && (
                    <Text
                      style={{ fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 5, lineHeight: 18 }}
                      numberOfLines={2}
                    >
                      {note.title}
                    </Text>
                  )}
                  {note.body.length > 0 && (
                    <Text
                      style={{ fontSize: 12, color: '#555', lineHeight: 17, marginBottom: 6 }}
                      numberOfLines={3}
                    >
                      {note.body}
                    </Text>
                  )}
                  {note.todos && note.todos.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Ionicons name="checkbox-outline" size={11} color={BLUE} />
                      <Text style={{ fontSize: 10, color: BLUE, fontWeight: '700' }}>
                        {note.todos.filter(t => t.done).length}/{note.todos.length}
                      </Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{note.date}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}