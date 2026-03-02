import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const BLUE = '#4A90D9';
const DAYS_ALL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const RINGTONES = ['Chimes', 'Early Riser', 'Lullaby', 'Radar', 'Ripple', 'Silk', 'Zen'];
const VOLUME_LEVELS = ['Off', 'Low', 'Medium', 'High'];

type Period = 'AM' | 'PM';
interface Alarm {
  id: string;
  time: string;
  period: Period;
  label: string;
  ringtone: string;
  days: boolean[];
  active: boolean;
  badge: string | null;
}
interface AlarmForm {
  time: string;
  period: Period;
  label: string;
  ringtone: string;
  days: boolean[];
  active: boolean;
}

const INITIAL_ALARMS: Alarm[] = [
  { id: '1', time: '07:00', period: 'AM', label: 'Morning Workout',  ringtone: 'Chimes',      days: [true,  true,  true,  true,  true,  false, false], active: true,  badge: 'Scheduled' },
  { id: '2', time: '08:30', period: 'AM', label: 'Weekend Wakeup',   ringtone: 'Early Riser', days: [false, false, false, false, false, true,  true ], active: false, badge: null },
  { id: '3', time: '10:15', period: 'PM', label: 'Prep for Bed',     ringtone: 'Lullaby',     days: [true,  true,  true,  true,  true,  true,  true ], active: true,  badge: 'Scheduled' },
];

const defaultForm = (): AlarmForm => ({
  time: '08:00', period: 'AM', label: '', ringtone: 'Chimes',
  days: [true, true, true, true, true, false, false], active: true,
});

function toMinutes(time: string, period: Period): number {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function timeUntil(time: string, period: Period): string {
  const now = new Date();
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const diff = Math.floor((target.getTime() - now.getTime()) / 60000);
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs === 0) return `In ${mins}m`;
  return `In ${hrs}h ${mins}m`;
}

function parseAlarmTime(value: string): boolean {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h >= 1 && h <= 12 && m >= 0 && m <= 59;
}

export default function AlarmScreen() {
  const [alarms, setAlarms] = useState<Alarm[]>(INITIAL_ALARMS);
  const [volume, setVolume] = useState('High');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AlarmForm>(defaultForm());

  // Derived
  const activeCount = alarms.filter(a => a.active).length;
  const nextAlarm = useMemo(() => {
    const active = alarms.filter(a => a.active);
    if (!active.length) return null;
    return [...active].sort((a, b) => toMinutes(a.time, a.period) - toMinutes(b.time, b.period))[0];
  }, [alarms]);

  // Toggle alarm on/off
  const toggleAlarm = (id: string) =>
    setAlarms(prev =>
      prev.map(a =>
        a.id === id ? { ...a, active: !a.active, badge: !a.active ? 'Scheduled' : null } : a
      )
    );

  // Toggle a specific day on an alarm card
  const toggleDay = (alarmId: string, dayIndex: number) =>
    setAlarms(prev =>
      prev.map(a =>
        a.id === alarmId
          ? { ...a, days: a.days.map((d, i) => (i === dayIndex ? !d : d)) }
          : a
      )
    );

  // Delete with confirmation
  const confirmDelete = (id: string, label: string) =>
    Alert.alert('Delete Alarm', `Delete "${label}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setAlarms(prev => prev.filter(a => a.id !== id)) },
    ]);

  // Duplicate
  const duplicateAlarm = (alarm: Alarm) => {
    const copy: Alarm = { ...alarm, id: Date.now().toString(), label: `${alarm.label} (copy)`, active: false, badge: null };
    setAlarms(prev => [...prev, copy]);
  };

  // Ringtone picker for a card
  const changeRingtone = (alarmId: string, current: string) => {
    Alert.alert('Ringtone', `Current: ${current}`, [
      ...RINGTONES.map(r => ({
        text: r === current ? `\u2713  ${r}` : r,
        onPress: () => setAlarms(prev => prev.map(a => (a.id === alarmId ? { ...a, ringtone: r } : a))),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Ringtone picker for modal form
  const pickFormRingtone = () => {
    Alert.alert('Ringtone', `Current: ${form.ringtone}`, [
      ...RINGTONES.map(r => ({
        text: r === form.ringtone ? `\u2713  ${r}` : r,
        onPress: () => setForm(f => ({ ...f, ringtone: r })),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Three-dot menu
  const openAlarmMenu = (alarm: Alarm) =>
    Alert.alert(alarm.label, undefined, [
      { text: 'Edit', onPress: () => openEdit(alarm) },
      { text: 'Duplicate', onPress: () => duplicateAlarm(alarm) },
      { text: 'Change Ringtone', onPress: () => changeRingtone(alarm.id, alarm.ringtone) },
      { text: alarm.active ? 'Disable' : 'Enable', onPress: () => toggleAlarm(alarm.id) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(alarm.id, alarm.label) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  // Volume picker
  const handleVolume = () => {
    Alert.alert('Alarm Volume', `Current: ${volume}`, [
      ...VOLUME_LEVELS.map(v => ({
        text: v === volume ? `\u2713  ${v}` : v,
        onPress: () => setVolume(v),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Open add modal
  const openAdd = () => { setEditingId(null); setForm(defaultForm()); setModalVisible(true); };

  // Open edit modal
  const openEdit = (alarm: Alarm) => {
    setEditingId(alarm.id);
    setForm({ time: alarm.time, period: alarm.period, label: alarm.label, ringtone: alarm.ringtone, days: [...alarm.days], active: alarm.active });
    setModalVisible(true);
  };

  // Save from modal
  const handleSave = () => {
    if (!form.label.trim()) { Alert.alert('Validation', 'Please enter an alarm label.'); return; }
    if (!parseAlarmTime(form.time)) { Alert.alert('Validation', 'Enter a valid time in H:MM format (1\u201312), e.g. 07:30.'); return; }
    if (!form.days.some(Boolean)) { Alert.alert('Validation', 'Select at least one repeat day.'); return; }
    if (editingId) {
      setAlarms(prev => prev.map(a =>
        a.id === editingId ? { ...a, ...form, badge: form.active ? 'Scheduled' : null } : a
      ));
    } else {
      setAlarms(prev => [...prev, { ...form, id: Date.now().toString(), badge: form.active ? 'Scheduled' : null }]);
    }
    setModalVisible(false);
  };

  const toggleFormDay = (i: number) =>
    setForm(f => ({ ...f, days: f.days.map((d, idx) => (idx === i ? !d : d)) }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Alarms</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleVolume}>
            <Ionicons name="volume-medium-outline" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={24} color={BLUE} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Next Alarm Banner */}
        <View style={styles.nextAlarmBanner}>
          <View style={styles.nextAlarmLeft}>
            <Ionicons name="alarm-outline" size={28} color="#fff" />
          </View>
          <View style={styles.nextAlarmBody}>
            <Text style={styles.nextAlarmLabel}>NEXT ALARM</Text>
            <Text style={styles.nextAlarmTime}>
              {nextAlarm ? `${nextAlarm.time} ${nextAlarm.period} \u00b7 ${nextAlarm.label}` : 'No active alarms'}
            </Text>
            <Text style={styles.nextAlarmSub}>
              {nextAlarm ? timeUntil(nextAlarm.time, nextAlarm.period) : 'Enable an alarm to see it here'}
            </Text>
          </View>
        </View>

        {/* YOUR ALARMS header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR ALARMS</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{activeCount} Active</Text>
          </View>
        </View>

        {/* Empty state */}
        {alarms.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="alarm-outline" size={40} color="#ccc" />
            <Text style={styles.emptyStateText}>No alarms yet</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
              <Text style={styles.emptyAddText}>+ Add Alarm</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Alarm Cards */}
        {alarms.map(alarm => (
          <View key={alarm.id} style={styles.alarmCard}>
            <View style={styles.alarmTop}>
              <View style={styles.alarmTimeBlock}>
                <Text style={[styles.alarmTime, !alarm.active && styles.alarmTimeInactive]}>
                  {alarm.time}
                </Text>
                <Text style={[styles.alarmPeriod, !alarm.active && styles.alarmTimeInactive]}>
                  {alarm.period}
                </Text>
              </View>
              <View style={styles.alarmTopRight}>
                <Switch
                  value={alarm.active}
                  onValueChange={() => toggleAlarm(alarm.id)}
                  trackColor={{ false: '#E0E0E0', true: '#B8D4F5' }}
                  thumbColor={alarm.active ? BLUE : '#f0f0f0'}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
                <TouchableOpacity style={styles.dotMenuBtn} onPress={() => openAlarmMenu(alarm)}>
                  <Ionicons name="ellipsis-vertical" size={18} color="#ccc" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Label tap = edit */}
            <TouchableOpacity onPress={() => openEdit(alarm)}>
              <Text style={[styles.alarmLabel, !alarm.active && styles.alarmLabelInactive]}>
                {alarm.label}
              </Text>
            </TouchableOpacity>

            {/* Ringtone tap = picker */}
            <TouchableOpacity style={styles.alarmMeta} onPress={() => changeRingtone(alarm.id, alarm.ringtone)}>
              <MaterialCommunityIcons name="music-note" size={13} color="#888" />
              <Text style={styles.alarmMetaText}>{alarm.ringtone}</Text>
              <Ionicons name="chevron-down" size={12} color="#bbb" style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            {/* Day pills — tap to toggle */}
            <View style={styles.alarmDaysRow}>
              {DAYS_ALL.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleDay(alarm.id, i)}
                  style={[
                    styles.dayPill,
                    alarm.days[i] && alarm.active && styles.dayPillActive,
                    alarm.days[i] && !alarm.active && styles.dayPillInactive,
                  ]}
                >
                  <Text style={[styles.dayPillText, alarm.days[i] && alarm.active && styles.dayPillTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
              {alarm.badge && alarm.active && (
                <View style={styles.scheduledBadge}>
                  <Text style={styles.scheduledBadgeText}>{alarm.badge}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* Sleep Tip */}
        <View style={styles.sleepTipCard}>
          <View style={styles.sleepTipLeft}>
            <Ionicons name="moon-outline" size={22} color={BLUE} />
          </View>
          <View style={styles.sleepTipBody}>
            <Text style={styles.sleepTipTitle}>Sleep Tip</Text>
            <Text style={styles.sleepTipText}>
              Try to maintain a consistent sleep schedule. Going to bed and waking up at the same time each day improves sleep quality.
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Alarm' : 'New Alarm'}</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Time */}
            <Text style={styles.formLabel}>TIME</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                value={form.time}
                onChangeText={v => setForm(f => ({ ...f, time: v }))}
                placeholder="07:00"
                placeholderTextColor="#bbb"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
              <View style={styles.periodToggle}>
                {(['AM', 'PM'] as const).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodBtn, form.period === p && styles.periodBtnActive]}
                    onPress={() => setForm(f => ({ ...f, period: p }))}
                  >
                    <Text style={[styles.periodBtnText, form.period === p && styles.periodBtnTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Label */}
            <Text style={styles.formLabel}>LABEL</Text>
            <TextInput
              style={styles.labelInput}
              placeholder="e.g. Morning Workout"
              placeholderTextColor="#bbb"
              value={form.label}
              onChangeText={v => setForm(f => ({ ...f, label: v }))}
              maxLength={40}
            />

            {/* Repeat days */}
            <Text style={styles.formLabel}>REPEAT</Text>
            <View style={styles.formDaysRow}>
              {DAYS_ALL.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleFormDay(i)}
                  style={[styles.formDayPill, form.days[i] && styles.formDayPillActive]}
                >
                  <Text style={[styles.formDayText, form.days[i] && styles.formDayTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ringtone */}
            <Text style={styles.formLabel}>RINGTONE</Text>
            <TouchableOpacity style={styles.ringtoneRow} onPress={pickFormRingtone}>
              <MaterialCommunityIcons name="music-note" size={16} color="#555" />
              <Text style={styles.ringtoneText}>{form.ringtone}</Text>
              <Ionicons name="chevron-forward" size={16} color="#bbb" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Active toggle */}
            <View style={styles.formToggleRow}>
              <Text style={styles.formToggleLabel}>Active</Text>
              <Switch
                value={form.active}
                onValueChange={v => setForm(f => ({ ...f, active: v }))}
                trackColor={{ false: '#E0E0E0', true: '#B8D4F5' }}
                thumbColor={form.active ? BLUE : '#f0f0f0'}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6FA' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  topBarIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 14 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 20 },

  nextAlarmBanner: {
    backgroundColor: BLUE, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
  },
  nextAlarmLeft: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  nextAlarmBody: { flex: 1 },
  nextAlarmLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 3 },
  nextAlarmTime: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  nextAlarmSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1 },
  sectionBadge: { backgroundColor: '#E6F0FB', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 11, color: BLUE, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyStateText: { fontSize: 14, color: '#bbb', fontWeight: '600' },
  emptyAddBtn: { backgroundColor: BLUE, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyAddText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  alarmCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  alarmTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  alarmTimeBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  alarmTime: { fontSize: 34, fontWeight: '800', color: '#111', lineHeight: 38 },
  alarmPeriod: { fontSize: 16, fontWeight: '700', color: '#555', marginBottom: 4 },
  alarmTimeInactive: { color: '#CCC' },
  alarmTopRight: { flexDirection: 'row', alignItems: 'center' },
  dotMenuBtn: { padding: 4, marginLeft: 4 },

  alarmLabel: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 4 },
  alarmLabelInactive: { color: '#BBB' },

  alarmMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  alarmMetaText: { fontSize: 12, color: '#888' },

  alarmDaysRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  dayPill: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  dayPillActive: { backgroundColor: BLUE },
  dayPillInactive: { backgroundColor: '#E8E8E8' },
  dayPillText: { fontSize: 12, fontWeight: '700', color: '#AAA' },
  dayPillTextActive: { color: '#fff' },
  scheduledBadge: { backgroundColor: '#E6F0FB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 4 },
  scheduledBadgeText: { fontSize: 11, color: BLUE, fontWeight: '700' },

  sleepTipCard: {
    backgroundColor: '#EBF4FF', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8,
  },
  sleepTipLeft: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sleepTipBody: { flex: 1 },
  sleepTipTitle: { fontSize: 14, fontWeight: '800', color: '#222', marginBottom: 4 },
  sleepTipText: { fontSize: 12, color: '#555', lineHeight: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '80%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  modalCancel: { fontSize: 15, color: '#888', fontWeight: '500' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  modalSave: { fontSize: 15, color: BLUE, fontWeight: '700' },
  modalBody: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 40 },

  formLabel: { fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1, marginBottom: 8, marginTop: 18 },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  timeInput: {
    flex: 1, fontSize: 32, fontWeight: '800', color: '#111',
    borderBottomWidth: 2, borderBottomColor: BLUE,
    paddingBottom: 4, letterSpacing: 2,
  },
  periodToggle: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E0E0' },
  periodBtn: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#F5F5F5' },
  periodBtnActive: { backgroundColor: BLUE },
  periodBtnText: { fontSize: 14, fontWeight: '700', color: '#888' },
  periodBtnTextActive: { color: '#fff' },

  labelInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111', backgroundColor: '#FAFAFA',
  },

  formDaysRow: { flexDirection: 'row', gap: 8 },
  formDayPill: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  formDayPillActive: { backgroundColor: BLUE },
  formDayText: { fontSize: 13, fontWeight: '700', color: '#AAA' },
  formDayTextActive: { color: '#fff' },

  ringtoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FAFAFA',
  },
  ringtoneText: { fontSize: 15, color: '#111', flex: 1 },

  formToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 20, paddingVertical: 4,
  },
  formToggleLabel: { fontSize: 15, fontWeight: '600', color: '#111' },
});