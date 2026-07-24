import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppAlert as Alert } from '@/components/ui/AppDialog';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
import { OmniLoader } from '@/components/ui/OmniLoader';
import { useTheme } from '@/context/ThemeContext';
import { fontFamily } from '@/theme/typography';
import {
  type Task,
  type TaskDraft,
  type TaskPriority,
  type TaskRecurrenceFrequency,
  type TaskStatus,
} from '@/types/task';

type Props = {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (draft: TaskDraft | Task) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
};

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'planned', label: 'Planned' },
  { value: 'in-progress', label: 'Doing' },
  { value: 'completed', label: 'Done' },
];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const RECURRENCES: Array<{ value: TaskRecurrenceFrequency; label: string }> = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const ESTIMATES = [15, 25, 45, 60];
const REMINDERS = [
  { value: 0, label: 'At due time' },
  { value: 15, label: '15 min before' },
  { value: 60, label: '1 hour before' },
];

function dateInput(value?: number) {
  if (!value) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function timeInput(value?: number) {
  if (!value) return '';
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function parseTaskDateTime(dateValue: string, timeValue: string): number | undefined {
  if (!dateValue.trim()) return undefined;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim() || '17:00');
  if (!dateMatch || !timeMatch) return undefined;
  const [, year, month, day] = dateMatch.map(Number);
  const [, hour, minute] = timeMatch.map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
  ) return undefined;
  return date.getTime();
}

export function TaskEditor({ visible, task, onClose, onSave, onDelete }: Props) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('inbox');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [estimate, setEstimate] = useState<number | undefined>(25);
  const [recurrence, setRecurrence] = useState<TaskRecurrenceFrequency>('none');
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([]);
  const [projectId, setProjectId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setStatus(task?.status ?? 'inbox');
    setPriority(task?.priority ?? 'medium');
    setDueDate(dateInput(task?.dueAt));
    setDueTime(timeInput(task?.dueAt));
    setStartDate(dateInput(task?.scheduledStart));
    setStartTime(timeInput(task?.scheduledStart));
    setEstimate(task?.estimateMinutes ?? 25);
    setRecurrence(task?.recurrence.frequency ?? 'none');
    setReminderMinutes(task?.reminderMinutes ?? []);
    setProjectId(task?.projectId ?? '');
    setBusy(false);
  }, [task, visible]);

  const dueAt = useMemo(() => parseTaskDateTime(dueDate, dueTime), [dueDate, dueTime]);
  const scheduledStart = useMemo(() => parseTaskDateTime(startDate, startTime), [startDate, startTime]);

  const chooseRelativeDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(17, 0, 0, 0);
    setDueDate(dateInput(date.getTime()));
    setDueTime('17:00');
  };

  const save = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle || busy) {
      if (!cleanTitle) Alert.alert('Task title required', 'Enter a clear next action for this task.');
      return;
    }
    if (dueDate && dueAt === undefined) {
      Alert.alert('Check due date', 'Use YYYY-MM-DD for the date and HH:MM for 24-hour time.');
      return;
    }
    if (startDate && scheduledStart === undefined) {
      Alert.alert('Check planned start', 'Use YYYY-MM-DD for the date and HH:MM for 24-hour time.');
      return;
    }
    if (scheduledStart && dueAt && scheduledStart > dueAt) {
      Alert.alert('Check task timing', 'The planned start must be before the due time.');
      return;
    }

    const values: TaskDraft | Task = {
      ...(task ?? {}),
      title: cleanTitle,
      description: description.trim() || undefined,
      status,
      priority,
      dueAt,
      scheduledStart,
      estimateMinutes: estimate,
      recurrence: { frequency: recurrence, interval: 1 },
      reminderMinutes: dueAt ? reminderMinutes : [],
      projectId: projectId.trim() || undefined,
      ...(task ? { reminderIds: task.reminderIds } : {}),
    } as TaskDraft | Task;

    setBusy(true);
    try {
      await onSave(values);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      if (message.startsWith('Task saved,')) onClose();
      Alert.alert(message.startsWith('Task saved,') ? 'Task saved without reminder' : 'Could not save task', message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!task || busy) return;
    Alert.alert('Delete task?', 'The linked checklist item will remain, but this Task will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await onDelete(task);
            onClose();
          } catch (error) {
            Alert.alert('Could not delete task', error instanceof Error ? error.message : 'Please try again.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => !busy && onClose()}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background.base }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.header, { borderBottomColor: theme.divider }]}>
            <TouchableOpacity accessibilityLabel="Close task editor" disabled={busy} onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={23} color={theme.content.primary} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={[styles.headerTitle, { color: theme.content.primary }]}>{task ? 'Edit task' : 'New task'}</Text>
              <Text style={[styles.headerSubtitle, { color: theme.content.secondary }]}>One clear action, connected everywhere</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" disabled={busy || !title.trim()} onPress={() => void save()} style={[styles.saveButton, { backgroundColor: theme.accent.base }, (busy || !title.trim()) && styles.disabled]}>
              {busy ? <OmniLoader size="small" onPrimary accessibilityLabel="Saving task" /> : null}
              <Text style={styles.saveText}>{busy ? 'Saving' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={[styles.label, { color: theme.content.secondary }]}>Task</Text>
            <TextInput
              autoFocus={!task}
              editable={!busy}
              maxLength={140}
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              placeholderTextColor={theme.content.muted}
              style={[styles.titleInput, { color: theme.content.primary, borderColor: theme.glass.border, backgroundColor: theme.glass.solid }]}
            />
            <TextInput
              editable={!busy}
              multiline
              maxLength={1200}
              value={description}
              onChangeText={setDescription}
              placeholder="Details, outcome, or useful context"
              placeholderTextColor={theme.content.muted}
              style={[styles.description, { color: theme.content.primary, borderColor: theme.glass.border, backgroundColor: theme.glass.secondary }]}
            />

            <Text style={[styles.label, { color: theme.content.secondary }]}>Status</Text>
            <OptionRow>
              {STATUS_OPTIONS.map(option => <Choice key={option.value} selected={status === option.value} label={option.label} onPress={() => setStatus(option.value)} />)}
            </OptionRow>

            <Text style={[styles.label, { color: theme.content.secondary }]}>Priority</Text>
            <OptionRow>
              {PRIORITIES.map(value => <Choice key={value} selected={priority === value} label={value[0].toUpperCase() + value.slice(1)} onPress={() => setPriority(value)} />)}
            </OptionRow>

            <Text style={[styles.label, { color: theme.content.secondary }]}>Due</Text>
            <OptionRow>
              <Choice selected={false} label="Today" onPress={() => chooseRelativeDate(0)} />
              <Choice selected={false} label="Tomorrow" onPress={() => chooseRelativeDate(1)} />
              <Choice selected={!dueDate} label="No date" onPress={() => { setDueDate(''); setDueTime(''); setReminderMinutes([]); }} />
            </OptionRow>
            <DateTimeInputs date={dueDate} time={dueTime} onDate={setDueDate} onTime={setDueTime} />

            <Text style={[styles.label, { color: theme.content.secondary }]}>Planned start</Text>
            <DateTimeInputs date={startDate} time={startTime} onDate={setStartDate} onTime={setStartTime} />

            <Text style={[styles.label, { color: theme.content.secondary }]}>Estimate</Text>
            <OptionRow>
              {ESTIMATES.map(value => <Choice key={value} selected={estimate === value} label={`${value}m`} onPress={() => setEstimate(value)} />)}
              <Choice selected={estimate === undefined} label="None" onPress={() => setEstimate(undefined)} />
            </OptionRow>

            <Text style={[styles.label, { color: theme.content.secondary }]}>Repeat</Text>
            <OptionRow>
              {RECURRENCES.map(option => <Choice key={option.value} selected={recurrence === option.value} label={option.label} onPress={() => setRecurrence(option.value)} />)}
            </OptionRow>

            <Text style={[styles.label, { color: theme.content.secondary }]}>Reminder</Text>
            <OptionRow>
              {REMINDERS.map(option => <Choice
                key={option.value}
                disabled={!dueAt}
                selected={reminderMinutes.includes(option.value)}
                label={option.label}
                onPress={() => setReminderMinutes(current => current.includes(option.value) ? current.filter(value => value !== option.value) : [...current, option.value])}
              />)}
            </OptionRow>

            <Text style={[styles.label, { color: theme.content.secondary }]}>Project</Text>
            <TextInput
              editable={!busy}
              maxLength={60}
              value={projectId}
              onChangeText={setProjectId}
              placeholder="Personal, Work, School..."
              placeholderTextColor={theme.content.muted}
              style={[styles.field, { color: theme.content.primary, borderColor: theme.glass.border, backgroundColor: theme.glass.secondary }]}
            />

            {task?.noteId ? (
              <View style={[styles.linkNotice, { backgroundColor: theme.accent.soft }]}>
                <Ionicons name="link-outline" size={18} color={theme.accent.base} />
                <Text style={[styles.linkNoticeText, { color: theme.content.primary }]}>Linked to a Note checklist. Title and completion stay synchronized.</Text>
              </View>
            ) : null}

            {task ? (
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={remove} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={18} color={theme.semantic.danger} />
                <Text style={[styles.deleteText, { color: theme.semantic.danger }]}>Delete task</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function OptionRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.optionRow}>{children}</View>;
}

function Choice({ selected, label, onPress, disabled = false }: { selected: boolean; label: string; onPress: () => void; disabled?: boolean }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.choice,
        {
          backgroundColor: selected ? theme.accent.soft : theme.glass.secondary,
          borderColor: selected ? theme.accent.base : theme.glass.border,
        },
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.choiceText, { color: selected ? theme.accent.base : theme.content.secondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DateTimeInputs({ date, time, onDate, onTime }: { date: string; time: string; onDate: (value: string) => void; onTime: (value: string) => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.dateTimeRow}>
      <View style={[styles.dateField, { borderColor: theme.glass.border, backgroundColor: theme.glass.secondary }]}>
        <Ionicons name="calendar-outline" size={17} color={theme.content.muted} />
        <TextInput value={date} onChangeText={onDate} maxLength={10} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD" placeholderTextColor={theme.content.muted} style={[styles.dateInput, { color: theme.content.primary }]} />
      </View>
      <View style={[styles.timeField, { borderColor: theme.glass.border, backgroundColor: theme.glass.secondary }]}>
        <Ionicons name="time-outline" size={17} color={theme.content.muted} />
        <TextInput value={time} onChangeText={onTime} maxLength={5} keyboardType="numbers-and-punctuation" placeholder="HH:MM" placeholderTextColor={theme.content.muted} style={[styles.dateInput, { color: theme.content.primary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 68, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 19, lineHeight: 24, fontFamily: fontFamily.extrabold },
  headerSubtitle: { marginTop: 1, fontSize: 10, lineHeight: 14, fontFamily: fontFamily.medium },
  saveButton: { minWidth: 82, minHeight: 42, marginRight: 8, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#EDEDEF', fontSize: 14, fontFamily: fontFamily.extrabold },
  disabled: { opacity: 0.45 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 56 },
  label: { marginTop: 18, marginBottom: 7, fontSize: 12, lineHeight: 16, fontFamily: fontFamily.extrabold },
  titleInput: { minHeight: 56, borderRadius: 17, borderWidth: 1, paddingHorizontal: 15, fontSize: 18, fontFamily: fontFamily.bold },
  description: { minHeight: 94, marginTop: 9, borderRadius: 17, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top', fontSize: 14, lineHeight: 20 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { minHeight: 40, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontSize: 12, fontFamily: fontFamily.bold },
  dateTimeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dateField: { flex: 1.45, minHeight: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  timeField: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  dateInput: { flex: 1, minHeight: 44, fontSize: 13, fontFamily: fontFamily.semibold },
  field: { minHeight: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, fontSize: 14, fontFamily: fontFamily.semibold },
  linkNotice: { minHeight: 54, marginTop: 20, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  linkNoticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: fontFamily.semibold },
  deleteButton: { minHeight: 48, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  deleteText: { fontSize: 14, fontFamily: fontFamily.extrabold },
});

