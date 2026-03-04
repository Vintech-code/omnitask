import * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';

const IS_EXPO_GO = isRunningInExpoGo();

// Show alerts + play sound even when app is foregrounded
if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/** Request permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (IS_EXPO_GO) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Schedule a daily repeating alarm notification. */
export async function scheduleAlarmNotification(
  id: string,
  label: string,
  hour: number,
  minute: number,
  period: 'AM' | 'PM',
): Promise<void> {
  try {
    let h = hour;
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;

    await Notifications.scheduleNotificationAsync({
      identifier: `alarm_${id}`,
      content: {
        title: '⏰ ' + (label || 'Alarm'),
        body: `It's ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute,
      },
    });
  } catch {}
}

/** Schedule a one-time event reminder notification, with optional recurrence. */
export async function scheduleEventNotification(
  id: string,
  title: string,
  startTime: string,
  startDate: string,
  minutesBefore = 15,
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' = 'none',
): Promise<void> {
  try {
    const dateTime = new Date(`${startDate} ${startTime}`);
    if (isNaN(dateTime.getTime())) return;
    const triggerDate = new Date(dateTime.getTime() - minutesBefore * 60_000);
    if (triggerDate <= new Date()) return;

    if (recurrence === 'daily') {
      const h = dateTime.getHours() - Math.floor(minutesBefore / 60);
      const m = dateTime.getMinutes() - (minutesBefore % 60);
      await Notifications.scheduleNotificationAsync({
        identifier: `event_${id}`,
        content: {
          title: '📅 Reminder: ' + title,
          body: `Starts at ${startTime}`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: Math.max(0, h),
          minute: Math.max(0, m),
        },
      });
    } else if (recurrence === 'weekly') {
      await Notifications.scheduleNotificationAsync({
        identifier: `event_${id}`,
        content: {
          title: '📅 Weekly Reminder: ' + title,
          body: `Starts at ${startTime}`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: dateTime.getDay() + 1,
          hour: dateTime.getHours(),
          minute: Math.max(0, dateTime.getMinutes() - minutesBefore),
        },
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        identifier: `event_${id}`,
        content: {
          title: '📅 Upcoming: ' + title,
          body: `Starts at ${startTime} — in ${minutesBefore} minutes`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }
  } catch {}
}

/** Cancel a single notification by identifier. */
export async function cancelNotification(notifId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notifId);
  } catch {}
}

/** Cancel every scheduled notification. */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
