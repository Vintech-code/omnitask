import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#4A90D9';

const MODES = ['Focus', 'Short Break', 'Long Break'] as const;
type Mode = typeof MODES[number];

const MODE_DURATIONS: Record<Mode, number> = {
  'Focus': 25 * 60,
  'Short Break': 5 * 60,
  'Long Break': 15 * 60,
};

export default function FocusScreen({ navigation }: any) {
  const [activeMode, setActiveMode] = useState<Mode>('Focus');
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MODE_DURATIONS['Focus']);
  const [completedSessions, setCompletedSessions] = useState(4);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const switchMode = useCallback((mode: Mode) => {
    setRunning(false);
    setActiveMode(mode);
    setTimeLeft(MODE_DURATIONS[mode]);
  }, []);

  const handleTimerEnd = useCallback(() => {
    setRunning(false);
    if (activeMode === 'Focus') {
      setCompletedSessions(prev => prev + 1);
      Alert.alert('Session Complete! 🎉', 'Great work! Time for a break.', [
        { text: 'Short Break', onPress: () => switchMode('Short Break') },
        { text: 'Long Break', onPress: () => switchMode('Long Break') },
        { text: 'Keep Focusing', onPress: () => switchMode('Focus') },
      ]);
    } else {
      Alert.alert('Break Over!', 'Ready to get back to work?', [
        { text: 'Start Focus', onPress: () => switchMode('Focus') },
        { text: 'Not Yet', style: 'cancel', onPress: () => switchMode(activeMode) },
      ]);
    }
  }, [activeMode, switchMode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            handleTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, handleTimerEnd]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleReset = () => {
    setRunning(false);
    setTimeLeft(MODE_DURATIONS[activeMode]);
  };

  const handleSkip = () => {
    setRunning(false);
    if (activeMode === 'Focus') {
      setCompletedSessions(prev => prev + 1);
      switchMode('Short Break');
    } else {
      switchMode('Focus');
    }
  };

  const timerSub = !running
    ? 'Ready to Start'
    : activeMode === 'Focus'
    ? 'Focus Session Running'
    : 'On Break';

  const dailyGoal = 8;
  const goalPct = Math.min(Math.round((completedSessions / dailyGoal) * 100), 100);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Focus Timer</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mode Segmented Control */}
        <View style={styles.segmentedControl}>
          {MODES.map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.segmentBtn, activeMode === mode && styles.segmentBtnActive]}
              onPress={() => switchMode(mode)}
            >
              <Text style={[styles.segmentText, activeMode === mode && styles.segmentTextActive]}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timer Area */}
        <View style={styles.timerArea}>
          <View style={styles.deepWorkPill}>
            <Text style={styles.deepWorkText}>Deep Work</Text>
          </View>
          <Text style={styles.timerDigits}>{formatTime(timeLeft)}</Text>
          <Text style={styles.timerSub}>{timerSub}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlSecondary} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={24} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => setRunning(r => !r)}
          >
            <Ionicons name={running ? 'pause' : 'play'} size={30} color="#fff" style={{ marginLeft: running ? 0 : 4 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlSecondary} onPress={handleSkip}>
            <Ionicons name="play-skip-forward-outline" size={24} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Active Focus Session */}
        <View style={styles.sessionSection}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionHeaderTitle}>Active Focus Session</Text>
            <TouchableOpacity>
              <Text style={styles.addNewText}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sessionCard}>
            <View style={styles.sessionCardInner}>
              <View style={styles.sessionIconWrap}>
                <Ionicons name="calendar-outline" size={20} color={BLUE} />
              </View>
              <View style={styles.sessionBody}>
                <View style={styles.sessionLabelRow}>
                  <Text style={styles.linkedEventLabel}>LINKED EVENT</Text>
                  <View style={styles.highPriorityBadge}>
                    <Text style={styles.highPriorityText}>High Priority</Text>
                  </View>
                </View>
                <Text style={styles.sessionTitle}>Design Review: Mobile App</Text>
                <View style={styles.sessionTimeRow}>
                  <Ionicons name="time-outline" size={13} color="#888" />
                  <Text style={styles.sessionTimeText}>Ends in 45m 12s</Text>
                </View>
              </View>
            </View>
            <View style={styles.sessionFooter}>
              <TouchableOpacity onPress={() => switchMode('Focus')}>
                <Text style={styles.switchFocusText}>Switch Focus</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Session Options', undefined, [
                { text: 'Mark Done', onPress: () => Alert.alert('Done', 'Session marked complete.') },
                { text: 'Remove Session', style: 'destructive', onPress: () => {} },
                { text: 'Cancel', style: 'cancel' },
              ])}>
                <Ionicons name="ellipsis-vertical" size={18} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>COMPLETED</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValueLarge}>{completedSessions}</Text>
              <Text style={styles.statValueUnit}> sessions</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>DAILY GOAL</Text>
            <Text style={styles.statValuePct}>{goalPct}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${goalPct}%` }]} />
            </View>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateEvent')}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  topBarIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 14 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20, alignItems: 'center' },

  segmentedControl: {
    flexDirection: 'row', backgroundColor: '#F2F2F2', borderRadius: 12,
    padding: 4, width: '100%', marginBottom: 32,
  },
  segmentBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#888' },
  segmentTextActive: { color: '#111', fontWeight: '700' },

  timerArea: { alignItems: 'center', marginBottom: 32, width: '100%' },
  deepWorkPill: {
    borderWidth: 1.5, borderColor: BLUE, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 5, marginBottom: 12,
  },
  deepWorkText: { color: BLUE, fontSize: 13, fontWeight: '700' },
  timerDigits: { fontSize: 72, fontWeight: '800', color: '#111', letterSpacing: -2, lineHeight: 80 },
  timerSub: { fontSize: 14, color: '#888', marginTop: 6, fontWeight: '500' },

  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 28, marginBottom: 36, width: '100%',
  },
  controlSecondary: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
    shadowColor: BLUE, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },

  sessionSection: { width: '100%', marginBottom: 20 },
  sessionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  sessionHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  addNewText: { fontSize: 13, color: BLUE, fontWeight: '600' },

  sessionCard: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#EBEBEB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  sessionCardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  sessionIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EBF4FF', alignItems: 'center', justifyContent: 'center',
  },
  sessionBody: { flex: 1 },
  sessionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  linkedEventLabel: { fontSize: 10, fontWeight: '800', color: '#999', letterSpacing: 1 },
  highPriorityBadge: {
    backgroundColor: '#FDECEA', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#FBCDD0',
  },
  highPriorityText: { fontSize: 11, fontWeight: '700', color: '#D32F2F' },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 5 },
  sessionTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sessionTimeText: { fontSize: 12, color: '#888' },

  sessionFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F5F5F5',
    backgroundColor: '#FAFAFA',
  },
  switchFocusText: { fontSize: 13, color: BLUE, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  statCard: {
    flex: 1, backgroundColor: '#F8F9FA', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#EBEBEB',
  },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#999', letterSpacing: 1, marginBottom: 8 },
  statValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  statValueLarge: { fontSize: 28, fontWeight: '800', color: '#111', lineHeight: 32 },
  statValueUnit: { fontSize: 13, color: '#888', marginBottom: 3 },
  statValuePct: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 8, lineHeight: 32 },
  progressBar: {
    height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: BLUE, borderRadius: 4,
  },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
    shadowColor: BLUE, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
});
