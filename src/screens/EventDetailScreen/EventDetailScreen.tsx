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
      <SafeAreaView style={[s.safe, { backgroundColor: theme.background.base }]} edges={['top', 'bottom']}>
        <AppBackground />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={s.missingBack}
        >
          <Ionicons name="arrow-back" size={22} color={theme.content.primary} />
        </TouchableOpacity>
        <View style={s.missingState}>
          <Ionicons name="calendar-outline" size={52} color={theme.glass.border} />
          <Text style={[s.missingTitle, { color: theme.content.muted }]}>Event not found</Text>
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
          <Ionicons name="arrow-back" size={21} color={theme.content.primary} />
        </TouchableOpacity>
        <View style={s.topHeading}>
          <Text style={[s.topEyebrow, { color: theme.content.muted }]}>ORGANIZE</Text>
          <Text style={[s.topTitle, { color: theme.content.primary }]}>Event details</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit event"
          onPress={() => navigation.navigate('CreateEvent', { event })}
          style={[s.iconBtn, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}
        >
          <Ionicons name="create-outline" size={21} color={theme.content.primary} />
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
              <Ionicons name={PRIORITY_ICON[event.priority] ?? 'flag-outline'} size={13} color={theme.content.secondary} />
              <Text style={[s.badgeText, { color: theme.content.secondary }]}>{event.priority} priority</Text>
            </View>
            {recurrence ? (
              <View style={[s.badge, { backgroundColor: theme.glass.secondary }]}>
                <Ionicons name="repeat-outline" size={13} color={theme.content.secondary} />
                <Text style={[s.badgeText, s.capitalize, { color: theme.content.secondary }]}>{recurrence}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[s.heroTitle, { color: theme.content.primary }]}>{event.title}</Text>

          <View style={[s.scheduleLine, { borderTopColor: theme.divider }]}>
            <View style={[s.scheduleIcon, { backgroundColor: theme.iconTile.blue }]}>
              <Ionicons name="calendar-outline" size={21} color={theme.iconTile.foreground} />
            </View>
            <View style={s.scheduleCopy}>
              <Text style={[s.scheduleDate, { color: theme.content.primary }]}>{scheduleDate}</Text>
              <Text style={[s.scheduleMeta, { color: theme.content.secondary }]}>
                {scheduleTime}{event.timeZone ? ` · ${event.timeZone}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[s.sectionTitle, { color: theme.content.muted }]}>EVENT INFORMATION</Text>
        <View style={[s.group, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>
          <View style={s.infoRow}>
            <View style={[s.rowIcon, { backgroundColor: theme.iconTile.coral }]}>
              <Ionicons name={alarmActive ? 'alarm' : 'alarm-outline'} size={20} color={theme.iconTile.foreground} />
            </View>
            <View style={s.rowCopy}>
              <Text style={[s.rowLabel, { color: theme.content.primary }]}>Event alarm</Text>
              <Text style={[s.rowDescription, { color: alarmActive ? theme.accent.base : theme.content.muted }]}>{alarmDescription}</Text>
            </View>
            <Switch
              accessibilityLabel="Event alarm"
              value={alarmActive}
              onValueChange={handleToggleAlarm}
              disabled={!canSchedule && !alarmActive}
              trackColor={{ false: theme.divider, true: theme.accent.soft }}
              thumbColor={alarmActive ? theme.accent.base : theme.content.muted}
            />
          </View>

          {event.reminders.length > 0 ? (
            <>
              <View style={[s.divider, { backgroundColor: theme.divider }]} />
              <View style={s.infoRow}>
                <View style={[s.rowIcon, { backgroundColor: theme.iconTile.cyan }]}>
                  <Ionicons name="notifications-outline" size={20} color={theme.iconTile.foreground} />
                </View>
                <View style={s.rowCopy}>
                  <Text style={[s.rowLabel, { color: theme.content.primary }]}>Reminders</Text>
                  <Text style={[s.rowDescription, { color: theme.content.secondary }]}>{event.reminders.join(' · ')}</Text>
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
                <View style={[s.rowIcon, { backgroundColor: theme.iconTile.teal }]}>
                  <Ionicons name="location-outline" size={20} color={theme.iconTile.foreground} />
                </View>
                <View style={s.rowCopy}>
                  <Text style={[s.rowLabel, { color: theme.content.primary }]}>Location</Text>
                  <Text style={[s.rowDescription, { color: theme.content.secondary }]} numberOfLines={2}>{event.location}</Text>
                </View>
                <View style={[s.trailingAction, { backgroundColor: theme.iconTile.blue }]}>
                  <Ionicons name="navigate-outline" size={18} color={theme.iconTile.foreground} />
                </View>
              </TouchableOpacity>
            </>
          ) : null}

          {event.description ? (
            <>
              <View style={[s.divider, { backgroundColor: theme.divider }]} />
              <View style={[s.infoRow, s.notesRow]}>
                <View style={[s.rowIcon, { backgroundColor: theme.iconTile.blue }]}>
                  <Ionicons name="document-text-outline" size={20} color={theme.iconTile.foreground} />
                </View>
                <View style={s.rowCopy}>
                  <Text style={[s.rowLabel, { color: theme.content.primary }]}>Notes</Text>
                  <Text style={[s.notesText, { color: theme.content.secondary }]}>{event.description}</Text>
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
