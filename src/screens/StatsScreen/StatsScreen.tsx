import { fontFamily } from '@/theme/typography';
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useTaskStore } from '@/context/TaskStore';
import { useEvents } from '@/context/EventStore';
import { useAlarmStore } from '@/context/AlarmStore';
import { OMNITASK_PALETTE } from '@/theme/colors';
import { mb, st } from './styles';
import { AppBackground, ScreenSkeleton } from '@/components/ui';
import { useFocusSessions } from '@/context/FocusSessionContext';

const GREEN = OMNITASK_PALETTE.actionBlue;
const ORANGE = OMNITASK_PALETTE.warmCoral;
const BLUE = OMNITASK_PALETTE.infoBlue;
const CYAN = OMNITASK_PALETTE.brightCyan;

// Simple bar-chart component without SVG
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={mb.track}>
      <View style={[mb.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

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
      <Text style={{ fontSize: 13, fontFamily: fontFamily.extrabold, color }}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

interface FocusStat {
  sessions: number;
  totalMinutes: number;
}

export default function StatsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { notes, tasks, isLoading: notesLoading } = useTaskStore();
  const { events, isLoading: eventsLoading } = useEvents();
  const { alarms, isLoading: alarmsLoading } = useAlarmStore();
  const {
    metrics: focusMetrics,
    preferences: focusPreferences,
    isLoading: focusLoading,
  } = useFocusSessions();

  // ── Computed stats ────────────────────────────────────────────────────────
  const totalNotes      = notes.length;
  const notesWithTodos  = notes.filter(n => n.todos && n.todos.length > 0).length;
  const completedTodos  = notes.reduce((acc, n) => acc + (n.todos?.filter(t => t.done).length ?? 0), 0);
  const totalTodos      = notes.reduce((acc, n) => acc + (n.todos?.length ?? 0), 0);
  const todoCompletion  = totalTodos > 0 ? completedTodos / totalTodos : 0;

  const totalEvents     = events.length;
  const activeAlarms    = alarms.filter(a => a.active).length;
  const totalAlarms     = alarms.length;

  const focusMinutes    = Math.round(focusMetrics.lifetimeMinutes);
  const focusHours      = Math.floor(focusMinutes / 60);
  const focusRemainder  = focusMinutes % 60;
  const dailyGoal       = focusPreferences.dailyGoalMinutes;
  const goalPct         = focusMetrics.goalProgress;
  const estimatedTaskMinutes = tasks.reduce((total, task) => total + (task.estimateMinutes ?? 0), 0);
  const actualTaskMinutes = tasks.reduce((total, task) => total + (task.actualFocusMinutes ?? 0), 0);
  const estimateVariance = Math.round(actualTaskMinutes - estimatedTaskMinutes);
  const productiveHour = focusMetrics.productiveHour === null
    ? 'Not enough history'
    : new Date(2026, 0, 1, focusMetrics.productiveHour).toLocaleTimeString([], {
        hour: 'numeric',
      });

  // Category breakdown
  const catMap: Record<string, number> = {};
  notes.forEach(n => { catMap[n.category] = (catMap[n.category] || 0) + 1; });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const CAT_COLORS = [BLUE, GREEN, ORANGE, CYAN];

  // Priority breakdown
  const priorities = ['High', 'Medium', 'Low'];
  const prioMap: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
  events.forEach(e => { prioMap[e.priority] = (prioMap[e.priority] || 0) + 1; });
  const PRIO_COLORS: Record<string, string> = { High: '#E05252', Medium: ORANGE, Low: GREEN };

  if (notesLoading || eventsLoading || alarmsLoading || focusLoading) return <ScreenSkeleton variant="dashboard" />;

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
      <AppBackground />
      <View style={[st.header, { backgroundColor: 'transparent', borderBottomColor: 'transparent' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.icon} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: theme.content.primary }]}>Statistics</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        {/* ── Top KPI row ── */}
        <View style={st.kpiRow}>
          {[
            { label: 'Notes', value: totalNotes, icon: 'document-text-outline', color: GREEN },
            { label: 'Events', value: totalEvents, icon: 'calendar-outline', color: BLUE },
            { label: 'Alarms', value: totalAlarms, icon: 'alarm-outline', color: ORANGE },
            { label: 'Sessions', value: focusMetrics.lifetimeCompletedSessions, icon: 'timer-outline', color: CYAN },
          ].map(k => (
            <View key={k.label} style={[st.kpiCard, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
              <View style={[st.kpiIcon, { backgroundColor: k.color }]}>
                <Ionicons name={k.icon as any} size={20} color={theme.iconTile.foreground} />
              </View>
              <Text style={[st.kpiVal, { color: theme.content.primary }]}>{k.value}</Text>
              <Text style={[st.kpiLabel, { color: theme.content.muted }]}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Focus section ── */}
        <View style={[st.section, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
          <View style={st.sectionHead}>
            <Ionicons name="timer-outline" size={16} color={CYAN} />
            <Text style={[st.sectionTitle, { color: theme.content.primary }]}>Focus Time</Text>
          </View>
          <View style={st.focusRow}>
            <RingBadge pct={goalPct} color={CYAN} size={80} />
            <View style={{ flex: 1, marginLeft: 20, gap: 10 }}>
              <View>
                <Text style={[st.focusTimeLabel, { color: theme.content.muted }]}>Today</Text>
                <Text style={[st.focusTimeVal, { color: theme.content.primary }]}>
                  {Math.round(focusMetrics.todayMinutes)} / {dailyGoal} min
                </Text>
                <MiniBar value={focusMetrics.todayMinutes} max={dailyGoal} color={CYAN} />
              </View>
              <View>
                <Text style={[st.focusTimeLabel, { color: theme.content.muted }]}>Total Focus Time</Text>
                <Text style={[st.focusTimeVal, { color: theme.content.primary }]}>
                  {focusHours > 0 ? `${focusHours}h ` : ''}{focusRemainder}m
                </Text>
              </View>
            </View>
          </View>
          <View style={[st.focusDetails, { borderTopColor: theme.divider }]}>
            <View style={st.statLine}>
              <Text style={[st.statLineLabel, { color: theme.content.muted }]}>This week</Text>
              <Text style={[st.statLineVal, { color: theme.content.primary }]}>{Math.round(focusMetrics.weekMinutes)} min</Text>
            </View>
            <View style={st.statLine}>
              <Text style={[st.statLineLabel, { color: theme.content.muted }]}>Goal streak</Text>
              <Text style={[st.statLineVal, { color: theme.content.primary }]}>{focusMetrics.currentStreak} days</Text>
            </View>
            <View style={st.statLine}>
              <Text style={[st.statLineLabel, { color: theme.content.muted }]}>Most productive hour</Text>
              <Text style={[st.statLineVal, { color: theme.content.primary }]}>{productiveHour}</Text>
            </View>
            <View style={st.statLine}>
              <Text style={[st.statLineLabel, { color: theme.content.muted }]}>Interruptions</Text>
              <Text style={[st.statLineVal, { color: theme.content.primary }]}>{focusMetrics.interruptionCount}</Text>
            </View>
            <View style={st.statLine}>
              <Text style={[st.statLineLabel, { color: theme.content.muted }]}>Task estimate variance</Text>
              <Text style={[st.statLineVal, { color: estimateVariance > 0 ? ORANGE : GREEN }]}>
                {estimatedTaskMinutes > 0 ? `${estimateVariance > 0 ? '+' : ''}${estimateVariance} min` : 'No estimates'}
              </Text>
            </View>
            {focusMetrics.legacyCompletedSessions > 0 ? (
              <Text style={[st.legacyNote, { color: theme.content.muted }]}>
                {focusMetrics.legacyCompletedSessions} earlier sessions are preserved as a count only; no duration was invented.
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Task completion ── */}
        <View style={[st.section, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
          <View style={st.sectionHead}>
            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color={GREEN} />
            <Text style={[st.sectionTitle, { color: theme.content.primary }]}>Task Completion</Text>
            <Text style={[st.sectionRight, { color: theme.content.muted }]}>{completedTodos}/{totalTodos} done</Text>
          </View>
          <View style={st.todoProgressRow}>
            <RingBadge pct={todoCompletion} color={GREEN} size={72} />
            <View style={{ flex: 1, marginLeft: 16, gap: 8 }}>
              <View style={st.statLine}>
                <Text style={[st.statLineLabel, { color: theme.content.muted }]}>Notes with todos</Text>
                <Text style={[st.statLineVal, { color: theme.content.primary }]}>{notesWithTodos}</Text>
              </View>
              <View style={st.statLine}>
                <Text style={[st.statLineLabel, { color: theme.content.muted }]}>Items completed</Text>
                <Text style={[st.statLineVal, { color: GREEN }]}>{completedTodos}</Text>
              </View>
              <View style={st.statLine}>
                <Text style={[st.statLineLabel, { color: theme.content.muted }]}>Items pending</Text>
                <Text style={[st.statLineVal, { color: ORANGE }]}>{totalTodos - completedTodos}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Notes by category ── */}
        {catEntries.length > 0 && (
          <View style={[st.section, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
            <View style={st.sectionHead}>
              <Ionicons name="pricetag-outline" size={16} color={BLUE} />
              <Text style={[st.sectionTitle, { color: theme.content.primary }]}>Notes by Category</Text>
            </View>
            {catEntries.map(([cat, count], i) => (
              <View key={cat} style={[st.barRow, i === catEntries.length - 1 && { marginBottom: 0 }]}>
                <Text style={[st.barLabel, { color: theme.content.secondary }]} numberOfLines={1}>{cat}</Text>
                <MiniBar value={count} max={totalNotes} color={CAT_COLORS[i % CAT_COLORS.length]} />
                <Text style={[st.barCount, { color: theme.content.muted }]}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Events by priority ── */}
        {totalEvents > 0 && (
          <View style={[st.section, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
            <View style={st.sectionHead}>
              <Ionicons name="flag-outline" size={16} color={ORANGE} />
              <Text style={[st.sectionTitle, { color: theme.content.primary }]}>Events by Priority</Text>
            </View>
            {priorities.map((p, i) => (
              <View key={p} style={[st.barRow, i === priorities.length - 1 && { marginBottom: 0 }]}>
                <Text style={[st.barLabel, { color: theme.content.secondary }]}>{p}</Text>
                <MiniBar value={prioMap[p]} max={totalEvents} color={PRIO_COLORS[p]} />
                <Text style={[st.barCount, { color: theme.content.muted }]}>{prioMap[p]}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Alarm health ── */}
        <View style={[st.section, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
          <View style={st.sectionHead}>
            <Ionicons name="alarm-outline" size={16} color={ORANGE} />
            <Text style={[st.sectionTitle, { color: theme.content.primary }]}>Alarm Status</Text>
          </View>
          <View style={st.alarmStatusRow}>
            <View style={[st.alarmBadge, { backgroundColor: `${GREEN}18` }]}>
              <Text style={[st.alarmBadgeNum, { color: GREEN }]}>{activeAlarms}</Text>
              <Text style={[st.alarmBadgeLbl, { color: theme.content.muted }]}>Active</Text>
            </View>
            <View style={[st.alarmBadge, { backgroundColor: theme.background.top }]}>
              <Text style={[st.alarmBadgeNum, { color: theme.content.muted }]}>{totalAlarms - activeAlarms}</Text>
              <Text style={[st.alarmBadgeLbl, { color: theme.content.muted }]}>Inactive</Text>
            </View>
            <View style={[st.alarmBadge, { backgroundColor: `${BLUE}18` }]}>
              <Text style={[st.alarmBadgeNum, { color: BLUE }]}>{totalAlarms}</Text>
              <Text style={[st.alarmBadgeLbl, { color: theme.content.muted }]}>Total</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
