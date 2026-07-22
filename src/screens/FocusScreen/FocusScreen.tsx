import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, View, TouchableOpacity, Animated, Alert, ScrollView, FlatList, Modal, Pressable } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useTaskStore } from '@/context/TaskStore';
import { useAuth } from '@/context/AuthContext';
import { BurgerMenu } from '@/components/BurgerMenu';
import { Storage, KEYS } from '@/services/StorageService';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Svg, { Circle } from 'react-native-svg';
import { pom, sw, main } from './styles';
import { AppBackground, ScreenSkeleton } from '@/components/ui';
import { requestNotificationPermission, cancelNotification } from '@/services/NotificationService';
import { hydrateFocusSessions, saveFocusSessions } from '@/services/FocusStatsService';


type Tab = 'pomodoro' | 'stopwatch';
type PomMode = 'Focus' | 'Short Break' | 'Long Break';

const MODE_DURATIONS: Record<PomMode, number> = {
  'Focus': 25 * 60,
  'Short Break': 5 * 60,
  'Long Break': 15 * 60,
};
function pad(n: number) { return n.toString().padStart(2, '0'); }

// ------------------------------------------------------------------------------
// Animated FAB helper
// ------------------------------------------------------------------------------
function useFabScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  return { scale, onPressIn, onPressOut };
}

// ------------------------------------------------------------------------------
// Circular progress ring
// ------------------------------------------------------------------------------
function ProgressRing({ pct, color, size, strokeWidth, trackColor }: { pct: number; color: string; size: number; strokeWidth: number; trackColor: string }) {
  const r = (size - strokeWidth) / 2;
  const circum = 2 * Math.PI * r;
  const clampedPct = Math.max(0, Math.min(1, pct));

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${circum} ${circum}`} strokeDashoffset={circum * (1 - clampedPct)} />
    </Svg>
  );
}

// ------------------------------------------------------------------------------
// POMODORO TAB
// ------------------------------------------------------------------------------
function PomodoroTab({ theme, navigation, menuRequest }: { theme: ReturnType<typeof useTheme>['theme']; navigation: any; menuRequest: number }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<PomMode>('Focus');
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MODE_DURATIONS['Focus']);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const completionHandledRef = useRef(false);
  const handledMenuRequestRef = useRef(0);
  const { scale: playScale, onPressIn: playIn, onPressOut: playOut } = useFabScale();
  const { notes } = useTaskStore();
  const [linkedNoteId, setLinkedNoteId] = useState<string | null>(null);
  const [notePickerVisible, setNotePickerVisible] = useState(false);
  const linkedNote = notes.find(n => n.id === linkedNoteId) ?? null;
  const availableNotes = notes.filter(note => !note.archived);
  const POMODORO_NOTIF_ID = 'pomodoro_end';

  const clearPomodoroAlert = useCallback(async () => {
    await cancelNotification(POMODORO_NOTIF_ID);
  }, []);

  const schedulePomodoroAlert = useCallback(async (seconds: number, nextMode: PomMode) => {
    if (seconds <= 0) return;

    const notifOk = await requestNotificationPermission();
    if (!notifOk) return;
    await Notifications.setNotificationChannelAsync('focus-timers', {
      name: 'Focus timers',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 250, 150, 250],
    });
    await Notifications.scheduleNotificationAsync({
      identifier: POMODORO_NOTIF_ID,
      content: {
        title: 'Pomodoro complete',
        body: nextMode === 'Focus' ? 'Time for a break.' : 'Ready to focus again?',
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: 'focus-timers' },
    });
  }, []);

  // Load persisted count on mount
  useEffect(() => {
    if (!user) return;
    setLinkedNoteId(null);
    void hydrateFocusSessions(user.id, setSessions);
    Storage.getForUser<string>(KEYS.LINKED_NOTE, user.id).then(id => { if (id) setLinkedNoteId(id); });
  }, [user?.id]);

  const switchMode = useCallback((m: PomMode) => {
    setRunning(false);
    deadlineRef.current = null;
    completionHandledRef.current = false;
    clearPomodoroAlert().catch(() => {});
    setMode(m);
    setTimeLeft(MODE_DURATIONS[m]);
  }, [clearPomodoroAlert]);

  const handleEnd = useCallback(() => {
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;
    setRunning(false);
    deadlineRef.current = null;
    clearPomodoroAlert().catch(() => {});
    if (mode === 'Focus') {
      setSessions(previous => {
        const next = previous + 1;
        if (user) void saveFocusSessions(user.id, next);
        return next;
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Focus session complete',
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
  }, [clearPomodoroAlert, linkedNote, mode, switchMode, user]);

  useEffect(() => {
    if (!running || !deadlineRef.current) return undefined;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadlineRef.current! - Date.now()) / 1000));
      setTimeLeft(seconds);
      if (seconds === 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        handleEnd();
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 250);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, handleEnd]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && running && deadlineRef.current) {
        const seconds = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
        setTimeLeft(seconds);
        if (seconds === 0) handleEnd();
      }
    });
    return () => subscription.remove();
  }, [handleEnd, running]);

  const resetTimer = useCallback(() => {
    setRunning(false);
    deadlineRef.current = null;
    completionHandledRef.current = false;
    setTimeLeft(MODE_DURATIONS[mode]);
    void clearPomodoroAlert();
  }, [clearPomodoroAlert, mode]);

  const toggleTimer = () => {
    if (running) {
      const remaining = deadlineRef.current ? Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)) : timeLeft;
      setTimeLeft(remaining);
      setRunning(false);
      deadlineRef.current = null;
      void clearPomodoroAlert();
      return;
    }
    const seconds = timeLeft > 0 ? timeLeft : MODE_DURATIONS[mode];
    completionHandledRef.current = false;
    setTimeLeft(seconds);
    deadlineRef.current = Date.now() + seconds * 1000;
    setRunning(true);
    void schedulePomodoroAlert(seconds, mode);
  };

  const unlinkNote = () => {
    setLinkedNoteId(null);
    if (user) void Storage.removeForUser(KEYS.LINKED_NOTE, user.id);
  };

  const selectNote = (id: string) => {
    setLinkedNoteId(id);
    if (user) void Storage.setForUser(KEYS.LINKED_NOTE, user.id, id);
    setNotePickerVisible(false);
    void Haptics.selectionAsync();
  };

  useEffect(() => {
    if (menuRequest === 0 || handledMenuRequestRef.current === menuRequest) return;
    handledMenuRequestRef.current = menuRequest;
    Alert.alert('Focus options', undefined, [
      { text: 'Reset current timer', onPress: resetTimer },
      { text: linkedNote ? 'Change linked note' : 'Link a note', onPress: () => setNotePickerVisible(true) },
      { text: 'View focus statistics', onPress: () => navigation.navigate('Stats') },
      ...(linkedNote ? [{ text: 'Unlink current note', onPress: unlinkNote }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [linkedNote, menuRequest, navigation, resetTimer, user]);

  const total = MODE_DURATIONS[mode];
  const pct = timeLeft / total;
  const color = mode === 'Focus' ? theme.accent.base : mode === 'Short Break' ? theme.semantic.success : theme.semantic.info;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const dailyGoal = 8;

  return (
    <ScrollView contentContainerStyle={pom.scroll} showsVerticalScrollIndicator={false}>
      <View style={[pom.timerCard, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}>
        <View style={[pom.modePills, { backgroundColor: theme.glass.secondary }]}> 
          {(['Focus', 'Short Break', 'Long Break'] as PomMode[]).map(m => {
            const selected = mode === m;
            const modeColor = m === 'Focus' ? theme.accent.base : m === 'Short Break' ? theme.semantic.success : theme.semantic.info;
            return (
              <TouchableOpacity key={m} accessibilityRole="button" accessibilityState={{ selected }} style={[pom.modePill, selected && { backgroundColor: theme.glass.solid }]} onPress={() => switchMode(m)}>
                <Text style={[pom.modePillText, { color: selected ? modeColor : theme.content.muted }]}>{m === 'Short Break' ? 'Short' : m === 'Long Break' ? 'Long' : m}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={pom.ringWrap}>
          <ProgressRing pct={pct} color={color} size={220} strokeWidth={8} trackColor={theme.divider} />
          <View style={pom.ringCenter}>
            <Text style={[pom.modeLabel, { color: theme.content.muted }]}>{mode}</Text>
            <Text accessibilityLiveRegion="polite" style={[pom.digits, { color: theme.content.primary }]}>{pad(mins)}:{pad(secs)}</Text>
            <View style={[pom.statusPill, { backgroundColor: running ? `${color}1F` : theme.glass.secondary }]}><View style={[pom.statusDot, { backgroundColor: running ? color : theme.content.muted }]} /><Text style={[pom.runSub, { color: running ? color : theme.content.secondary }]}>{running ? 'In progress' : 'Ready'}</Text></View>
          </View>
        </View>

        <View style={pom.controls}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reset timer" style={[pom.ctrlBtn, { backgroundColor: theme.glass.secondary }]} onPress={resetTimer}><Ionicons name="refresh" size={21} color={theme.content.secondary} /></TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: playScale }] }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={running ? 'Pause timer' : 'Start timer'} style={[pom.playBtn, { backgroundColor: color }]} onPressIn={playIn} onPressOut={playOut} onPress={toggleTimer} activeOpacity={1}>
              <Ionicons name={running ? 'pause' : 'play'} size={31} color="#fff" style={{ marginLeft: running ? 0 : 3 }} />
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Skip to next timer" style={[pom.ctrlBtn, { backgroundColor: theme.glass.secondary }]} onPress={() => switchMode(mode === 'Focus' ? 'Short Break' : 'Focus')}><Ionicons name="play-skip-forward" size={21} color={theme.content.secondary} /></TouchableOpacity>
        </View>
      </View>

      <View style={[pom.statsRow, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}> 
        <View style={pom.statItem}>
          <Text style={[pom.statVal, { color: theme.content.primary }]}>{sessions}</Text>
          <Text style={[pom.statLabel, { color: theme.content.muted }]}>Completed</Text>
        </View>
        <View style={[pom.statDivider, { backgroundColor: theme.divider }]} />
        <View style={pom.statItem}>
          <Text style={[pom.statVal, { color: theme.content.primary }]}>{dailyGoal}</Text>
          <Text style={[pom.statLabel, { color: theme.content.muted }]}>Daily goal</Text>
        </View>
        <View style={[pom.statDivider, { backgroundColor: theme.divider }]} />
        <View style={pom.statItem}>
          <Text style={[pom.statVal, { color: theme.content.primary }]}>{Math.min(Math.round((sessions / dailyGoal) * 100), 100)}%</Text>
          <Text style={[pom.statLabel, { color: theme.content.muted }]}>Progress</Text>
        </View>
      </View>

      <View style={[pom.contextCard, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}> 
        <View style={pom.contextHeader}><View style={[pom.contextIcon, { backgroundColor: theme.accent.soft }]}><MaterialCommunityIcons name="notebook-outline" size={22} color={theme.accent.base} /></View><View style={pom.contextHeaderCopy}><Text style={[pom.contextTitle, { color: theme.content.primary }]}>Focus note</Text><Text style={[pom.contextSubtitle, { color: theme.content.secondary }]}>Keep the session connected to what matters.</Text></View></View>
        {linkedNote ? (
          <View style={[pom.linkedNote, { backgroundColor: theme.glass.secondary }]}> 
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${linkedNote.title || 'Untitled note'}`} style={pom.linkedMain} onPress={() => navigation.navigate('Tasks', { section: 'notes', noteId: linkedNote.id, noteRequest: Date.now() })}>
              <View style={pom.linkedCopy}><Text style={[pom.linkedLabel, { color: theme.content.muted }]}>LINKED NOTE</Text><Text style={[pom.linkedTitle, { color: theme.content.primary }]} numberOfLines={1}>{linkedNote.title || 'Untitled note'}</Text><Text style={[pom.linkedMeta, { color: theme.content.secondary }]} numberOfLines={1}>{linkedNote.category || 'Personal'} · Tap to open</Text></View><Ionicons name="chevron-forward" size={20} color={theme.content.muted} />
            </TouchableOpacity>
            <View style={[pom.linkActions, { borderTopColor: theme.divider }]}><TouchableOpacity accessibilityRole="button" style={pom.linkAction} onPress={() => setNotePickerVisible(true)}><Ionicons name="swap-horizontal" size={17} color={theme.accent.base} /><Text style={[pom.linkActionText, { color: theme.accent.base }]}>Change</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={pom.linkAction} onPress={unlinkNote}><Ionicons name="unlink-outline" size={17} color={theme.content.secondary} /><Text style={[pom.linkActionText, { color: theme.content.secondary }]}>Unlink</Text></TouchableOpacity></View>
          </View>
        ) : (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Link a note to this focus session" style={[pom.linkBtn, { backgroundColor: theme.accent.soft }]} onPress={() => setNotePickerVisible(true)}><Ionicons name="link-outline" size={19} color={theme.accent.base} /><Text style={[pom.linkBtnText, { color: theme.accent.base }]}>Choose a note</Text></TouchableOpacity>
        )}
      </View>

      <Modal visible={notePickerVisible} transparent animationType="slide" onRequestClose={() => setNotePickerVisible(false)}>
        <Pressable style={pom.pickerOverlay} onPress={() => setNotePickerVisible(false)} />
        <View style={[pom.pickerSheet, { backgroundColor: theme.glass.solid }]}> 
          <View style={[pom.pickerHandle, { backgroundColor: theme.divider }]} />
          <View style={pom.pickerHeader}><View><Text style={[pom.pickerTitle, { color: theme.content.primary }]}>Link a note</Text><Text style={[pom.pickerSubtitle, { color: theme.content.secondary }]}>Choose one note for this focus session.</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close note picker" style={[pom.pickerClose, { backgroundColor: theme.glass.secondary }]} onPress={() => setNotePickerVisible(false)}><Ionicons name="close" size={20} color={theme.content.primary} /></TouchableOpacity></View>
          {availableNotes.length === 0 ? <View style={pom.pickerEmpty}><Text style={[pom.pickerEmptyTitle, { color: theme.content.primary }]}>No active notes yet</Text><Text style={[pom.pickerEmptyText, { color: theme.content.secondary }]}>Create a note in Organize, then return to link it.</Text><TouchableOpacity style={[pom.pickerOpenNotes, { backgroundColor: theme.accent.base }]} onPress={() => { setNotePickerVisible(false); navigation.navigate('Tasks', { section: 'notes' }); }}><Text style={pom.pickerOpenNotesText}>Open notes</Text></TouchableOpacity></View> : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableNotes.map(n => {
                const selected = linkedNoteId === n.id;
                return <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected }} key={n.id} style={[pom.pickerRow, { borderBottomColor: theme.divider }]} onPress={() => selectNote(n.id)}><View style={[pom.pickerNoteIcon, { backgroundColor: selected ? theme.accent.soft : theme.glass.secondary }]}><MaterialCommunityIcons name="notebook-outline" size={20} color={selected ? theme.accent.base : theme.content.secondary} /></View><View style={pom.pickerRowCopy}><Text style={[pom.pickerRowText, { color: theme.content.primary }]} numberOfLines={1}>{n.title || 'Untitled note'}</Text><Text style={[pom.pickerRowMeta, { color: theme.content.muted }]} numberOfLines={1}>{n.category || 'Personal'}</Text></View>{selected ? <Ionicons name="checkmark-circle" size={22} color={theme.accent.base} /> : <Ionicons name="chevron-forward" size={18} color={theme.content.muted} />}</TouchableOpacity>;
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

// ------------------------------------------------------------------------------
// STOPWATCH TAB
// ------------------------------------------------------------------------------
interface LapRecord { lap: number; time: number; split: number; }

function StopwatchTab({ theme, bottomClearance }: { theme: ReturnType<typeof useTheme>['theme']; bottomClearance: number }) {
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
    <View style={[sw.root, { paddingBottom: bottomClearance }]}>
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

// ------------------------------------------------------------------------------
// MAIN SCREEN
// ------------------------------------------------------------------------------
export default function FocusScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('pomodoro');
  const [menuRequest, setMenuRequest] = useState(0);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLoading } = useTaskStore();
  const bottomNavigationClearance = Math.max(insets.bottom, 8) + 92;

  if (isLoading) return <ScreenSkeleton variant="dashboard" />;

  return (
    <SafeAreaView style={[main.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
      <AppBackground />
      {/* Header */}
      <View style={[main.header, { borderBottomColor: 'transparent' }]}>
        <BurgerMenu navigation={navigation} />
        <Text style={[main.headerTitle, { color: theme.text }]}>{tab === 'pomodoro' ? 'Pomodoro' : 'Stopwatch'}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={tab === 'pomodoro' ? 'Open focus options' : 'Open stopwatch options'}
          style={main.headerAction}
          onPress={() => {
            if (tab === 'pomodoro') setMenuRequest(value => value + 1);
            else Alert.alert('Stopwatch options', undefined, [
              { text: 'Switch to Pomodoro', onPress: () => setTab('pomodoro') },
              { text: 'View focus statistics', onPress: () => navigation.navigate('Stats') },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[main.tabBar, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>
        <TouchableOpacity
          style={[main.tabBtn, tab === 'pomodoro' && [main.tabBtnActive, { backgroundColor: theme.segActive }]]}
          onPress={() => setTab('pomodoro')}
        >
          <MaterialCommunityIcons
            name="timer-outline"
            size={18}
            color={tab === 'pomodoro' ? theme.accent.base : theme.textDim}
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
            color={tab === 'stopwatch' ? theme.accent.base : theme.textDim}
          />
          <Text style={[main.tabText, { color: tab === 'stopwatch' ? theme.text : theme.textDim }]}>Stopwatch</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {tab === 'pomodoro' ? <PomodoroTab theme={theme} navigation={navigation} menuRequest={menuRequest} /> : <StopwatchTab theme={theme} bottomClearance={bottomNavigationClearance} />}
      </View>
    </SafeAreaView>
  );
}
