import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#4A90D9';

type FilterType = 'all' | 'today' | 'events';
type PriorityType = 'High' | 'Medium' | 'Low' | null;
interface Tag { label: string; bg: string; color: string; }
interface Task {
  id: string;
  title: string;
  tags: Tag[];
  time: string;
  location: string | null;
  avatars: string[];
  priority: PriorityType;
  completed: boolean;
  isEvent: boolean;
  isToday: boolean;
}

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Design Review Meeting',
    tags: [
      { label: 'Work', bg: '#E8F0FD', color: '#3A6BD4' },
      { label: 'EVENT', bg: '#D6EAF8', color: '#1A6DA8' },
    ],
    time: '2:30 PM Today',
    location: 'Conference Room B',
    avatars: ['A', 'B'],
    priority: 'High',
    completed: false,
    isEvent: true,
    isToday: true,
  },
  {
    id: '2',
    title: 'Pick up groceries',
    tags: [{ label: 'Personal', bg: '#E9F7EF', color: '#27AE60' }],
    time: '5:00 PM',
    location: null,
    avatars: [],
    priority: null,
    completed: false,
    isEvent: false,
    isToday: true,
  },
  {
    id: '3',
    title: 'Marketing Strategy Sync',
    tags: [
      { label: 'Project A', bg: '#F5EEF8', color: '#8E44AD' },
      { label: 'EVENT', bg: '#D6EAF8', color: '#1A6DA8' },
    ],
    time: 'Tomorrow 10:00 AM',
    location: 'Zoom Invite',
    avatars: ['D', 'E'],
    priority: null,
    completed: false,
    isEvent: true,
    isToday: false,
  },
  {
    id: 'c1',
    title: 'Send weekly report',
    tags: [{ label: 'Work', bg: '#E8F0FD', color: '#3A6BD4' }],
    time: 'Yesterday',
    location: null,
    avatars: [],
    priority: null,
    completed: true,
    isEvent: false,
    isToday: false,
  },
];

// Countdown: 01:42:00 in seconds
const INITIAL_COUNTDOWN = 1 * 3600 + 42 * 60;

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600).toString().padStart(2, '0');
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function TasksScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [completedOpen, setCompletedOpen] = useState(true);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [smartInput, setSmartInput] = useState('');
  const [countdown, setCountdown] = useState(INITIAL_COUNTDOWN);
  const inputRef = useRef<TextInput>(null);

  // Live countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter logic
  const getFilteredOngoing = useCallback(() => {
    return tasks.filter(t => {
      if (t.completed) return false;
      if (activeFilter === 'today') return t.isToday;
      if (activeFilter === 'events') return t.isEvent;
      return true;
    });
  }, [tasks, activeFilter]);

  const completedTasks = tasks.filter(t => t.completed);
  const ongoingTasks = getFilteredOngoing();

  // Check off / uncheck a task
  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  // Delete a task
  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Three-dot menu
  const openTaskMenu = (task: Task) => {
    Alert.alert(task.title, 'Choose an action', [
      {
        text: 'Set High Priority',
        onPress: () => setTasks(prev =>
          prev.map(t => t.id === task.id ? { ...t, priority: 'High' } : t)
        ),
      },
      {
        text: 'Start Focus Session',
        onPress: () => navigation.navigate('Focus'),
      },
      {
        text: task.completed ? 'Mark Ongoing' : 'Mark Completed',
        onPress: () => toggleTask(task.id),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTask(task.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Smart add
  const handleAddTask = () => {
    const title = smartInput.trim();
    if (!title) {
      inputRef.current?.focus();
      return;
    }
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      tags: [],
      time: 'Today',
      location: null,
      avatars: [],
      priority: null,
      completed: false,
      isEvent: false,
      isToday: true,
    };
    setTasks(prev => [newTask, ...prev]);
    setSmartInput('');
    Keyboard.dismiss();
  };

  // Apply smart suggestion â€” adds the marketing sync to focus queue and dismisses
  const handleApplySuggestion = () => {
    setShowSuggestion(false);
    Alert.alert('Focus Scheduled', "'Marketing Sync' added as a 25m Pomodoro session.");
  };

  // Navigate to Focus tab
  const handleStartFocus = () => {
    navigation.navigate('Focus');
  };

  // Navigate to Focus tab from task timer icon
  const handleTaskTimer = (task: Task) => {
    navigation.navigate('Focus');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>My Tasks</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Priority Alert Banner */}
      <View style={styles.priorityBanner}>
        <View style={styles.priorityTopRow}>
          <View style={styles.priorityPill}>
            <Text style={styles.priorityPillText}>Priority Alert</Text>
          </View>
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownLabel}>STARTING IN</Text>
            <Text style={styles.countdownText}>{formatCountdown(countdown)}</Text>
          </View>
        </View>
        <Text style={styles.priorityTitle}>Design Review</Text>
        <View style={styles.priorityLocationRow}>
          <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
          <Text style={styles.priorityLocationText}>Conference Room B</Text>
        </View>
        <TouchableOpacity style={styles.startFocusBtn} onPress={handleStartFocus}>
          <Ionicons name="play-circle-outline" size={16} color={BLUE} />
          <Text style={styles.startFocusText}>Start Focus Session</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'today', 'events'] as FilterType[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Smart Suggestion */}
        {showSuggestion && (
          <View style={styles.smartCard}>
            <View style={styles.smartLeft}>
              <Ionicons name="star" size={16} color="#F5A623" />
              <Text style={styles.smartText}>
                Schedule{' '}
                <Text style={styles.smartHighlight}>'Marketing Sync'</Text>
                {' '}for 25m Pomodoro?
              </Text>
            </View>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplySuggestion}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ONGOING */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ONGOING</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{ongoingTasks.length} Active</Text>
          </View>
        </View>

        {ongoingTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={28} color="#ccc" />
            <Text style={styles.emptyStateText}>No tasks for this filter</Text>
          </View>
        )}

        {ongoingTasks.map(task => (
          <View key={task.id} style={styles.taskCard}>
            <TouchableOpacity onPress={() => toggleTask(task.id)} style={styles.checkbox}>
              <View style={styles.emptyCheckbox} />
            </TouchableOpacity>
            <View style={styles.taskBody}>
              <View style={styles.taskTitleRow}>
                <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                <TouchableOpacity onPress={() => openTaskMenu(task)} style={styles.dotsBtn}>
                  <Ionicons name="ellipsis-vertical" size={16} color="#ccc" />
                </TouchableOpacity>
              </View>
              <View style={styles.tagRow}>
                {task.tags.map((t, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: t.bg }]}>
                    <Text style={[styles.tagText, { color: t.color }]}>{t.label}</Text>
                  </View>
                ))}
                {task.priority === 'High' && (
                  <View style={styles.highPriorityTag}>
                    <Text style={styles.highPriorityText}>HIGH</Text>
                  </View>
                )}
              </View>
              <View style={styles.taskMeta}>
                <Ionicons name="calendar-outline" size={12} color="#888" />
                <Text style={styles.taskMetaText}>{task.time}</Text>
              </View>
              {task.location && (
                <View style={styles.taskMeta}>
                  <Ionicons name="location-outline" size={12} color="#888" />
                  <Text style={styles.taskMetaText}>{task.location}</Text>
                </View>
              )}
            </View>
            <View style={styles.taskRight}>
              {task.avatars.length > 0 && (
                <View style={styles.avatarStack}>
                  {task.avatars.slice(0, 2).map((a, i) => (
                    <View key={i} style={[styles.avatar, { marginLeft: i > 0 ? -7 : 0 }]}>
                      <Text style={styles.avatarText}>{a}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.timerBtn} onPress={() => handleTaskTimer(task)}>
                <Ionicons name="timer-outline" size={20} color={BLUE} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* COMPLETED */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setCompletedOpen(o => !o)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>COMPLETED</Text>
          <Ionicons
            name={completedOpen ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color="#888"
          />
        </TouchableOpacity>

        {completedOpen && completedTasks.map(task => (
          <TouchableOpacity
            key={task.id}
            style={styles.completedCard}
            onPress={() => toggleTask(task.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={20} color={BLUE} />
            <Text style={styles.completedTitle}>{task.title}</Text>
            <TouchableOpacity onPress={() => deleteTask(task.id)} style={styles.deleteBtn}>
              <Ionicons name="close-outline" size={16} color="#ccc" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Smart Add Bar */}
      <View style={styles.smartAddBar}>
        <View style={styles.smartAddTop}>
          <Ionicons name="radio-button-on-outline" size={20} color="#888" />
          <TextInput
            ref={inputRef}
            style={styles.smartAddInput}
            placeholder="Add a smart task or event..."
            placeholderTextColor="#aaa"
            value={smartInput}
            onChangeText={setSmartInput}
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.smartPlusBtn} onPress={handleAddTask}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.smartAddBottom}>
          <TouchableOpacity style={styles.smartAddIconBtn}>
            <Ionicons name="calendar-outline" size={18} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smartAddIconBtn}>
            <Ionicons name="pricetag-outline" size={18} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smartAddIconBtn}>
            <Ionicons name="attach-outline" size={18} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smartAddIconBtn}>
            <Ionicons name="people-outline" size={18} color="#555" />
          </TouchableOpacity>
          <View style={styles.autoFocusWrap}>
            <Ionicons name="timer-outline" size={12} color={BLUE} />
            <Text style={styles.autoFocusText}>AUTO FOCUS</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6FA' },

  // Top Bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  topBarIcons: { flexDirection: 'row' },
  iconBtn: { marginLeft: 12 },

  // Priority Banner
  priorityBanner: {
    backgroundColor: BLUE, marginHorizontal: 14, marginTop: 14, marginBottom: 6,
    borderRadius: 12, padding: 14,
  },
  priorityTopRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 6,
  },
  priorityPill: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  priorityPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  countdownBadge: { alignItems: 'flex-end' },
  countdownLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  countdownText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  priorityTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  priorityLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  priorityLocationText: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  startFocusBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, paddingVertical: 11,
  },
  startFocusText: { color: BLUE, fontSize: 14, fontWeight: '700' },

  // Filter Chips
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#EBEBEB',
  },
  filterChipActive: { backgroundColor: BLUE },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#666' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingBottom: 20 },

  // Smart Suggestion
  smartCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF8EC', borderRadius: 10, borderWidth: 1, borderColor: '#F5E6C8',
    padding: 12, marginBottom: 14,
  },
  smartLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  smartText: { fontSize: 13, color: '#555', flex: 1 },
  smartHighlight: { fontWeight: '700', color: '#333' },
  applyBtn: {
    backgroundColor: '#F5A623', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
  },
  applyText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4,
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#999', letterSpacing: 1 },
  sectionBadge: {
    backgroundColor: '#E6F0FB', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, color: BLUE, fontWeight: '700' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyStateText: { fontSize: 13, color: '#bbb' },

  // Task Card
  taskCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#EBEBEB',
    padding: 12, marginBottom: 10, gap: 10,
  },
  checkbox: { paddingTop: 2 },
  emptyCheckbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1.5, borderColor: '#CCC',
  },
  taskBody: { flex: 1 },
  taskTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  taskTitle: { fontSize: 14, fontWeight: '700', color: '#111', flex: 1, marginRight: 4 },
  dotsBtn: { padding: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  tag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '600' },
  highPriorityTag: {
    backgroundColor: '#FDECEA', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  highPriorityText: { fontSize: 10, fontWeight: '800', color: '#D32F2F' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  taskMetaText: { fontSize: 12, color: '#888' },
  taskRight: { alignItems: 'center', gap: 8, paddingTop: 2 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#B8D4F5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff',
  },
  avatarText: { fontSize: 8, fontWeight: '700', color: BLUE },
  timerBtn: { padding: 2 },

  // Completed
  completedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#EBEBEB',
    padding: 12, marginBottom: 8,
  },
  completedTitle: {
    flex: 1, fontSize: 14, fontWeight: '600', color: '#aaa',
    textDecorationLine: 'line-through',
  },
  deleteBtn: { padding: 4 },

  // Smart Add Bar
  smartAddBar: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EBEBEB',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
  },
  smartAddTop: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  smartAddInput: { flex: 1, fontSize: 13, color: '#333' },
  smartPlusBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
  },
  smartAddBottom: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  smartAddIconBtn: { padding: 6 },
  autoFocusWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 'auto', backgroundColor: '#E6F0FB',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  autoFocusText: { fontSize: 10, fontWeight: '800', color: BLUE, letterSpacing: 0.5 },
});
