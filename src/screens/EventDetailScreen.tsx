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
import { useTheme } from '../context/ThemeContext';
import { useEvents, AppEvent } from '../context/EventStore';
import * as Haptics from 'expo-haptics';

const BLUE = '#4A90D9';
const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  High:   { bg: '#FDECEA', text: '#D32F2F' },
  Medium: { bg: '#EBF4FF', text: BLUE },
  Low:    { bg: '#E6F9F1', text: '#2E7D52' },
};

export default function EventDetailScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const { removeEvent, toggleAlarmActive } = useEvents();

  const event: AppEvent | undefined = route?.params?.event;

  const [alarmActive, setAlarmActive] = useState(event?.alarmActive ?? false);

  if (!event) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={['top']}>
        <View style={[styles.topBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: theme.text }]}>Event Detail</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="calendar-outline" size={48} color={theme.textDim} />
          <Text style={{ fontSize: 16, color: theme.textDim, fontWeight: '600' }}>No event data found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: BLUE, fontWeight: '700', fontSize: 15 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const priorityStyle = PRIORITY_COLOR[event.priority] ?? PRIORITY_COLOR.Medium;

  const handleDelete = () =>
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        removeEvent(event.id);
        navigation.goBack();
      }},
    ]);

  const handleEdit = () => navigation.navigate('CreateEvent', { event });

  const handleToggleAlarm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleAlarmActive(event.id);
    setAlarmActive(v => !v);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg2 }]} edges={['top']}>
      {/* â”€â”€ Top Bar â”€â”€ */}
      <View style={[styles.topBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: theme.text }]} numberOfLines={1}>{event.title}</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={handleEdit} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert(event.title, undefined, [
            { text: 'Edit Event',   onPress: handleEdit },
            { text: 'Toggle Alarm', onPress: handleToggleAlarm },
            { text: 'Delete Event', style: 'destructive', onPress: handleDelete },
            { text: 'Cancel', style: 'cancel' },
          ])} style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* â”€â”€ Priority + Category tags â”€â”€ */}
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: priorityStyle.bg }]}>
            <Text style={[styles.tagText, { color: priorityStyle.text }]}>{event.priority} Priority</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: isDark ? '#1A2A3A' : '#E8F0FD' }]}>
            <Text style={[styles.tagText, { color: BLUE }]}>{event.category}</Text>
          </View>
          {alarmActive && (
            <View style={[styles.tag, { backgroundColor: isDark ? '#1A2A1A' : '#E6F9F1' }]}>
              <Ionicons name="alarm-outline" size={11} color="#3DAE7C" />
              <Text style={[styles.tagText, { color: '#3DAE7C', marginLeft: 3 }]}>Alarm On</Text>
            </View>
          )}
        </View>

        {/* â”€â”€ Event Title â”€â”€ */}
        <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>

        {/* â”€â”€ Date â”€â”€ */}
        {event.startDate ? (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: isDark ? '#1A2A3A' : '#EBF4FF' }]}>
              <Ionicons name="calendar-outline" size={18} color={BLUE} />
            </View>
            <View>
              <Text style={[styles.infoMain, { color: theme.text }]}>{event.startDate}</Text>
              {event.endTime ? (
                <Text style={[styles.infoSub, { color: theme.textDim }]}>Ends at {event.endTime}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* â”€â”€ Time â”€â”€ */}
        {event.startTime ? (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: isDark ? '#1A2A3A' : '#EBF4FF' }]}>
              <Ionicons name="time-outline" size={18} color={BLUE} />
            </View>
            <View>
              <Text style={[styles.infoMain, { color: theme.text }]}>
                {event.startTime}{event.endTime ? ` â€” ${event.endTime}` : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {/* â”€â”€ Action Buttons â”€â”€ */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={18} color={theme.text} />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: alarmActive ? (isDark ? '#1A2A3A' : '#EBF4FF') : theme.card, borderColor: alarmActive ? BLUE : theme.border }]}
            onPress={handleToggleAlarm}
          >
            <Ionicons name="alarm-outline" size={18} color={alarmActive ? BLUE : theme.text} />
            <Text style={[styles.actionBtnText, { color: alarmActive ? BLUE : theme.text }]}>
              {alarmActive ? 'Alarm On' : 'Alarm Off'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color="#E05252" />
            <Text style={[styles.actionBtnText, { color: '#E05252' }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* â”€â”€ Description / Notes â”€â”€ */}
        {event.description ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>NOTES</Text>
            <View style={[styles.notesBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.notesText, { color: theme.textSub }]}>{event.description}</Text>
            </View>
          </View>
        ) : null}

        {event.description ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}

        {/* â”€â”€ Location â”€â”€ */}
        {event.location ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textDim }]}>LOCATION</Text>
              {/* Map placeholder */}
              <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#1A2530' : '#E8EEF4' }]}>
                <View style={styles.mapOverlay}>
                  <TouchableOpacity
                    style={styles.directionsBtn}
                    onPress={() => Alert.alert('Directions', `Opening maps for ${event.location}...`)}
                  >
                    <Ionicons name="navigate-outline" size={14} color={BLUE} />
                    <Text style={styles.directionsBtnText}>Directions</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.mapGrid}>
                  {[...Array(5)].map((_, i) => (
                    <View key={i} style={[styles.mapGridLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }]} />
                  ))}
                </View>
                <Ionicons name="location" size={28} color="#E53935" style={styles.mapPin} />
              </View>
              <View style={[styles.locationRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View>
                  <Text style={[styles.locationName, { color: theme.text }]}>{event.location}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textDim} />
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </>
        ) : null}

        {/* â”€â”€ Reminders â”€â”€ */}
        {event.reminders.length > 0 ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textDim }]}>REMINDERS</Text>
              {event.reminders.map((r, i) => (
                <View key={i} style={[styles.reminderRow, { borderBottomColor: theme.border }]}>
                  <Ionicons name="alarm-outline" size={16} color={alarmActive ? BLUE : theme.textDim} />
                  <Text style={[styles.reminderLabel, { color: theme.text }]}>{r}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </>
        ) : null}

        {/* â”€â”€ Meta (category / priority summary) â”€â”€ */}
        <TouchableOpacity style={[styles.metaRow, { borderBottomColor: theme.border }]} onPress={handleEdit}>
          <Ionicons name="pricetag-outline" size={18} color={theme.textSub} />
          <View style={styles.metaBody}>
            <Text style={[styles.metaLabel, { color: theme.textDim }]}>Category</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>{event.category}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.metaRow, { borderBottomColor: theme.border }]} onPress={handleEdit}>
          <Ionicons name="flag-outline" size={18} color={theme.textSub} />
          <View style={styles.metaBody}>
            <Text style={[styles.metaLabel, { color: theme.textDim }]}>Priority</Text>
            <Text style={[styles.metaValue, { color: priorityStyle.text }]}>{event.priority}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* â”€â”€ Delete â”€â”€ */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color="#E53935" />
          <Text style={styles.deleteBtnText}>Delete Event</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 8, padding: 2 },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 14 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },

  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12, fontWeight: '700' },

  eventTitle: { fontSize: 24, fontWeight: '800', marginBottom: 18, lineHeight: 30 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  infoMain: { fontSize: 14, fontWeight: '700' },
  infoSub: { fontSize: 12, marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingVertical: 10,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  divider: { height: 1, marginVertical: 16 },

  section: { marginBottom: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },

  notesBox: { borderRadius: 10, padding: 14, borderWidth: 1 },
  notesText: { fontSize: 13, lineHeight: 20 },

  mapPlaceholder: {
    height: 140, borderRadius: 12, overflow: 'hidden',
    marginBottom: 10, alignItems: 'center', justifyContent: 'center',
  },
  mapGrid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-around', padding: 12 },
  mapGridLine: { height: 1 },
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
    borderRadius: 10, padding: 12, borderWidth: 1,
  },
  locationName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },

  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, borderBottomWidth: 1,
  },
  reminderLabel: { fontSize: 14, fontWeight: '500' },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  metaBody: { flex: 1 },
  metaLabel: { fontSize: 12, marginBottom: 1 },
  metaValue: { fontSize: 14, fontWeight: '600' },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: '#E53935' },
});

