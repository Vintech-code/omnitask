import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const BLUE = '#4A90D9';

const REMINDERS = [
  { id: '1', label: '10 min before', ringtone: 'Digital Chime', checked: true },
  { id: '2', label: '1 hour before', ringtone: 'Crystal Breeze', checked: true },
  { id: '3', label: 'At time of event', ringtone: 'Default', checked: false },
];

export default function EventDetailScreen({ navigation }: any) {
  const [reminders, setReminders] = useState(REMINDERS);

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, checked: !r.checked } : r));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Project Sync</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={() => {
            Alert.alert('Mark as Done', 'Mark this event as completed?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Mark Done', onPress: () => { navigation.goBack(); } },
            ]);
          }} style={styles.iconBtn}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Event Options', undefined, [
            { text: 'Edit Event', onPress: () => navigation.navigate('CreateEvent') },
            { text: 'Share', onPress: () => Alert.alert('Share', 'Shareable link copied to clipboard.') },
            { text: 'Duplicate', onPress: () => Alert.alert('Duplicated', 'Event has been duplicated.') },
            { text: 'Cancel', style: 'cancel' },
          ])} style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Priority + Category tags */}
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: '#FDECEA' }]}>
            <Text style={[styles.tagText, { color: '#D32F2F' }]}>High Priority</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: '#E8F0FD' }]}>
            <Text style={[styles.tagText, { color: BLUE }]}>Business</Text>
          </View>
        </View>

        {/* Event Title */}
        <Text style={styles.eventTitle}>Q4 Roadmap Review</Text>

        {/* Date Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="calendar-outline" size={18} color={BLUE} />
          </View>
          <View>
            <Text style={styles.infoMain}>Monday, Oct 24, 2024</Text>
            <Text style={styles.infoSub}>Starts in 2 hours</Text>
          </View>
        </View>

        {/* Time Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="time-outline" size={18} color={BLUE} />
          </View>
          <View>
            <Text style={styles.infoMain}>10:30 AM — 11:45 AM</Text>
            <Text style={styles.infoSub}>GMT-7 Pacific Time</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Mark Done', 'Event marked as completed!')}>
            <Ionicons name="checkmark-done-outline" size={18} color="#333" />
            <Text style={styles.actionBtnText}>Mark Done</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Snooze Event', 'Snooze for how long?', [
            { text: '5 minutes', onPress: () => Alert.alert('Snoozed', 'Event snoozed for 5 minutes.') },
            { text: '15 minutes', onPress: () => Alert.alert('Snoozed', 'Event snoozed for 15 minutes.') },
            { text: '1 hour', onPress: () => Alert.alert('Snoozed', 'Event snoozed for 1 hour.') },
            { text: 'Cancel', style: 'cancel' },
          ])}>
            <Ionicons name="alarm-outline" size={18} color="#333" />
            <Text style={styles.actionBtnText}>Snooze</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Repeat Event', 'Recurrence options', [
            { text: 'Weekly', onPress: () => Alert.alert('Set', 'Event set to repeat weekly.') },
            { text: 'Monthly', onPress: () => Alert.alert('Set', 'Event set to repeat monthly.') },
            { text: 'Remove Repeat', onPress: () => Alert.alert('Removed', 'Repeat removed.') },
            { text: 'Cancel', style: 'cancel' },
          ])}>
            <Ionicons name="repeat-outline" size={18} color="#333" />
            <Text style={styles.actionBtnText}>Repeat</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* NOTES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTES</Text>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>
              Review Q4 roadmap priorities and align on key deliverables. Discuss resource allocation, blockers, and upcoming milestones. Prepare slide deck with current progress metrics.
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* LOCATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOCATION</Text>
          {/* Map placeholder */}
          <View style={styles.mapPlaceholder}>
            <View style={styles.mapOverlay}>
              <TouchableOpacity style={styles.directionsBtn} onPress={() => Alert.alert('Directions', 'Opening maps for HQ Conference Room 4B...')}>
                <Ionicons name="navigate-outline" size={14} color={BLUE} />
                <Text style={styles.directionsBtnText}>Directions</Text>
              </TouchableOpacity>
            </View>
            {/* Map grid lines (greyscale placeholder) */}
            <View style={styles.mapGrid}>
              {[...Array(5)].map((_, i) => (
                <View key={i} style={styles.mapGridLine} />
              ))}
            </View>
            <Ionicons name="location" size={28} color="#E53935" style={styles.mapPin} />
          </View>
          <TouchableOpacity style={styles.locationRow}>
            <View>
              <Text style={styles.locationName}>HQ Conference Room 4B</Text>
              <Text style={styles.locationAddr}>101 Tech Way, San Francisco, CA</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* REMINDERS */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>REMINDERS</Text>
            <TouchableOpacity>
              <Text style={styles.addCustomText}>+ Add Custom</Text>
            </TouchableOpacity>
          </View>

          {reminders.map(r => (
            <View key={r.id} style={styles.reminderRow}>
              <TouchableOpacity onPress={() => toggleReminder(r.id)} style={styles.reminderCheckbox}>
                {r.checked
                  ? <Ionicons name="checkbox" size={20} color={BLUE} />
                  : <Ionicons name="square-outline" size={20} color="#ccc" />}
              </TouchableOpacity>
              <View style={styles.reminderBody}>
                <Text style={styles.reminderLabel}>{r.label}</Text>
                <View style={styles.reminderMeta}>
                  <MaterialCommunityIcons name="music-note" size={12} color="#888" />
                  <Text style={styles.reminderRingtone}>{r.ringtone}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Recurrence */}
        <TouchableOpacity style={styles.metaRow} onPress={() => Alert.alert('Recurrence', 'Recurrence options', [
          { text: 'Daily', onPress: () => {} }, { text: 'Weekly on Mondays', onPress: () => {} },
          { text: 'Monthly', onPress: () => {} }, { text: 'Cancel', style: 'cancel' },
        ])}>
          <Ionicons name="repeat-outline" size={18} color="#555" />
          <View style={styles.metaBody}>
            <Text style={styles.metaLabel}>Recurrence</Text>
            <Text style={styles.metaValue}>Weekly on Mondays</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.metaRow} onPress={() => Alert.alert('Vibration Profile', 'Choose vibration pattern', [
          { text: 'None', onPress: () => {} }, { text: 'Staccato', onPress: () => {} },
          { text: 'Rumble', onPress: () => {} }, { text: 'Cancel', style: 'cancel' },
        ])}>
          <Ionicons name="phone-portrait-outline" size={18} color="#555" />
          <View style={styles.metaBody}>
            <Text style={styles.metaLabel}>Vibration Profile</Text>
            <Text style={styles.metaValue}>Staccato</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => Alert.alert('Delete Event', 'Are you sure you want to delete this event? This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => navigation.goBack() },
        ])}>
          <Text style={styles.deleteBtnText}>Delete Event</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  backBtn: { marginRight: 8 },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111' },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 14 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },

  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12, fontWeight: '700' },

  eventTitle: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 18, lineHeight: 30 },

  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EBF4FF', alignItems: 'center', justifyContent: 'center',
  },
  infoMain: { fontSize: 14, fontWeight: '700', color: '#111' },
  infoSub: { fontSize: 12, color: '#888', marginTop: 2 },

  actionRow: {
    flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 16,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingVertical: 10, backgroundColor: '#F9F9F9',
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#333' },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },

  section: { marginBottom: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  addCustomText: { fontSize: 13, color: BLUE, fontWeight: '600' },

  notesBox: {
    backgroundColor: '#F8F9FA', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  notesText: { fontSize: 13, color: '#444', lineHeight: 20 },

  mapPlaceholder: {
    height: 140, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#E8EEF4', marginBottom: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  mapGrid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-around', padding: 12 },
  mapGridLine: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  mapOverlay: { position: 'absolute', top: 10, right: 10, zIndex: 10 },
  directionsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  directionsBtnText: { fontSize: 12, fontWeight: '700', color: BLUE },
  mapPin: { zIndex: 5 },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  locationName: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  locationAddr: { fontSize: 12, color: '#888' },

  reminderRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  reminderCheckbox: { paddingTop: 1 },
  reminderBody: { flex: 1 },
  reminderLabel: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 3 },
  reminderMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderRingtone: { fontSize: 12, color: '#888' },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  metaBody: { flex: 1 },
  metaLabel: { fontSize: 12, color: '#888', marginBottom: 1 },
  metaValue: { fontSize: 14, fontWeight: '600', color: '#111' },

  deleteBtn: { alignItems: 'center', paddingVertical: 16 },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: '#E53935' },
});
