import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useEvents, AppEvent } from '@/context/EventStore';
import * as Haptics from 'expo-haptics';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { s } from './styles';

const GREEN = '#3DAE7C';
const RED   = '#E53935';
const PRIORITY_COLOR: Record<string, { bg: string; text: string; accent: string }> = {
  High:   { bg: '#FFF0F0', text: '#D32F2F', accent: '#E53935' },
  Medium: { bg: '#EBF4FF', text: BLUE,      accent: BLUE      },
  Low:    { bg: '#E6F9F1', text: '#2E7D52', accent: GREEN     },
};

export default function EventDetailScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const { removeEvent, toggleAlarmActive } = useEvents();
  const event: AppEvent | undefined = route?.params?.event;
  const [alarmActive, setAlarmActive] = useState(event?.alarmActive ?? false);

  const priority = PRIORITY_COLOR[event?.priority ?? 'Medium'] ?? PRIORITY_COLOR.Medium;

  const handleDelete = () =>
    Alert.alert('Delete Event', `Delete "${event?.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          removeEvent(event!.id);
          navigation.goBack();
        },
      },
    ]);

  const handleToggleAlarm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleAlarmActive(event!.id);
    setAlarmActive(v => !v);
  };

  if (!event) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]} edges={['top']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 16 }}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="calendar-outline" size={52} color={theme.border} />
          <Text style={{ fontSize: 16, color: theme.textDim, fontWeight: '600' }}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.bg2 }]} edges={['top']}>
      {/* Top Bar */}
      <View style={[s.topBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: theme.text }]} numberOfLines={1}>{event.title}</Text>
        <View style={s.topRight}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('CreateEvent', { event })}>
            <Ionicons name="create-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => Alert.alert(event.title, undefined, [
              { text: 'Edit Event',   onPress: () => navigation.navigate('CreateEvent', { event }) },
              { text: 'Delete Event', style: 'destructive', onPress: handleDelete },
              { text: 'Cancel', style: 'cancel' },
            ])}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero Card */}
        <View style={[s.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[s.heroAccent, { backgroundColor: priority.accent }]} />
          <View style={s.heroBody}>
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: priority.bg }]}>
                <Ionicons name="flag-outline" size={11} color={priority.text} />
                <Text style={[s.badgeText, { color: priority.text }]}>{event.priority}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: isDark ? '#1A2A3A' : '#E8F0FD' }]}>
                <Ionicons name="pricetag-outline" size={11} color={BLUE} />
                <Text style={[s.badgeText, { color: BLUE }]}>{event.category}</Text>
              </View>
              {event.recurrence && event.recurrence !== 'none' && (
                <View style={[s.badge, { backgroundColor: isDark ? '#1A2A1A' : '#E6F9F1' }]}>
                  <Ionicons name="repeat-outline" size={11} color={GREEN} />
                  <Text style={[s.badgeText, { color: GREEN }]}>{event.recurrence}</Text>
                </View>
              )}
            </View>
            <Text style={[s.heroTitle, { color: theme.text }]}>{event.title}</Text>
            <View style={s.datetimeRow}>
              {event.startDate ? (
                <View style={[s.datetimeChip, { backgroundColor: isDark ? '#1A2A3A' : '#EBF4FF' }]}>
                  <Ionicons name="calendar-outline" size={14} color={BLUE} />
                  <Text style={[s.datetimeText, { color: BLUE }]}>{event.startDate}</Text>
                </View>
              ) : null}
              {event.startTime ? (
                <View style={[s.datetimeChip, { backgroundColor: isDark ? '#1A2A3A' : '#EBF4FF' }]}>
                  <Ionicons name="time-outline" size={14} color={BLUE} />
                  <Text style={[s.datetimeText, { color: BLUE }]}>
                    {event.startTime}{event.endTime ? ` � ${event.endTime}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Alarm Toggle Card */}
        <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={s.alarmRow}>
            <View style={[s.alarmIconWrap, { backgroundColor: alarmActive ? (isDark ? '#1A2A3A' : '#EBF4FF') : (isDark ? '#2A2A2A' : '#F5F5F5') }]}>
              <Ionicons name={alarmActive ? 'alarm' : 'alarm-outline'} size={22} color={alarmActive ? BLUE : theme.textDim} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[s.alarmLabel, { color: theme.text }]}>Event Alarm</Text>
              <Text style={[s.alarmSub, { color: alarmActive ? BLUE : theme.textDim }]}>
                {alarmActive ? 'Notifications enabled for this event' : 'Alarm is turned off'}
              </Text>
            </View>
            <Switch
              value={alarmActive}
              onValueChange={handleToggleAlarm}
              trackColor={{ false: isDark ? '#444' : '#DDD', true: '#B8D4F5' }}
              thumbColor={alarmActive ? BLUE : '#f0f0f0'}
              ios_backgroundColor={isDark ? '#444' : '#DDD'}
            />
          </View>
        </View>

        {/* Notes */}
        {event.description ? (
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.sectionHead}>
              <Ionicons name="document-text-outline" size={15} color={theme.textDim} />
              <Text style={[s.sectionLabel, { color: theme.textDim }]}>NOTES</Text>
            </View>
            <Text style={[s.notesText, { color: theme.textSub }]}>{event.description}</Text>
          </View>
        ) : null}

        {/* Location */}
        {event.location ? (
          <TouchableOpacity
            style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {
              const q = encodeURIComponent(event.location || '');
              Linking.openURL(`https://maps.google.com/maps?q=${q}`).catch(() =>
                Alert.alert('Maps', 'Could not open Google Maps.')
              );
            }}
            activeOpacity={0.8}
          >
            <View style={s.sectionHead}>
              <Ionicons name="location-outline" size={15} color={theme.textDim} />
              <Text style={[s.sectionLabel, { color: theme.textDim }]}>LOCATION</Text>
            </View>
            <View style={[s.mapBox, { backgroundColor: isDark ? '#1A2530' : '#E8EEF4' }]}>
              <View style={s.mapGrid}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={[s.mapLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]} />
                ))}
              </View>
              <Ionicons name="location" size={32} color={RED} />
              <View style={s.directionsChip}>
                <Ionicons name="navigate-outline" size={12} color={BLUE} />
                <Text style={s.directionsText}>Directions</Text>
              </View>
            </View>
            <View style={s.locationLabel}>
              <Ionicons name="location-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <Text style={[s.locationText, { color: theme.text }]} numberOfLines={2}>{event.location}</Text>
              <Ionicons name="open-outline" size={14} color={BLUE} style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Reminders */}
        {event.reminders.length > 0 ? (
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.sectionHead}>
              <Ionicons name="alarm-outline" size={15} color={theme.textDim} />
              <Text style={[s.sectionLabel, { color: theme.textDim }]}>REMINDERS</Text>
            </View>
            {event.reminders.map((r, i) => (
              <View
                key={i}
                style={[
                  s.reminderItem,
                  i < event.reminders.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                ]}
              >
                <View style={[s.reminderDot, { backgroundColor: alarmActive ? BLUE : theme.textDim }]} />
                <Text style={[s.reminderText, { color: theme.text }]}>{r}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Details */}
        <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={s.sectionHead}>
            <Ionicons name="information-circle-outline" size={15} color={theme.textDim} />
            <Text style={[s.sectionLabel, { color: theme.textDim }]}>DETAILS</Text>
          </View>
          <TouchableOpacity style={[s.detailRow, { borderBottomColor: theme.border }]} onPress={() => navigation.navigate('CreateEvent', { event })}>
            <Ionicons name="pricetag-outline" size={17} color={theme.textSub} style={{ marginRight: 12 }} />
            <Text style={[s.detailLabel, { color: theme.textDim }]}>Category</Text>
            <Text style={[s.detailValue, { color: theme.text }]}>{event.category}</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.textDim} />
          </TouchableOpacity>
          <TouchableOpacity style={s.detailRow} onPress={() => navigation.navigate('CreateEvent', { event })}>
            <Ionicons name="flag-outline" size={17} color={theme.textSub} style={{ marginRight: 12 }} />
            <Text style={[s.detailLabel, { color: theme.textDim }]}>Priority</Text>
            <Text style={[s.detailValue, { color: priority.text }]}>{event.priority}</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.textDim} />
          </TouchableOpacity>
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={[s.deleteBtn, { backgroundColor: isDark ? '#2A1A1A' : '#FFF0F0', borderColor: '#FFCDD2' }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={18} color={RED} />
          <Text style={[s.deleteTxt, { color: RED }]}>Delete Event</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}