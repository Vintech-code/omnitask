import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTaskStore } from '../context/TaskStore';
import { useEvents } from '../context/EventStore';
import { useAlarmStore } from '../context/AlarmStore';
import { Storage, KEYS } from '../services/StorageService';

const BLUE   = '#4A90D9';
const GREEN  = '#52B788';
const ORANGE = '#E09C52';
const PURPLE = '#9B6DD4';

// Simple bar-chart component without SVG
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={mb.track}>
      <View style={[mb.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const mb = StyleSheet.create({
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E8E8E8', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

// Radial completion ring using border trick
function RingBadge({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const angle = pct * 360;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 6, borderColor: `${color}22` }} />
      {angle <= 180 ? (
        <View style={{ position: 'absolute', width: size, height: size }}>
          <View style={{
            position: 'absolute', width: size, height: size, borderRadius: size / 2,
            borderWidth: 6, borderColor: 'transparent', borderTopColor: color, borderRightColor: color,
            transform: [{ rotate: '-90deg' }], opacity: angle > 0 ? 1 : 0,
          }} />
          <View style={{
            position: 'absolute', width: size, height: size, borderRadius: size / 2,
            borderWidth: 6, borderColor: 'transparent', borderTopColor: color,
            transform: [{ rotate: `${angle - 90}deg` }], opacity: angle >= 90 ? 0 : 1,
          }} />
        </View>
      ) : (
        <View style={{ position: 'absolute', width: size, height: size }}>
          <View style={{
            position: 'absolute', width: size, height: size, borderRadius: size / 2,
            borderWidth: 6, borderColor: color,
            borderBottomColor: angle < 270 ? 'transparent' : color,
            borderLeftColor: angle < 360 ? 'transparent' : color,
            transform: [{ rotate: '-90deg' }],
          }} />
          <View style={{
            position: 'absolute', width: size, height: size, borderRadius: size / 2,
            borderWidth: 6, borderColor: 'transparent', borderTopColor: color, borderRightColor: color,
            transform: [{ rotate: `${angle - 270}deg` }], opacity: angle <= 180 ? 0 : 1,
          }} />
        </View>
      )}
      <Text style={{ fontSize: 13, fontWeight: '800', color }}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

interface FocusStat {
  sessions: number;
  totalMinutes: number;
}

export default function StatsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { notes } = useTaskStore();
  const { events } = useEvents();
  const { alarms } = useAlarmStore();
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    Storage.get<number>(KEYS.SESSIONS).then(n => { if (n != null) setSessions(n); });
  }, []);

  // ── Computed stats ────────────────────────────────────────────────────────
  const totalNotes      = notes.length;
  const notesWithTodos  = notes.filter(n => n.todos && n.todos.length > 0).length;
  const completedTodos  = notes.reduce((acc, n) => acc + (n.todos?.filter(t => t.done).length ?? 0), 0);
  const totalTodos      = notes.reduce((acc, n) => acc + (n.todos?.length ?? 0), 0);
  const todoCompletion  = totalTodos > 0 ? completedTodos / totalTodos : 0;

  const totalEvents     = events.length;
  const activeAlarms    = alarms.filter(a => a.active).length;
  const totalAlarms     = alarms.length;

  const focusMinutes    = sessions * 25;
  const focusHours      = Math.floor(focusMinutes / 60);
  const focusRemainder  = focusMinutes % 60;
  const dailyGoal       = 8;
  const goalPct         = Math.min(sessions / dailyGoal, 1);

  // Category breakdown
  const catMap: Record<string, number> = {};
  notes.forEach(n => { catMap[n.category] = (catMap[n.category] || 0) + 1; });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const CAT_COLORS = [BLUE, GREEN, ORANGE, PURPLE, '#E05252'];

  // Priority breakdown
  const priorities = ['High', 'Medium', 'Low'];
  const prioMap: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
  events.forEach(e => { prioMap[e.priority] = (prioMap[e.priority] || 0) + 1; });
  const PRIO_COLORS: Record<string, string> = { High: '#E05252', Medium: ORANGE, Low: GREEN };

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: theme.bg2 }]} edges={['top']}>
      <View style={[st.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.iconColor} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: theme.text }]}>Statistics</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        {/* ── Top KPI row ── */}
        <View style={st.kpiRow}>
          {[
            { label: 'Notes', value: totalNotes, icon: 'document-text-outline', color: GREEN },
            { label: 'Events', value: totalEvents, icon: 'calendar-outline', color: BLUE },
            { label: 'Alarms', value: totalAlarms, icon: 'alarm-outline', color: ORANGE },
            { label: 'Sessions', value: sessions, icon: 'timer-outline', color: PURPLE },
          ].map(k => (
            <View key={k.label} style={[st.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[st.kpiIcon, { backgroundColor: `${k.color}18` }]}>
                <Ionicons name={k.icon as any} size={20} color={k.color} />
              </View>
              <Text style={[st.kpiVal, { color: theme.text }]}>{k.value}</Text>
              <Text style={[st.kpiLabel, { color: theme.textDim }]}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Focus section ── */}
        <View style={[st.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={st.sectionHead}>
            <Ionicons name="timer-outline" size={16} color={PURPLE} />
            <Text style={[st.sectionTitle, { color: theme.text }]}>Focus Time</Text>
          </View>
          <View style={st.focusRow}>
            <RingBadge pct={goalPct} color={PURPLE} size={80} />
            <View style={{ flex: 1, marginLeft: 20, gap: 10 }}>
              <View>
                <Text style={[st.focusTimeLabel, { color: theme.textDim }]}>Today's Sessions</Text>
                <Text style={[st.focusTimeVal, { color: theme.text }]}>{sessions} / {dailyGoal} sessions</Text>
                <MiniBar value={sessions} max={dailyGoal} color={PURPLE} />
              </View>
              <View>
                <Text style={[st.focusTimeLabel, { color: theme.textDim }]}>Total Focus Time</Text>
                <Text style={[st.focusTimeVal, { color: theme.text }]}>
                  {focusHours > 0 ? `${focusHours}h ` : ''}{focusRemainder}m
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Task completion ── */}
        <View style={[st.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={st.sectionHead}>
            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color={GREEN} />
            <Text style={[st.sectionTitle, { color: theme.text }]}>Task Completion</Text>
            <Text style={[st.sectionRight, { color: theme.textDim }]}>{completedTodos}/{totalTodos} done</Text>
          </View>
          <View style={st.todoProgressRow}>
            <RingBadge pct={todoCompletion} color={GREEN} size={72} />
            <View style={{ flex: 1, marginLeft: 16, gap: 8 }}>
              <View style={st.statLine}>
                <Text style={[st.statLineLabel, { color: theme.textDim }]}>Notes with todos</Text>
                <Text style={[st.statLineVal, { color: theme.text }]}>{notesWithTodos}</Text>
              </View>
              <View style={st.statLine}>
                <Text style={[st.statLineLabel, { color: theme.textDim }]}>Items completed</Text>
                <Text style={[st.statLineVal, { color: GREEN }]}>{completedTodos}</Text>
              </View>
              <View style={st.statLine}>
                <Text style={[st.statLineLabel, { color: theme.textDim }]}>Items pending</Text>
                <Text style={[st.statLineVal, { color: ORANGE }]}>{totalTodos - completedTodos}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Notes by category ── */}
        {catEntries.length > 0 && (
          <View style={[st.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={st.sectionHead}>
              <Ionicons name="pricetag-outline" size={16} color={BLUE} />
              <Text style={[st.sectionTitle, { color: theme.text }]}>Notes by Category</Text>
            </View>
            {catEntries.map(([cat, count], i) => (
              <View key={cat} style={[st.barRow, i === catEntries.length - 1 && { marginBottom: 0 }]}>
                <Text style={[st.barLabel, { color: theme.textSub }]} numberOfLines={1}>{cat}</Text>
                <MiniBar value={count} max={totalNotes} color={CAT_COLORS[i % CAT_COLORS.length]} />
                <Text style={[st.barCount, { color: theme.textDim }]}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Events by priority ── */}
        {totalEvents > 0 && (
          <View style={[st.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={st.sectionHead}>
              <Ionicons name="flag-outline" size={16} color={ORANGE} />
              <Text style={[st.sectionTitle, { color: theme.text }]}>Events by Priority</Text>
            </View>
            {priorities.map((p, i) => (
              <View key={p} style={[st.barRow, i === priorities.length - 1 && { marginBottom: 0 }]}>
                <Text style={[st.barLabel, { color: theme.textSub }]}>{p}</Text>
                <MiniBar value={prioMap[p]} max={totalEvents} color={PRIO_COLORS[p]} />
                <Text style={[st.barCount, { color: theme.textDim }]}>{prioMap[p]}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Alarm health ── */}
        <View style={[st.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={st.sectionHead}>
            <Ionicons name="alarm-outline" size={16} color={ORANGE} />
            <Text style={[st.sectionTitle, { color: theme.text }]}>Alarm Status</Text>
          </View>
          <View style={st.alarmStatusRow}>
            <View style={[st.alarmBadge, { backgroundColor: `${GREEN}18` }]}>
              <Text style={[st.alarmBadgeNum, { color: GREEN }]}>{activeAlarms}</Text>
              <Text style={[st.alarmBadgeLbl, { color: theme.textDim }]}>Active</Text>
            </View>
            <View style={[st.alarmBadge, { backgroundColor: theme.bg2 }]}>
              <Text style={[st.alarmBadgeNum, { color: theme.textDim }]}>{totalAlarms - activeAlarms}</Text>
              <Text style={[st.alarmBadgeLbl, { color: theme.textDim }]}>Inactive</Text>
            </View>
            <View style={[st.alarmBadge, { backgroundColor: `${BLUE}18` }]}>
              <Text style={[st.alarmBadgeNum, { color: BLUE }]}>{totalAlarms}</Text>
              <Text style={[st.alarmBadgeLbl, { color: theme.textDim }]}>Total</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, width: 38 },
  headerTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 12 },

  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  kpiVal: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  section: {
    borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  sectionRight: { fontSize: 12, fontWeight: '600' },

  focusRow: { flexDirection: 'row', alignItems: 'center' },
  focusTimeLabel: { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  focusTimeVal: { fontSize: 17, fontWeight: '800', marginBottom: 5 },

  todoProgressRow: { flexDirection: 'row', alignItems: 'center' },
  statLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLineLabel: { fontSize: 12, fontWeight: '500' },
  statLineVal: { fontSize: 14, fontWeight: '700' },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  barLabel: { width: 80, fontSize: 12, fontWeight: '600' },
  barCount: { width: 24, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  alarmStatusRow: { flexDirection: 'row', gap: 10 },
  alarmBadge: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 3 },
  alarmBadgeNum: { fontSize: 22, fontWeight: '800' },
  alarmBadgeLbl: { fontSize: 11, fontWeight: '600' },
});
