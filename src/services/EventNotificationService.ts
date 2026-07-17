import * as Notifications from 'expo-notifications';

import { requestNotificationPermission } from './NotificationService';
import { datePartsInTimeZone, parseEventDateTime, reminderMinutes, systemTimeZone } from '@/utils/eventDate';
import type { AppEvent } from '@/types/event';

export interface EventNotificationDependencies {
  getAllScheduled: typeof Notifications.getAllScheduledNotificationsAsync;
  cancelScheduled: typeof Notifications.cancelScheduledNotificationAsync;
  schedule: typeof Notifications.scheduleNotificationAsync;
  requestPermission: typeof requestNotificationPermission;
  now: () => Date;
}

const defaultDependencies: EventNotificationDependencies = {
  getAllScheduled: Notifications.getAllScheduledNotificationsAsync,
  cancelScheduled: Notifications.cancelScheduledNotificationAsync,
  schedule: Notifications.scheduleNotificationAsync,
  requestPermission: requestNotificationPermission,
  now: () => new Date(),
};

async function cancelWith(id: string, dependencies: EventNotificationDependencies): Promise<void> {
  const prefix = `event_${id}`;
  const scheduled = await dependencies.getAllScheduled();
  await Promise.all(
    scheduled
      .filter(request => request.identifier === prefix || request.identifier.startsWith(`${prefix}_`))
      .map(request => dependencies.cancelScheduled(request.identifier)),
  );
}

export async function cancelEventNotifications(id: string): Promise<void> {
  await cancelWith(id, defaultDependencies);
}

export function buildEventNotificationRequests(
  event: AppEvent,
  now = new Date(),
): Notifications.NotificationRequestInput[] {
  const timeZone = event.timeZone ?? systemTimeZone();
  const dateTime = parseEventDateTime(event.startDate, event.allDay ? '09:00 AM' : event.startTime, timeZone);
  if (!event.alarmActive || !dateTime || event.reminders.length === 0) return [];

  const minuteValues = [...new Set(
    event.reminders.map(reminderMinutes).filter((value): value is number => value !== null),
  )];

  return minuteValues.flatMap(minutesBefore => {
    const triggerDate = new Date(dateTime.getTime() - minutesBefore * 60_000);
    const zoned = datePartsInTimeZone(triggerDate, timeZone);
    if (event.recurrence === 'none' && triggerDate.getTime() <= now.getTime()) return [];

    const distance = minutesBefore < 60
      ? `${minutesBefore} minutes`
      : minutesBefore === 60
        ? '1 hour'
        : `${minutesBefore / (24 * 60)} day${minutesBefore === 24 * 60 ? '' : 's'}`;
    const content: Notifications.NotificationContentInput = {
      title: `Reminder: ${event.title}`,
      body: `${event.allDay ? 'All-day event' : `Starts at ${event.startTime}`} · ${distance} away`,
      sound: true,
      data: { type: 'event', eventId: event.id },
    };

    let trigger: Notifications.NotificationTriggerInput;
    if (event.recurrence === 'daily') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: zoned.hour,
        minute: zoned.minute,
        timezone: timeZone,
        repeats: true,
      };
    } else if (event.recurrence === 'weekly') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        weekday: zoned.weekday,
        hour: zoned.hour,
        minute: zoned.minute,
        timezone: timeZone,
        repeats: true,
      };
    } else if (event.recurrence === 'monthly') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: zoned.day,
        hour: zoned.hour,
        minute: zoned.minute,
        timezone: timeZone,
        repeats: true,
      };
    } else {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      };
    }

    return [{ identifier: `event_${event.id}_${minutesBefore}`, content, trigger }];
  });
}

export async function scheduleEventNotifications(
  event: AppEvent,
  overrides: Partial<EventNotificationDependencies> = {},
): Promise<string[]> {
  const dependencies = { ...defaultDependencies, ...overrides };
  await cancelWith(event.id, dependencies);
  const requests = buildEventNotificationRequests(event, dependencies.now());
  if (requests.length === 0) return [];
  if (!await dependencies.requestPermission()) {
    throw new Error('Notification permission is required for event reminders.');
  }

  const scheduledIds: string[] = [];
  try {
    for (const request of requests) {
      await dependencies.schedule(request);
      if (request.identifier) scheduledIds.push(request.identifier);
    }
    return scheduledIds;
  } catch (error) {
    await cancelWith(event.id, dependencies);
    throw error;
  }
}
