import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  ScrollView,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTaskStore } from '../context/TaskStore';
import { BurgerMenu } from '../components/BurgerMenu';
import { Storage, KEYS } from '../services/StorageService';
import * as Haptics from 'expo-haptics';

const ACCENT = '#4A90D9';

type Tab = 'pomodoro' | 'stopwatch';
type PomMode = 'Focus' | 'Short Break' | 'Long Break';

const MODE_DURATIONS: Record<PomMode, number> = {
  'Focus': 25 * 60,
  'Short Break': 5 * 60,
  'Long Break': 15 * 60,
};
const MODE_COLORS: Record<PomMode, string> = {
  'Focus': '#4A90D9',
  'Short Break': '#3DAE7C',
  'Long Break': '#9B6DD4',
};

function pad(n: number) { return n.toString().padStart(2, '0'); }

// ──────────────────────────────────────────────────────────────────────────────
// Animated FAB helper
// ──────────────────────────────────────────────────────────────────────────────
function useFabScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  return { scale, onPressIn, onPressOut };
}

// ──────────────────────────────────────────────────────────────────────────────
// Circular progress ring (SVG-free, using two rotated borders)
// ──────────────────────────────────────────────────────────────────────────────
function ProgressRing({ pct, color, size, strokeWidth, trackColor }: { pct: number; color: string; size: number; strokeWidth: number; trackColor: string }) {
  const r = (size - strokeWidth) / 2;
  const circum = 2 * Math.PI * r;
  const progress = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [pct]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circum, 0],
  });

  // Fallback: use a solid arc via rotation trick with View borders
  const clampedPct = Math.max(0, Math.min(1, pct));
  const deg = clampedPct * 360;
  const half = size / 2;
  const outerR = half;
  const innerR = half - strokeWidth;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: outerR,
        borderWidth: strokeWidth, borderColor: trackColor,
      }} />
      {/* Progress arc using clip trick */}
      {deg <= 180 ? (
        <View style={{ position: 'absolute', width: size, height: size }}>
          <View style={{
            position: 'absolute', width: size, height: size,
            borderRadius: outerR, borderWidth: strokeWidth,
            borderColor: 'transparent', borderTopColor: color, borderRightColor: color,
            transform: [{ rotate: `-90deg` }],
            opacity: deg > 0 ? 1 : 0,
          }} />
          <View style={{
            position: 'absolute', width: size, height: size,
            borderRadius: outerR, borderWidth: strokeWidth,
            borderColor: 'transparent', borderTopColor: color,
            transform: [{ rotate: `${deg - 90}deg` }],
            opacity: deg >= 90 ? 0 : 1,
          }} />
        </View>
      ) : (
        <View style={{ position: 'absolute', width: size, height: size }}>
          <View style={{
            position: 'absolute', width: size, height: size,
            borderRadius: outerR, borderWidth: strokeWidth,
            borderColor: color,
            borderBottomColor: deg < 270 ? 'transparent' : color,
            borderLeftColor: deg < 360 ? 'transparent' : color,
            transform: [{ rotate: `-90deg` }],
          }} />
          <View style={{
            position: 'absolute', width: size, height: size,
            borderRadius: outerR, borderWidth: strokeWidth,
            borderColor: 'transparent', borderTopColor: color, borderRightColor: color,
            transform: [{ rotate: `${deg - 270}deg` }],
            opacity: deg <= 180 ? 0 : 1,
          }} />
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// POMODORO TAB
// ──────────────────────────────────────────────────────────────────────────────
function PomodoroTab({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const [mode, setMode] = useState<PomMode>('Focus');
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MODE_DURATIONS['Focus']);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { scale: playScale, onPressIn: playIn, onPressOut: playOut } = useFabScale();
  const { notes } = useTaskStore();
  const [linkedNoteId, setLinkedNoteId] = useState<string | null>(null);
  const [notePickerVisible, setNotePickerVisible] = useState(false);
  const linkedNote = notes.find(n => n.id === linkedNoteId) ?? null;

  // Load persisted count on mount
  useEffect(() => {
    Storage.get<number>(KEYS.SESSIONS).then(n => { if (n != null) setSessions(n); });
    Storage.get<string>(KEYS.LINKED_NOTE).then(id => { if (id) setLinkedNoteId(id); });
  }, []);

  const persistSessions = (n: number) => {
    setSessions(n);
    Storage.set(KEYS.SESSIONS, n);
  };

  const switchMode = useCallback((m: PomMode) => {
    setRunning(false);
    setMode(m);
    setTimeLeft(MODE_DURATIONS[m]);
  }, []);

  const handleEnd = useCallback(() => {
    setRunning(false);
    if (mode === 'Focus') {
      const next = sessions + 1;
      persistSessions(next);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Session complete! 🎉',
        linkedNote ? `Working on: "${linkedNote.title || 'Untitled'}"` : undefined,
        [
          { text: 'Short Break', onPress: () => switchMode('Short Break') },
          { text: 'Long Break', onPress: () => switchMode('Long Break') },
          { text: 'Stay focused', onPress: () => switchMode('Focus') },
        ],
      );
    } else {
      Alert.alert('Break over!', undefined, [
        { text: 'Start Focus', onPress: () => switchMode('Focus') },
        { text: 'Not yet', style: 'cancel', onPress: () => switchMode(mode) },
      ]);
    }
  }, [mode, switchMode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            handleEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, handleEnd]);

  const total = MODE_DURATIONS[mode];
  const pct = 1 - timeLeft / total;
  const color = MODE_COLORS[mode];
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const dailyGoal = 8;

  return (
    <ScrollView contentContainerStyle={pom.scroll} showsVerticalScrollIndicator={false}>
      {/* Mode pills */}
      <View style={pom.modePills}>
        {(['Focus', 'Short Break', 'Long Break'] as PomMode[]).map(m => (
          <TouchableOpacity
            key={m}
            style={[pom.modePill, { backgroundColor: mode === m ? MODE_COLORS[m] : theme.segBg }]}
            onPress={() => switchMode(m)}
          >
            <Text style={[pom.modePillText, { color: mode === m ? '#fff' : theme.textDim }]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main ring */}
      <View style={pom.ringWrap}>
        <ProgressRing pct={pct} color={color} size={240} strokeWidth={10} trackColor={theme.border} />
        <View style={pom.ringCenter}>
          <Text style={[pom.modeLabel, { color: theme.textDim }]}>{mode.toUpperCase()}</Text>
          <Text style={[pom.digits, { color }]}>
            {pad(mins)}:{pad(secs)}
          </Text>
          <Text style={[pom.runSub, { color: theme.textDim }]}>{running ? 'Running…' : 'Paused'}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={pom.controls}>
        <TouchableOpacity
          style={[pom.ctrlBtn, { borderColor: theme.border }]}
          onPress={() => { setRunning(false); setTimeLeft(MODE_DURATIONS[mode]); }}
        >
          <Ionicons name="refresh" size={22} color={theme.textDim} />
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: playScale }] }}>
          <TouchableOpacity
            style={[pom.playBtn, { backgroundColor: color }]}
            onPressIn={playIn}
            onPressOut={playOut}
            onPress={() => setRunning(r => !r)}
            activeOpacity={1}
          >
            <Ionicons name={running ? 'pause' : 'play'} size={30} color="#fff" style={{ marginLeft: running ? 0 : 3 }} />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={[pom.ctrlBtn, { borderColor: theme.border }]}
          onPress={() => {
            setRunning(false);
            if (mode === 'Focus') { setSessions(s => s + 1); switchMode('Short Break'); }
            else switchMode('Focus');
          }}
        >
          <Ionicons name="play-skip-forward" size={22} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={[pom.statsRow, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
        <View style={pom.statItem}>
          <Text style={[pom.statVal, { color: theme.text }]}>{sessions}</Text>
          <Text style={[pom.statLabel, { color: theme.textDim }]}>Completed</Text>
        </View>
        <View style={[pom.statDivider, { backgroundColor: theme.border }]} />
        <View style={pom.statItem}>
          <Text style={[pom.statVal, { color: theme.text }]}>{dailyGoal}</Text>
          <Text style={[pom.statLabel, { color: theme.textDim }]}>Daily Goal</Text>
        </View>
        <View style={[pom.statDivider, { backgroundColor: theme.border }]} />
        <View style={pom.statItem}>
          <Text style={[pom.statVal, { color: theme.text }]}>{Math.round((sessions / dailyGoal) * 100)}%</Text>
          <Text style={[pom.statLabel, { color: theme.textDim }]}>Progress</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[pom.progressTrack, { backgroundColor: theme.border }]}>
        <View style={[pom.progressFill, { width: `${Math.min((sessions / dailyGoal) * 100, 100)}%` as any, backgroundColor: color }]} />
      </View>

      <View style={{ height: 40 }} />

      {/* ── Linked note chip + link button ── */}
      <View style={pom.linkRow}>
        {linkedNote ? (
          <View style={[pom.linkedChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="notebook-outline" size={15} color={ACCENT} />
            <Text style={[pom.linkedChipText, { color: theme.text }]} numberOfLines={1}>
              {linkedNote.title || 'Untitled note'}
            </Text>
            <TouchableOpacity onPress={() => { setLinkedNoteId(null); Storage.set(KEYS.LINKED_NOTE, ''); }}>
              <Ionicons name="close-circle" size={16} color={theme.textDim} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[pom.linkBtn, { backgroundColor: theme.bg2, borderColor: theme.border }]}
            onPress={() => setNotePickerVisible(true)}
          >
            <Ionicons name="link-outline" size={16} color={ACCENT} />
            <Text style={[pom.linkBtnText, { color: ACCENT }]}>Link a Note</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Note picker modal ── */}
      <Modal visible={notePickerVisible} transparent animationType="slide" onRequestClose={() => setNotePickerVisible(false)}>
        <Pressable style={pom.pickerOverlay} onPress={() => setNotePickerVisible(false)} />
        <View style={[pom.pickerSheet, { backgroundColor: theme.card }]}>
          <Text style={[pom.pickerTitle, { color: theme.text }]}>Link a Note</Text>
          {notes.length === 0 && (
            <Text style={{ color: theme.textDim, textAlign: 'center', paddingVertical: 20 }}>No notes yet</Text>
          )}
          <ScrollView>
            {notes.map(n => (
              <TouchableOpacity
                key={n.id}
                style={[pom.pickerRow, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setLinkedNoteId(n.id);
                  Storage.set(KEYS.LINKED_NOTE, n.id);
                  setNotePickerVisible(false);
                }}
              >
                <MaterialCommunityIcons name="notebook-outline" size={18} color={ACCENT} style={{ marginRight: 10 }} />
                <Text style={[pom.pickerRowText, { color: theme.text }]} numberOfLines={1}>
                  {n.title || 'Untitled note'}
                </Text>
                {linkedNoteId === n.id && <Ionicons name="checkmark" size={18} color={ACCENT} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
  );
}

const pom = StyleSheet.create({
  scroll: { alignItems: 'center', paddingTop: 28, paddingHorizontal: 24 },
  modePills: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  modePill: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 20, backgroundColor: '#F0F0F0',
  },
  modePillText: { fontSize: 13, fontWeight: '600', color: '#888' },
  ringWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  modeLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  digits: { fontSize: 52, fontWeight: '800', letterSpacing: -1, lineHeight: 58 },
  runSub: { fontSize: 13, marginTop: 6, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 32, marginBottom: 36 },
  ctrlBtn: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', borderRadius: 16, borderWidth: 1,
    paddingVertical: 18, marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32 },
  statVal: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  linkRow: { width: '100%', alignItems: 'center', paddingBottom: 24, paddingTop: 4 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  linkBtnText: { fontSize: 14, fontWeight: '700' },
  linkedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 9,
    maxWidth: '90%',
  },
  linkedChipText: { fontSize: 14, fontWeight: '600', flex: 1 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32,
    maxHeight: '60%',
  },
  pickerTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1,
  },
  pickerRowText: { fontSize: 15, fontWeight: '500', flex: 1 },
});

// ──────────────────────────────────────────────────────────────────────────────
// STOPWATCH TAB
// ──────────────────────────────────────────────────────────────────────────────
interface LapRecord { lap: number; time: number; split: number; }

function StopwatchTab({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<LapRecord[]>([]);
  const startRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const animRef = useRef<number | null>(null);
  const { scale: btnScale, onPressIn: btnIn, onPressOut: btnOut } = useFabScale();
  const { scale: lapScale, onPressIn: lapIn, onPressOut: lapOut } = useFabScale();

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsedRef.current;
      const tick = () => {
        const now = Date.now() - startRef.current;
        elapsedRef.current = now;
        setElapsed(now);
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [running]);

  const formatMs = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`;
    return `${pad(m)}:${pad(s)}.${pad(cs)}`;
  };

  const handleLap = () => {
    const prev = laps.length > 0 ? laps[laps.length - 1].time : 0;
    setLaps(l => [...l, { lap: l.length + 1, time: elapsed, split: elapsed - prev }]);
  };

  const handleReset = () => {
    setRunning(false);
    elapsedRef.current = 0;
    setElapsed(0);
    setLaps([]);
  };

  const bestLap = laps.length > 1 ? Math.min(...laps.map(l => l.split)) : null;
  const worstLap = laps.length > 1 ? Math.max(...laps.map(l => l.split)) : null;

  return (
    <View style={sw.root}>
      {/* Big display */}
      <View style={sw.displayWrap}>
        <Text style={[sw.digits, { color: theme.text }]}>{formatMs(elapsed)}</Text>
        {laps.length > 0 && (
          <Text style={[sw.lapHint, { color: theme.textDim }]}>Lap {laps.length + 1} · {formatMs(elapsed - laps[laps.length - 1].time)}</Text>
        )}
      </View>

      {/* Buttons */}
      <View style={sw.btnRow}>
        {/* Lap / Reset */}
        <Animated.View style={{ transform: [{ scale: lapScale }] }}>
          <TouchableOpacity
            style={[sw.sideBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPressIn={lapIn} onPressOut={lapOut}
            onPress={running ? handleLap : handleReset}
            activeOpacity={1}
          >
            <Text style={[sw.sideBtnText, { color: theme.text }]}>{running ? 'Lap' : 'Reset'}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Start / Stop */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[sw.mainBtn, { backgroundColor: running ? '#C0392B' : '#2ECC71' }]}
            onPressIn={btnIn} onPressOut={btnOut}
            onPress={() => setRunning(r => !r)}
            activeOpacity={1}
          >
            <Text style={sw.mainBtnText}>{running ? 'Stop' : 'Start'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Laps */}
      {laps.length > 0 && (
        <FlatList
          data={[...laps].reverse()}
          keyExtractor={item => item.lap.toString()}
          style={sw.lapList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isBest = bestLap !== null && item.split === bestLap;
            const isWorst = worstLap !== null && item.split === worstLap;
            return (
              <View style={[sw.lapRow, { borderTopColor: theme.border }]}>
                <Text style={[sw.lapNum, { color: theme.textDim }]}>Lap {item.lap}</Text>
                <Text style={[
                  sw.lapSplit, { color: theme.text },
                  isBest && { color: '#2ECC71' },
                  isWorst && { color: '#E05252' },
                ]}>{formatMs(item.split)}</Text>
                <Text style={[sw.lapTotal, { color: theme.textDim }]}>{formatMs(item.time)}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const sw = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  displayWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 20 },
  digits: { fontSize: 64, fontWeight: '300', letterSpacing: -1, fontVariant: ['tabular-nums'] as any },
  lapHint: { fontSize: 16, marginTop: 10 },
  btnRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 48, paddingVertical: 32,
  },
  sideBtn: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  sideBtnText: { fontSize: 17, fontWeight: '600' },
  mainBtn: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  mainBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  lapList: { width: '100%', flex: 1 },
  lapRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 13,
    borderTopWidth: 1,
  },
  lapNum: { width: 60, fontSize: 15 },
  lapSplit: { flex: 1, fontSize: 15, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] as any },
  lapTotal: { width: 90, fontSize: 14, textAlign: 'right', fontVariant: ['tabular-nums'] as any },
});

// ──────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ──────────────────────────────────────────────────────────────────────────────
export default function FocusScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('pomodoro');
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[main.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[main.header, { borderBottomColor: theme.border }]}>
        <BurgerMenu navigation={navigation} />
        <Text style={[main.headerTitle, { color: theme.text }]}>{tab === 'pomodoro' ? 'Pomodoro' : 'Stopwatch'}</Text>
        <TouchableOpacity onPress={() => Alert.alert('Settings', 'Timer settings coming soon.')}>
          <Ionicons name="ellipsis-vertical" size={20} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[main.tabBar, { backgroundColor: theme.segBg }]}>
        <TouchableOpacity
          style={[main.tabBtn, tab === 'pomodoro' && [main.tabBtnActive, { backgroundColor: theme.segActive }]]}
          onPress={() => setTab('pomodoro')}
        >
          <MaterialCommunityIcons
            name="timer-outline"
            size={18}
            color={tab === 'pomodoro' ? ACCENT : theme.textDim}
          />
          <Text style={[main.tabText, { color: tab === 'pomodoro' ? theme.text : theme.textDim }]}>Pomodoro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[main.tabBtn, tab === 'stopwatch' && [main.tabBtnActive, { backgroundColor: theme.segActive }]]}
          onPress={() => setTab('stopwatch')}
        >
          <Ionicons
            name="stopwatch-outline"
            size={18}
            color={tab === 'stopwatch' ? ACCENT : theme.textDim}
          />
          <Text style={[main.tabText, { color: tab === 'stopwatch' ? theme.text : theme.textDim }]}>Stopwatch</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {tab === 'pomodoro' ? <PomodoroTab theme={theme} /> : <StopwatchTab theme={theme} />}
      </View>
    </SafeAreaView>
  );
}

const main = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20, marginVertical: 12,
    borderRadius: 14, padding: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 11,
  },
  tabBtnActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },
  tabTextActive: {},
});