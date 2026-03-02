import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const BLUE = '#4A90D9';

// ─── Upcoming Event Card ────────────────────────────────────────────────────
const EventCard = ({
  time,
  title,
  location,
  barColor,
}: {
  time: string;
  title: string;
  location: string;
  barColor: string;
}) => (
  <View style={styles.eventCard}>
    <View style={[styles.eventBar, { backgroundColor: barColor }]} />
    <View style={styles.eventBody}>
      <View style={styles.eventTimeRow}>
        <Ionicons name="time-outline" size={13} color="#888" />
        <Text style={styles.eventTime}> {time}</Text>
        <TouchableOpacity style={{ marginLeft: 'auto' }}>
          <Ionicons name="ellipsis-vertical" size={16} color="#888" />
        </TouchableOpacity>
      </View>
      <Text style={styles.eventTitle}>{title}</Text>
      <View style={styles.eventLocRow}>
        <Ionicons name="location-outline" size={12} color="#888" />
        <Text style={styles.eventLoc}> {location}</Text>
      </View>
    </View>
  </View>
);

// ─── Task Row ───────────────────────────────────────────────────────────────
const TaskRow = ({
  label,
  priority,
  done,
  onToggle,
}: {
  label: string;
  priority: string;
  done: boolean;
  onToggle: () => void;
}) => {
  const dotColor =
    priority === 'HIGH' ? '#E05252' : priority === 'MEDIUM' ? '#E09C52' : '#52B788';
  return (
    <View style={styles.taskRow}>
      <TouchableOpacity
        onPress={onToggle}
        style={[styles.taskCheckbox, done && styles.taskCheckboxDone]}
      >
        {done && <Ionicons name="checkmark" size={14} color="#fff" />}
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.taskLabel, done && styles.taskLabelDone]}>{label}</Text>
        <View style={styles.taskPriorityRow}>
          {priority === 'HIGH' && (
            <View style={[styles.taskDot, { backgroundColor: dotColor }]} />
          )}
          <Text style={styles.taskPriority}>{priority}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Dashboard Screen ───────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }: any) {
  const [tasks, setTasks] = useState([
    { id: 1, label: 'Refactor Dashboard API', priority: 'HIGH', done: false },
    { id: 2, label: 'Prepare Weekly Report', priority: 'MEDIUM', done: false },
    { id: 3, label: 'Call with Client: Phase 2', priority: 'MEDIUM', done: true },
  ]);

  const toggle = (id: number) =>
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.logoBox}>
          <Ionicons name="flash" size={20} color="#fff" />
        </View>
        <Text style={styles.topTitle}>Dashboard</Text>
        <View style={styles.topIcons}>
          <TouchableOpacity style={{ marginRight: 16 }} onPress={() => Alert.alert('Notifications', 'No new notifications.')}
          >
            <Ionicons name="notifications-outline" size={22} color="#222" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Settings', 'App settings coming soon.')}>
            <Ionicons name="settings-outline" size={22} color="#222" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ── */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingTitle}>Hey, Alex 👋</Text>
          <Text style={styles.greetingSub}>You have 4 tasks to complete today.</Text>
        </View>

        {/* ── Upcoming Events ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity style={styles.viewCalBtn} onPress={() => navigation.navigate('EventAlarms')}>
            <Text style={styles.viewCalText}>View Calendar</Text>
            <Ionicons name="chevron-forward" size={14} color={BLUE} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
        >
          <EventCard
            time="10:30 AM"
            title="Design Sync with Team"
            location="Google Meet"
            barColor={BLUE}
          />
          <EventCard
            time="01:00 PM"
            title="Birthday Celebration"
            location="Green Park"
            barColor="#3DAE7C"
          />
        </ScrollView>

        {/* ── Focus Timer + Next Alarm ── */}
        <View style={styles.widgetRow}>
          {/* Focus Timer */}
          <View style={[styles.widgetCard, { backgroundColor: '#EBF4FF' }]}>
            <View style={styles.widgetTitleRow}>
              <Ionicons name="timer-outline" size={15} color={BLUE} />
              <Text style={[styles.widgetTitle, { color: BLUE }]}> Focus Timer</Text>
            </View>
            <TouchableOpacity style={styles.playBtn} onPress={() => navigation.navigate('Focus')}>
              <Ionicons name="play" size={26} color={BLUE} />
            </TouchableOpacity>
            <Text style={styles.timerTime}>25:00</Text>
            <Text style={styles.timerGoal}>DAILY GOAL: 4/8</Text>
          </View>

          {/* Next Alarm */}
          <View style={[styles.widgetCard, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0F0F0' }]}>
            <View style={styles.widgetTitleRow}>
              <Ionicons name="alarm-outline" size={15} color="#E09C52" />
              <Text style={[styles.widgetTitle, { color: '#E09C52' }]}> Next Alarm</Text>
            </View>
            <Text style={styles.alarmTime}>07:30</Text>
            <View style={styles.alarmTagRow}>
              <View style={styles.alarmTag}>
                <Text style={styles.alarmTagText}>Mon - Fri</Text>
              </View>
            </View>
            <Text style={styles.alarmSub}>Starts in 8h 20m</Text>
            <View style={styles.alarmBar} />
          </View>
        </View>

        {/* ── Priority Tasks ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Priority Tasks</Text>
          <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('Tasks')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {tasks.map(t => (
          <TaskRow
            key={t.id}
            label={t.label}
            priority={t.priority}
            done={t.done}
            onToggle={() => toggle(t.id)}
          />
        ))}

        {/* ── Add New Task ── */}
        <TouchableOpacity
          style={styles.addTaskBtn}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Ionicons name="add" size={20} color="#222" />
          <Text style={styles.addTaskText}>Add New Task</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEvent')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  topTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginRight: -34 },
  topIcons: { flexDirection: 'row', alignItems: 'center' },

  scroll: { flex: 1 },

  /* Greeting */
  greetingBlock: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
  greetingTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  greetingSub: { fontSize: 14, color: '#888' },

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  viewCalBtn: { flexDirection: 'row', alignItems: 'center' },
  viewCalText: { fontSize: 13, color: BLUE, fontWeight: '600' },

  /* Event cards */
  eventCard: {
    width: 190,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    overflow: 'hidden',
    marginBottom: 16,
  },
  eventBar: { height: 4, width: '100%' },
  eventBody: { padding: 12 },
  eventTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  eventTime: { fontSize: 12, color: '#888' },
  eventTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  eventLocRow: { flexDirection: 'row', alignItems: 'center' },
  eventLoc: { fontSize: 12, color: '#888' },

  /* Widget row */
  widgetRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  widgetCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  widgetTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, alignSelf: 'flex-start' },
  widgetTitle: { fontSize: 13, fontWeight: '600' },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timerTime: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  timerGoal: { fontSize: 11, color: '#888', letterSpacing: 0.5 },
  alarmTime: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  alarmTagRow: { flexDirection: 'row', marginBottom: 4 },
  alarmTag: {
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  alarmTagText: { fontSize: 11, color: '#E09C52', fontWeight: '600' },
  alarmSub: { fontSize: 12, color: '#888', marginBottom: 8 },
  alarmBar: { width: '80%', height: 3, backgroundColor: '#F5C842', borderRadius: 2 },

  /* Priority Tasks */
  seeAllBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  seeAllText: { fontSize: 13, color: '#555', fontWeight: '500' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: 14,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxDone: { backgroundColor: BLUE, borderColor: BLUE },
  taskLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 3 },
  taskLabelDone: { textDecorationLine: 'line-through', color: '#AAA' },
  taskPriorityRow: { flexDirection: 'row', alignItems: 'center' },
  taskDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  taskPriority: { fontSize: 11, color: '#888', fontWeight: '600', letterSpacing: 0.5 },

  /* Add Task button */
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 15,
  },
  addTaskText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginLeft: 6 },

  /* FAB */
  fab: {
    position: 'absolute',
    bottom: 86,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
