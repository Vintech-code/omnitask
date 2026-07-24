import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppAlert as Alert } from '@/components/ui/AppDialog';
import { AppText as Text } from '@/components/ui/AppText';
import { OmniLoader } from '@/components/ui/OmniLoader';
import { useTaskStore } from '@/context/TaskStore';
import { useTheme } from '@/context/ThemeContext';
import { buttonShadow } from '@/theme';
import { fontFamily } from '@/theme/typography';
import { taskOccursOnDate, type Task, type TaskDraft } from '@/types/task';
import { TaskEditor } from './TaskEditor';

type Filter = 'today' | 'inbox' | 'active' | 'completed';

export function TaskWorkspace({
  query = '',
  initialTaskId,
  openRequest,
  createRequest,
}: {
  query?: string;
  initialTaskId?: string;
  openRequest?: number;
  createRequest?: number;
}) {
  const { theme } = useTheme();
  const { tasks, isLoading, createTask, updateTask, removeTask, setTaskStatus } = useTaskStore();
  const [filter, setFilter] = useState<Filter>('today');
  const [active, setActive] = useState<Task | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const handledOpen = useRef<string | null>(null);
  const handledCreate = useRef<number | null>(null);

  useEffect(() => {
    if (!initialTaskId) return;
    const key = `${initialTaskId}:${openRequest ?? 0}`;
    if (handledOpen.current === key) return;
    const task = tasks.find(item => item.id === initialTaskId);
    if (task) {
      handledOpen.current = key;
      setActive(task);
      setEditorOpen(true);
    }
  }, [initialTaskId, openRequest, tasks]);

  useEffect(() => {
    if (!createRequest || handledCreate.current === createRequest) return;
    handledCreate.current = createRequest;
    setActive(null);
    setEditorOpen(true);
  }, [createRequest]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const now = new Date();
    return tasks
      .filter(task => {
        if (filter === 'today') return task.status !== 'completed' && (taskOccursOnDate(task, now) || task.status === 'inbox');
        if (filter === 'inbox') return task.status === 'inbox';
        if (filter === 'active') return task.status === 'planned' || task.status === 'in-progress';
        return task.status === 'completed';
      })
      .filter(task => !search || `${task.title} ${task.description ?? ''} ${task.projectId ?? ''}`.toLowerCase().includes(search))
      .sort((left, right) => {
        const leftTime = left.scheduledStart ?? left.dueAt ?? Number.MAX_SAFE_INTEGER;
        const rightTime = right.scheduledStart ?? right.dueAt ?? Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime || right.updatedAt - left.updatedAt;
      });
  }, [filter, query, tasks]);

  const toggle = async (task: Task) => {
    if (busyTaskId) return;
    setBusyTaskId(task.id);
    try {
      await setTaskStatus(task.id, task.status === 'completed' ? (task.dueAt ? 'planned' : 'inbox') : 'completed');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Could not update task', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyTaskId(null);
    }
  };

  const save = async (value: TaskDraft | Task) => {
    if ('createdAt' in value) await updateTask(value);
    else await createTask(value);
  };

  if (isLoading) {
    return <View style={styles.loading}><OmniLoader accessibilityLabel="Loading tasks" /><Text style={[styles.loadingText, { color: theme.content.secondary }]}>Preparing your tasks...</Text></View>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.filters}>
        {([
          ['today', 'Today'],
          ['inbox', 'Inbox'],
          ['active', 'Planned'],
          ['completed', 'Done'],
        ] as Array<[Filter, string]>).map(([value, label]) => {
          const selected = filter === value;
          return <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setFilter(value)} style={[styles.filter, { backgroundColor: selected ? theme.accent.soft : 'transparent' }]}><Text style={[styles.filterText, { color: selected ? theme.accent.base : theme.content.secondary }]}>{label}</Text></TouchableOpacity>;
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <View>
            <Text style={[styles.summaryTitle, { color: theme.content.primary }]}>{filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}</Text>
            <Text style={[styles.summaryCopy, { color: theme.content.secondary }]}>Real actions with dates, reminders, Focus, and live links.</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Create task" onPress={() => { setActive(null); setEditorOpen(true); }} style={[styles.addButton, buttonShadow, { backgroundColor: theme.accent.base }]}>
            <Ionicons name="add" size={20} color={theme.iconTile.foreground} />
            <Text style={styles.addText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.list, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}>
          {filtered.length ? filtered.map((task, index) => (
            <View key={task.id} style={[styles.row, index > 0 && { borderTopColor: theme.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.status === 'completed', disabled: busyTaskId !== null }}
                accessibilityLabel={`${task.status === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`}
                disabled={busyTaskId !== null}
                onPress={() => void toggle(task)}
                style={styles.checkHit}
              >
                {busyTaskId === task.id
                  ? <OmniLoader size="small" accessibilityLabel={`Updating ${task.title}`} />
                  : <Ionicons name={task.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'} size={27} color={task.status === 'completed' ? theme.semantic.success : theme.content.muted} />}
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${task.title}`} onPress={() => { setActive(task); setEditorOpen(true); }} style={styles.rowMain}>
                <Text numberOfLines={1} style={[styles.taskTitle, { color: task.status === 'completed' ? theme.content.muted : theme.content.primary }, task.status === 'completed' && styles.completed]}>{task.title}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.priorityDot, { backgroundColor: task.priority === 'high' ? theme.iconTile.coral : task.priority === 'low' ? theme.iconTile.cyan : theme.iconTile.teal }]} />
                  <Text numberOfLines={1} style={[styles.meta, { color: theme.content.secondary }]}>
                    {task.dueAt ? `Due ${new Date(task.dueAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : task.projectId || 'Inbox'}
                    {task.estimateMinutes ? ` · ${task.estimateMinutes}m` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
              {task.noteId ? <Ionicons name="link" size={16} color={theme.accent.base} /> : null}
              <Ionicons name="chevron-forward" size={17} color={theme.content.muted} />
            </View>
          )) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.iconTile.cyan }]}><Ionicons name="checkmark-done" size={25} color={theme.iconTile.foreground} /></View>
              <Text style={[styles.emptyTitle, { color: theme.content.primary }]}>Nothing here yet</Text>
              <Text style={[styles.emptyCopy, { color: theme.content.secondary }]}>Create a task or promote a Note checklist item.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TaskEditor
        visible={editorOpen}
        task={active}
        onClose={() => { setEditorOpen(false); setActive(null); }}
        onSave={save}
        onDelete={async task => removeTask(task.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, fontFamily: fontFamily.semibold },
  filters: { minHeight: 42, marginHorizontal: 20, flexDirection: 'row', gap: 4 },
  filter: { flex: 1, minHeight: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 12, fontFamily: fontFamily.extrabold },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 116 },
  summary: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryTitle: { fontSize: 18, lineHeight: 23, fontFamily: fontFamily.extrabold },
  summaryCopy: { marginTop: 1, maxWidth: 260, fontSize: 11, lineHeight: 15, fontFamily: fontFamily.medium },
  addButton: { minWidth: 82, minHeight: 42, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  addText: { color: '#EDEDEF', fontSize: 13, fontFamily: fontFamily.extrabold },
  list: { marginTop: 10, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  row: { minHeight: 76, paddingRight: 14, flexDirection: 'row', alignItems: 'center' },
  checkHit: { width: 54, minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, minWidth: 0, paddingVertical: 12 },
  taskTitle: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.extrabold },
  completed: { textDecorationLine: 'line-through' },
  metaRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  meta: { flex: 1, fontSize: 11, lineHeight: 15, fontFamily: fontFamily.semibold },
  empty: { minHeight: 260, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 13, fontSize: 17, fontFamily: fontFamily.extrabold },
  emptyCopy: { marginTop: 4, textAlign: 'center', fontSize: 12, lineHeight: 17, fontFamily: fontFamily.medium },
});

