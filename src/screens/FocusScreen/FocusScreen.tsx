import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, View, TouchableOpacity, Animated, ScrollView, FlatList, Modal, Pressable } from 'react-native';
import { AppAlert as Alert } from '@/components/ui/AppDialog';
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
import { pom, sw, main } from './styles';
import { AppBackground, ProgressRing, ScreenSkeleton } from '@/components/ui';
import { requestNotificationPermission, cancelNotification } from '@/services/NotificationService';
import { useFocusSessions } from '@/context/FocusSessionContext';
import {
  focusSessionElapsedMs,
  focusSessionExpectedEndAt,
  type FocusSession,
} from '@/types/focus';


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
// POMODORO TAB
// ------------------------------------------------------------------------------
function PomodoroTab({ theme, navigation, menuRequest }: { theme: ReturnType<typeof useTheme>['theme']; navigation: any; menuRequest: number }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<PomMode>('Focus');
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MODE_DURATIONS['Focus']);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const completionHandledRef = useRef(false);
  const activeSessionRef = useRef<FocusSession | null>(null);
  const handledMenuRequestRef = useRef(0);
  const { scale: playScale, onPressIn: playIn, onPressOut: playOut } = useFabScale();
  const { notes, tasks, setTaskStatus } = useTaskStore();
  const {
    activePomodoro,
    metrics,
    preferences,
    startSession,
    pauseSession,
    resumeSession,
    finishSession,
    updateSessionLinks,
    setDailyGoalMinutes,
  } = useFocusSessions();
  const [linkedNoteId, setLinkedNoteId] = useState<string | null>(null);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [notePickerVisible, setNotePickerVisible] = useState(false);
  const [taskPickerVisible, setTaskPickerVisible] = useState(false);
  const linkedNote = notes.find(n => n.id === linkedNoteId) ?? null;
  const linkedTask = tasks.find(task => task.id === linkedTaskId) ?? null;
  const availableNotes = notes.filter(note => !note.archived);
  const availableTasks = tasks.filter(task => task.status !== 'completed');
  const POMODORO_NOTIF_ID = 'pomodoro_end';

  useEffect(() => {
    activeSessionRef.current = activePomodoro;
  }, [activePomodoro]);

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

  useEffect(() => {
    if (!user) return;
    setLinkedNoteId(null);
    setLinkedTaskId(null);
    Storage.getForUser<string>(KEYS.LINKED_NOTE, user.id).then(id => { if (id) setLinkedNoteId(id); });
    Storage.getForUser<string>(KEYS.LINKED_TASK, user.id).then(id => { if (id) setLinkedTaskId(id); });
  }, [user?.id]);

  const closeTrackedSession = useCallback((completed: boolean, endedAt = Date.now()) => {
    const current = activeSessionRef.current;
    if (!current) return null;
    const finished = finishSession(current.id, completed, endedAt);
    activeSessionRef.current = finished;
    return finished;
  }, [finishSession]);

  const switchMode = useCallback((m: PomMode, preserveFinishedSession = false) => {
    if (!preserveFinishedSession && mode === 'Focus') closeTrackedSession(false);
    setRunning(false);
    deadlineRef.current = null;
    completionHandledRef.current = false;
    clearPomodoroAlert().catch(() => {});
    setMode(m);
    setTimeLeft(MODE_DURATIONS[m]);
  }, [clearPomodoroAlert, closeTrackedSession, mode]);

  const handleEnd = useCallback(() => {
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;
    const completedAt = deadlineRef.current ?? Date.now();
    setRunning(false);
    deadlineRef.current = null;
    clearPomodoroAlert().catch(() => {});
    if (mode === 'Focus') {
      closeTrackedSession(true, completedAt);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Focus session complete',
        linkedTask
          ? `Focused on: "${linkedTask.title}"`
          : linkedNote
            ? `Working on: "${linkedNote.title || 'Untitled'}"`
            : undefined,
        [
          { text: 'Short Break', onPress: () => switchMode('Short Break', true) },
          { text: 'Long Break', onPress: () => switchMode('Long Break', true) },
          { text: 'Stay focused', onPress: () => switchMode('Focus', true) },
        ],
      );
    } else {
      Alert.alert('Break over!', undefined, [
        { text: 'Start Focus', onPress: () => switchMode('Focus') },
        { text: 'Not yet', style: 'cancel', onPress: () => switchMode(mode) },
      ]);
    }
  }, [clearPomodoroAlert, closeTrackedSession, linkedNote, linkedTask, mode, switchMode]);

  useEffect(() => {
    if (!activePomodoro) return;
    setMode('Focus');
    if (activePomodoro.taskId) setLinkedTaskId(activePomodoro.taskId);
    if (activePomodoro.noteId) setLinkedNoteId(activePomodoro.noteId);
    const remainingMs = Math.max(
      0,
      activePomodoro.plannedMinutes * 60_000
        - focusSessionElapsedMs(activePomodoro, Date.now()),
    );
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    setTimeLeft(remainingSeconds);
    completionHandledRef.current = false;
    if (activePomodoro.status === 'active') {
      deadlineRef.current = focusSessionExpectedEndAt(activePomodoro)
        ?? Date.now() + remainingMs;
      setRunning(remainingMs > 0);
      if (remainingMs <= 0) handleEnd();
    } else {
      deadlineRef.current = null;
      setRunning(false);
    }
  }, [activePomodoro?.id, activePomodoro?.status, activePomodoro?.updatedAt, handleEnd]);

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
    if (mode === 'Focus') closeTrackedSession(false);
    setRunning(false);
    deadlineRef.current = null;
    completionHandledRef.current = false;
    setTimeLeft(MODE_DURATIONS[mode]);
    void clearPomodoroAlert();
  }, [clearPomodoroAlert, closeTrackedSession, mode]);

  const toggleTimer = () => {
    if (running) {
      const remaining = deadlineRef.current ? Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)) : timeLeft;
      setTimeLeft(remaining);
      setRunning(false);
      deadlineRef.current = null;
      const current = activeSessionRef.current;
      if (mode === 'Focus' && current) {
        const paused = pauseSession(current.id);
        if (paused) activeSessionRef.current = paused;
      }
      void clearPomodoroAlert();
      return;
    }
    const seconds = timeLeft > 0 ? timeLeft : MODE_DURATIONS[mode];
    completionHandledRef.current = false;
    setTimeLeft(seconds);
    deadlineRef.current = Date.now() + seconds * 1000;
    setRunning(true);
    if (mode === 'Focus') {
      const current = activeSessionRef.current;
      const tracked = current?.status === 'paused'
        ? resumeSession(current.id)
        : startSession({
            kind: 'pomodoro',
            plannedMinutes: seconds / 60,
            taskId: linkedTaskId ?? undefined,
            noteId: linkedNoteId ?? undefined,
          });
      activeSessionRef.current = tracked;
    }
    if (mode === 'Focus' && linkedTask && linkedTask.status !== 'in-progress') {
      void setTaskStatus(linkedTask.id, 'in-progress');
    }
    void schedulePomodoroAlert(seconds, mode);
  };

  const unlinkTask = () => {
    setLinkedTaskId(null);
    if (user) void Storage.removeForUser(KEYS.LINKED_TASK, user.id);
  };

  const selectTask = (id: string) => {
    setLinkedTaskId(id);
    const current = activeSessionRef.current;
    if (current) {
      const updated = updateSessionLinks(current.id, { taskId: id });
      if (updated) activeSessionRef.current = updated;
    }
    if (user) void Storage.setForUser(KEYS.LINKED_TASK, user.id, id);
    setTaskPickerVisible(false);
    void Haptics.selectionAsync();
  };

  const unlinkNote = () => {
    setLinkedNoteId(null);
    if (user) void Storage.removeForUser(KEYS.LINKED_NOTE, user.id);
  };

  const selectNote = (id: string) => {
    setLinkedNoteId(id);
    const current = activeSessionRef.current;
    if (current) {
      const updated = updateSessionLinks(current.id, { noteId: id });
      if (updated) activeSessionRef.current = updated;
    }
    if (user) void Storage.setForUser(KEYS.LINKED_NOTE, user.id, id);
    setNotePickerVisible(false);
    void Haptics.selectionAsync();
  };

  useEffect(() => {
    if (menuRequest === 0 || handledMenuRequestRef.current === menuRequest) return;
    handledMenuRequestRef.current = menuRequest;
    Alert.alert('Focus options', undefined, [
      { text: 'Reset current timer', onPress: resetTimer },
      { text: linkedTask ? 'Change focus task' : 'Link a focus task', onPress: () => setTaskPickerVisible(true) },
      { text: linkedNote ? 'Change linked note' : 'Link a note', onPress: () => setNotePickerVisible(true) },
      { text: 'View focus statistics', onPress: () => navigation.navigate('Stats') },
      {
        text: 'Set daily focus goal',
        onPress: () => Alert.alert('Daily focus goal', 'Choose the focused minutes you want to complete each day.', [
          { text: '60 minutes', onPress: () => setDailyGoalMinutes(60) },
          { text: '120 minutes', onPress: () => setDailyGoalMinutes(120) },
          { text: '200 minutes', onPress: () => setDailyGoalMinutes(200) },
          { text: 'Cancel', style: 'cancel' },
        ]),
      },
      ...(linkedTask ? [{ text: 'Unlink focus task', onPress: unlinkTask }] : []),
      ...(linkedNote ? [{ text: 'Unlink current note', onPress: unlinkNote }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [linkedNote, linkedTask, menuRequest, navigation, resetTimer, setDailyGoalMinutes, user]);

  const total = MODE_DURATIONS[mode];
  const pct = timeLeft / total;
  const color = mode === 'Focus' ? theme.accent.base : mode === 'Short Break' ? theme.semantic.success : theme.semantic.info;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const dailyGoal = preferences.dailyGoalMinutes;
  const goalHours = dailyGoal >= 60
    ? `${Math.floor(dailyGoal / 60)}h${dailyGoal % 60 ? ` ${dailyGoal % 60}m` : ''}`
    : `${dailyGoal}m`;

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
          <ProgressRing progress={pct} color={color} size={220} strokeWidth={8} trackColor={theme.divider} />
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
          <Text style={[pom.statVal, { color: theme.content.primary }]}>{metrics.todayCompletedSessions}</Text>
          <Text style={[pom.statLabel, { color: theme.content.muted }]}>Today</Text>
        </View>
        <View style={[pom.statDivider, { backgroundColor: theme.divider }]} />
        <View style={pom.statItem}>
          <Text style={[pom.statVal, { color: theme.content.primary }]}>{goalHours}</Text>
          <Text style={[pom.statLabel, { color: theme.content.muted }]}>Daily goal</Text>
        </View>
        <View style={[pom.statDivider, { backgroundColor: theme.divider }]} />
        <View style={pom.statItem}>
          <Text style={[pom.statVal, { color: theme.content.primary }]}>{Math.round(metrics.goalProgress * 100)}%</Text>
          <Text style={[pom.statLabel, { color: theme.content.muted }]}>Progress</Text>
        </View>
      </View>

      <View style={[pom.contextCard, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}>
        <View style={pom.contextHeader}><View style={[pom.contextIcon, { backgroundColor: theme.iconTile.cyan }]}><MaterialCommunityIcons name="checkbox-marked-circle-outline" size={22} color={theme.iconTile.foreground} /></View><View style={pom.contextHeaderCopy}><Text style={[pom.contextTitle, { color: theme.content.primary }]}>Focus task</Text><Text style={[pom.contextSubtitle, { color: theme.content.secondary }]}>Track this session against a concrete action.</Text></View></View>
        {linkedTask ? (
          <View style={[pom.linkedNote, { backgroundColor: theme.glass.secondary }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${linkedTask.title}`} style={pom.linkedMain} onPress={() => navigation.navigate('Tasks', { section: 'tasks', taskId: linkedTask.id, taskRequest: Date.now() })}>
              <View style={pom.linkedCopy}><Text style={[pom.linkedLabel, { color: theme.content.muted }]}>FOCUS TASK</Text><Text style={[pom.linkedTitle, { color: theme.content.primary }]} numberOfLines={1}>{linkedTask.title}</Text><Text style={[pom.linkedMeta, { color: theme.content.secondary }]} numberOfLines={1}>{linkedTask.actualFocusMinutes ?? 0} focused min · {linkedTask.status.replace('-', ' ')}</Text></View><Ionicons name="chevron-forward" size={20} color={theme.content.muted} />
            </TouchableOpacity>
            <View style={[pom.linkActions, { borderTopColor: theme.divider }]}><TouchableOpacity accessibilityRole="button" style={pom.linkAction} onPress={() => setTaskPickerVisible(true)}><Ionicons name="swap-horizontal" size={17} color={theme.accent.base} /><Text style={[pom.linkActionText, { color: theme.accent.base }]}>Change</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={pom.linkAction} onPress={unlinkTask}><Ionicons name="unlink-outline" size={17} color={theme.content.secondary} /><Text style={[pom.linkActionText, { color: theme.content.secondary }]}>Unlink</Text></TouchableOpacity></View>
          </View>
        ) : (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Link a task to this focus session" style={[pom.linkBtn, { backgroundColor: theme.accent.soft }]} onPress={() => setTaskPickerVisible(true)}><Ionicons name="link-outline" size={19} color={theme.accent.base} /><Text style={[pom.linkBtnText, { color: theme.accent.base }]}>Choose a task</Text></TouchableOpacity>
        )}
      </View>

      <View style={[pom.contextCard, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}> 
        <View style={pom.contextHeader}><View style={[pom.contextIcon, { backgroundColor: theme.iconTile.teal }]}><MaterialCommunityIcons name="notebook-outline" size={22} color={theme.iconTile.foreground} /></View><View style={pom.contextHeaderCopy}><Text style={[pom.contextTitle, { color: theme.content.primary }]}>Focus note</Text><Text style={[pom.contextSubtitle, { color: theme.content.secondary }]}>Keep the session connected to what matters.</Text></View></View>
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

      <Modal visible={taskPickerVisible} transparent animationType="slide" onRequestClose={() => setTaskPickerVisible(false)}>
        <Pressable style={pom.pickerOverlay} onPress={() => setTaskPickerVisible(false)} />
        <View style={[pom.pickerSheet, { backgroundColor: theme.glass.solid }]}>
          <View style={[pom.pickerHandle, { backgroundColor: theme.divider }]} />
          <View style={pom.pickerHeader}><View><Text style={[pom.pickerTitle, { color: theme.content.primary }]}>Choose a focus task</Text><Text style={[pom.pickerSubtitle, { color: theme.content.secondary }]}>Focus minutes will be added when a session completes.</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close task picker" style={[pom.pickerClose, { backgroundColor: theme.glass.secondary }]} onPress={() => setTaskPickerVisible(false)}><Ionicons name="close" size={20} color={theme.content.primary} /></TouchableOpacity></View>
          {availableTasks.length === 0 ? <View style={pom.pickerEmpty}><Text style={[pom.pickerEmptyTitle, { color: theme.content.primary }]}>No open tasks yet</Text><Text style={[pom.pickerEmptyText, { color: theme.content.secondary }]}>Create a task in Organize, then return to focus on it.</Text><TouchableOpacity style={[pom.pickerOpenNotes, { backgroundColor: theme.accent.base }]} onPress={() => { setTaskPickerVisible(false); navigation.navigate('Tasks', { section: 'tasks', createTaskRequest: Date.now() }); }}><Text style={pom.pickerOpenNotesText}>Create a task</Text></TouchableOpacity></View> : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableTasks.map(task => {
                const selected = linkedTaskId === task.id;
                return <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected }} key={task.id} style={[pom.pickerRow, { borderBottomColor: theme.divider }]} onPress={() => selectTask(task.id)}><View style={[pom.pickerNoteIcon, { backgroundColor: selected ? theme.iconTile.teal : theme.iconTile.cyan }]}><MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color={theme.iconTile.foreground} /></View><View style={pom.pickerRowCopy}><Text style={[pom.pickerRowText, { color: theme.content.primary }]} numberOfLines={1}>{task.title}</Text><Text style={[pom.pickerRowMeta, { color: theme.content.muted }]} numberOfLines={1}>{task.projectId || task.priority} · {task.actualFocusMinutes ?? 0} focused min</Text></View>{selected ? <Ionicons name="checkmark-circle" size={22} color={theme.accent.base} /> : <Ionicons name="chevron-forward" size={18} color={theme.content.muted} />}</TouchableOpacity>;
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal visible={notePickerVisible} transparent animationType="slide" onRequestClose={() => setNotePickerVisible(false)}>
        <Pressable style={pom.pickerOverlay} onPress={() => setNotePickerVisible(false)} />
        <View style={[pom.pickerSheet, { backgroundColor: theme.glass.solid }]}> 
          <View style={[pom.pickerHandle, { backgroundColor: theme.divider }]} />
          <View style={pom.pickerHeader}><View><Text style={[pom.pickerTitle, { color: theme.content.primary }]}>Link a note</Text><Text style={[pom.pickerSubtitle, { color: theme.content.secondary }]}>Choose one note for this focus session.</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close note picker" style={[pom.pickerClose, { backgroundColor: theme.glass.secondary }]} onPress={() => setNotePickerVisible(false)}><Ionicons name="close" size={20} color={theme.content.primary} /></TouchableOpacity></View>
          {availableNotes.length === 0 ? <View style={pom.pickerEmpty}><Text style={[pom.pickerEmptyTitle, { color: theme.content.primary }]}>No active notes yet</Text><Text style={[pom.pickerEmptyText, { color: theme.content.secondary }]}>Create a note in Organize, then return to link it.</Text><TouchableOpacity style={[pom.pickerOpenNotes, { backgroundColor: theme.accent.base }]} onPress={() => { setNotePickerVisible(false); navigation.navigate('Tasks', { section: 'notes' }); }}><Text style={pom.pickerOpenNotesText}>Open notes</Text></TouchableOpacity></View> : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableNotes.map(n => {
                const selected = linkedNoteId === n.id;
                return <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected }} key={n.id} style={[pom.pickerRow, { borderBottomColor: theme.divider }]} onPress={() => selectNote(n.id)}><View style={[pom.pickerNoteIcon, { backgroundColor: selected ? theme.iconTile.teal : theme.iconTile.cyan }]}><MaterialCommunityIcons name="notebook-outline" size={20} color={theme.iconTile.foreground} /></View><View style={pom.pickerRowCopy}><Text style={[pom.pickerRowText, { color: theme.content.primary }]} numberOfLines={1}>{n.title || 'Untitled note'}</Text><Text style={[pom.pickerRowMeta, { color: theme.content.muted }]} numberOfLines={1}>{n.category || 'Personal'}</Text></View>{selected ? <Ionicons name="checkmark-circle" size={22} color={theme.accent.base} /> : <Ionicons name="chevron-forward" size={18} color={theme.content.muted} />}</TouchableOpacity>;
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
  const {
    activeStopwatch,
    startSession,
    pauseSession,
    resumeSession,
    finishSession,
  } = useFocusSessions();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<LapRecord[]>([]);
  const startRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<FocusSession | null>(null);
  const { scale: btnScale, onPressIn: btnIn, onPressOut: btnOut } = useFabScale();
  const { scale: lapScale, onPressIn: lapIn, onPressOut: lapOut } = useFabScale();

  useEffect(() => {
    sessionRef.current = activeStopwatch;
  }, [activeStopwatch]);

  useEffect(() => {
    if (!activeStopwatch) return;
    const restoredElapsed = focusSessionElapsedMs(activeStopwatch, Date.now());
    elapsedRef.current = restoredElapsed;
    setElapsed(restoredElapsed);
    setRunning(activeStopwatch.status === 'active');
  }, [activeStopwatch?.id, activeStopwatch?.status, activeStopwatch?.updatedAt]);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsedRef.current;
      const tick = () => {
        const now = Date.now() - startRef.current;
        elapsedRef.current = now;
        setElapsed(now);
      };
      tick();
      timerRef.current = setInterval(tick, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
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
    const current = sessionRef.current;
    if (current && elapsedRef.current > 0) {
      finishSession(current.id, true);
      sessionRef.current = null;
    }
    setRunning(false);
    elapsedRef.current = 0;
    setElapsed(0);
    setLaps([]);
  };

  const toggleStopwatch = () => {
    const current = sessionRef.current;
    if (running) {
      setRunning(false);
      if (current) {
        const paused = pauseSession(current.id);
        sessionRef.current = paused;
        if (paused) {
          elapsedRef.current = paused.elapsedMs;
          setElapsed(paused.elapsedMs);
        }
      }
      return;
    }
    const tracked = current?.status === 'paused'
      ? resumeSession(current.id)
      : startSession({ kind: 'stopwatch', plannedMinutes: 0 });
    sessionRef.current = tracked;
    setRunning(true);
  };

  const bestLap = laps.length > 1 ? Math.min(...laps.map(l => l.split)) : null;
  const worstLap = laps.length > 1 ? Math.max(...laps.map(l => l.split)) : null;

  return (
    <View style={[sw.root, { paddingBottom: bottomClearance }]}>
      {/* Big display */}
      <View style={sw.displayWrap}>
        <Text style={[sw.digits, { color: theme.content.primary }]}>{formatMs(elapsed)}</Text>
        {laps.length > 0 && (
          <Text style={[sw.lapHint, { color: theme.content.muted }]}>Lap {laps.length + 1} · {formatMs(elapsed - laps[laps.length - 1].time)}</Text>
        )}
      </View>

      {/* Buttons */}
      <View style={sw.btnRow}>
        {/* Lap / Reset */}
        <Animated.View style={{ transform: [{ scale: lapScale }] }}>
          <TouchableOpacity
            style={[sw.sideBtn, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}
            onPressIn={lapIn} onPressOut={lapOut}
            onPress={running ? handleLap : handleReset}
            activeOpacity={1}
          >
            <Text style={[sw.sideBtnText, { color: theme.content.primary }]}>
              {running ? 'Lap' : elapsed > 0 ? 'Finish' : 'Reset'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Start / Stop */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[sw.mainBtn, { backgroundColor: running ? '#C0392B' : '#2ECC71' }]}
            onPressIn={btnIn} onPressOut={btnOut}
            onPress={toggleStopwatch}
            activeOpacity={1}
          >
            <Text style={sw.mainBtnText}>{running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}</Text>
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
              <View style={[sw.lapRow, { borderTopColor: theme.glass.border }]}>
                <Text style={[sw.lapNum, { color: theme.content.muted }]}>Lap {item.lap}</Text>
                <Text style={[
                  sw.lapSplit, { color: theme.content.primary },
                  isBest && { color: '#2ECC71' },
                  isWorst && { color: '#E05252' },
                ]}>{formatMs(item.split)}</Text>
                <Text style={[sw.lapTotal, { color: theme.content.muted }]}>{formatMs(item.time)}</Text>
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
  const { isLoading: focusLoading } = useFocusSessions();
  const bottomNavigationClearance = Math.max(insets.bottom, 8) + 92;

  if (isLoading || focusLoading) return <ScreenSkeleton variant="dashboard" />;

  return (
    <SafeAreaView style={[main.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
      <AppBackground />
      {/* Header */}
      <View style={[main.header, { borderBottomColor: 'transparent' }]}>
        <BurgerMenu navigation={navigation} />
        <Text style={[main.headerTitle, { color: theme.content.primary }]}>{tab === 'pomodoro' ? 'Pomodoro' : 'Stopwatch'}</Text>
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
          <Ionicons name="ellipsis-vertical" size={20} color={theme.content.muted} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[main.tabBar, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>
        <TouchableOpacity
          style={[main.tabBtn, tab === 'pomodoro' && [main.tabBtnActive, { backgroundColor: theme.glass.solid }]]}
          onPress={() => setTab('pomodoro')}
        >
          <MaterialCommunityIcons
            name="timer-outline"
            size={18}
            color={tab === 'pomodoro' ? theme.accent.base : theme.content.muted}
          />
          <Text style={[main.tabText, { color: tab === 'pomodoro' ? theme.content.primary : theme.content.muted }]}>Pomodoro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[main.tabBtn, tab === 'stopwatch' && [main.tabBtnActive, { backgroundColor: theme.glass.solid }]]}
          onPress={() => setTab('stopwatch')}
        >
          <Ionicons
            name="stopwatch-outline"
            size={18}
            color={tab === 'stopwatch' ? theme.accent.base : theme.content.muted}
          />
          <Text style={[main.tabText, { color: tab === 'stopwatch' ? theme.content.primary : theme.content.muted }]}>Stopwatch</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {tab === 'pomodoro' ? <PomodoroTab theme={theme} navigation={navigation} menuRequest={menuRequest} /> : <StopwatchTab theme={theme} bottomClearance={bottomNavigationClearance} />}
      </View>
    </SafeAreaView>
  );
}
