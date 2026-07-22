import React, { useState } from 'react';
import { Linking, ScrollView, Switch, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { AppEvent, useEvents } from '@/context/EventStore';
import { AppBackground } from '@/components/ui';
import { EventActionSheet } from '@/components/events';
import { canScheduleEventReminders } from '@/utils/eventDate';
import { s } from './styles';

const PRIORITY_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  High: 'alert-circle-outline',
  Medium: 'flag-outline',
  Low: 'leaf-outline',
};

export default function EventDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { events, removeEvent, toggleAlarmActive } = useEvents();
  const routeEvent: AppEvent | undefined = route?.params?.event;
  const event = events.find(item => item.id === routeEvent?.id);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const alarmActive = event?.alarmActive ?? false;
  const canSchedule = event ? canScheduleEventReminders(event) : false;

  const handleToggleAlarm = () => {
    if (!event || (!canSchedule && !event.alarmActive)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleAlarmActive(event.id);
  };

  if (!event) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <AppBackground />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={s.missingBack}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={s.missingState}>
          <Ionicons name="calendar-outline" size={52} color={theme.border} />
          <Text style={[s.missingTitle, { color: theme.textDim }]}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const recurrence = event.recurrence && event.recurrence !== 'none' ? event.recurrence : null;
  const scheduleDate = event.startDate
    ? `${event.startDate}${event.endDate && event.endDate !== event.startDate ? ` – ${event.endDate}` : ''}`
    : 'Date not set';
  const scheduleTime = event.allDay
    ? 'All day'
    : event.startTime
      ? `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ''}`
      : 'Time not set';
  const alarmDescription = !canSchedule
    ? alarmActive
      ? 'Reminder time has passed. Edit the schedule or turn this off.'
      : 'Set a future reminder time to enable notifications.'
    : alarmActive
      ? `${event.reminders.length} reminder${event.reminders.length === 1 ? '' : 's'} enabled`
      : 'Reminders are off';

  const openMaps = () => {
    const query = typeof event.latitude === 'number' && typeof event.longitude === 'number'
      ? `${event.latitude},${event.longitude}`
      : encodeURIComponent(event.location || '');
    Linking.openURL(`https://maps.google.com/maps?q=${query}`)
      .catch(() => setNotice('Could not open a maps app on this device.'));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppBackground />

      <View style={s.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={[s.iconBtn, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}
        >
          <Ionicons name="arrow-back" size={21} color={theme.text} />
        </TouchableOpacity>
        <View style={s.topHeading}>
          <Text style={[s.topEyebrow, { color: theme.textDim }]}>ORGANIZE</Text>
          <Text style={[s.topTitle, { color: theme.text }]}>Event details</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit event"
          onPress={() => navigation.navigate('CreateEvent', { event })}
          style={[s.iconBtn, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}
        >
          <Ionicons name="create-outline" size={21} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.hero, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}>
          <View style={s.badgeRow}>
            <View style={[s.badge, { backgroundColor: theme.accent.soft }]}>
              <Ionicons name="pricetag-outline" size={13} color={theme.accent.base} />
              <Text style={[s.badgeText, { color: theme.accent.base }]}>{event.category}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: theme.glass.secondary }]}>
              <Ionicons name={PRIORITY_ICON[event.priority] ?? 'flag-outline'} size={13} color={theme.textSub} />
              <Text style={[s.badgeText, { color: theme.textSub }]}>{event.priority} priority</Text>
            </View>
            {recurrence ? (
              <View style={[s.badge, { backgroundColor: theme.glass.secondary }]}>
                <Ionicons name="repeat-outline" size={13} color={theme.textSub} />
                <Text style={[s.badgeText, s.capitalize, { color: theme.textSub }]}>{recurrence}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[s.heroTitle, { color: theme.text }]}>{event.title}</Text>

          <View style={[s.scheduleLine, { borderTopColor: theme.divider }]}>
            <View style={[s.scheduleIcon, { backgroundColor: theme.accent.soft }]}>
              <Ionicons name="calendar-outline" size={21} color={theme.accent.base} />
            </View>
            <View style={s.scheduleCopy}>
              <Text style={[s.scheduleDate, { color: theme.text }]}>{scheduleDate}</Text>
              <Text style={[s.scheduleMeta, { color: theme.textSub }]}>
                {scheduleTime}{event.timeZone ? ` · ${event.timeZone}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[s.sectionTitle, { color: theme.textDim }]}>EVENT INFORMATION</Text>
        <View style={[s.group, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>
          <View style={s.infoRow}>
            <View style={[s.rowIcon, { backgroundColor: alarmActive ? theme.accent.soft : theme.glass.secondary }]}>
              <Ionicons name={alarmActive ? 'alarm' : 'alarm-outline'} size={20} color={alarmActive ? theme.accent.base : theme.textDim} />
            </View>
            <View style={s.rowCopy}>
              <Text style={[s.rowLabel, { color: theme.text }]}>Event alarm</Text>
              <Text style={[s.rowDescription, { color: alarmActive ? theme.accent.base : theme.textDim }]}>{alarmDescription}</Text>
            </View>
            <Switch
              accessibilityLabel="Event alarm"
              value={alarmActive}
              onValueChange={handleToggleAlarm}
              disabled={!canSchedule && !alarmActive}
              trackColor={{ false: theme.divider, true: theme.accent.soft }}
              thumbColor={alarmActive ? theme.accent.base : theme.textDim}
            />
          </View>

          {event.reminders.length > 0 ? (
            <>
              <View style={[s.divider, { backgroundColor: theme.divider }]} />
              <View style={s.infoRow}>
                <View style={[s.rowIcon, { backgroundColor: theme.glass.secondary }]}>
                  <Ionicons name="notifications-outline" size={20} color={theme.textSub} />
                </View>
                <View style={s.rowCopy}>
                  <Text style={[s.rowLabel, { color: theme.text }]}>Reminders</Text>
                  <Text style={[s.rowDescription, { color: theme.textSub }]}>{event.reminders.join(' · ')}</Text>
                </View>
              </View>
            </>
          ) : null}

          {event.location ? (
            <>
              <View style={[s.divider, { backgroundColor: theme.divider }]} />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Open ${event.location} in maps`}
                style={s.infoRow}
                onPress={openMaps}
                activeOpacity={0.72}
              >
                <View style={[s.rowIcon, { backgroundColor: theme.accent.soft }]}>
                  <Ionicons name="location-outline" size={20} color={theme.accent.base} />
                </View>
                <View style={s.rowCopy}>
                  <Text style={[s.rowLabel, { color: theme.text }]}>Location</Text>
                  <Text style={[s.rowDescription, { color: theme.textSub }]} numberOfLines={2}>{event.location}</Text>
                </View>
                <View style={[s.trailingAction, { backgroundColor: theme.accent.soft }]}>
                  <Ionicons name="navigate-outline" size={18} color={theme.accent.base} />
                </View>
              </TouchableOpacity>
            </>
          ) : null}

          {event.description ? (
            <>
              <View style={[s.divider, { backgroundColor: theme.divider }]} />
              <View style={[s.infoRow, s.notesRow]}>
                <View style={[s.rowIcon, { backgroundColor: theme.glass.secondary }]}>
                  <Ionicons name="document-text-outline" size={20} color={theme.textSub} />
                </View>
                <View style={s.rowCopy}>
                  <Text style={[s.rowLabel, { color: theme.text }]}>Notes</Text>
                  <Text style={[s.notesText, { color: theme.textSub }]}>{event.description}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Delete event"
          style={[s.deleteBtn, { borderColor: theme.semantic.danger }]}
          onPress={() => setDeleteVisible(true)}
        >
          <Ionicons name="trash-outline" size={18} color={theme.semantic.danger} />
          <Text style={[s.deleteText, { color: theme.semantic.danger }]}>Delete event</Text>
        </TouchableOpacity>
      </ScrollView>

      <EventActionSheet
        visible={deleteVisible}
        title="Delete event?"
        message={`“${event.title}” and its scheduled reminders will be permanently removed.`}
        closeLabel="Keep event"
        onClose={() => setDeleteVisible(false)}
        actions={[{
          label: 'Delete permanently',
          icon: 'trash-outline',
          tone: 'danger',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setDeleteVisible(false);
            removeEvent(event.id);
            navigation.goBack();
          },
        }]}
      />

      <EventActionSheet
        visible={Boolean(notice)}
        title="Maps unavailable"
        message={notice ?? undefined}
        closeLabel="Close"
        onClose={() => setNotice(null)}
      />
    </SafeAreaView>
  );
}
