import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { getAlarmSound } from './AlarmSounds';

const ALARM_PREFIX = 'alarm_';
export const ALARM_CATEGORY_ID = 'omnitask_alarm';
export const ALARM_STOP_ACTION = 'alarm_stop';
export const ALARM_SNOOZE_ACTION = 'alarm_snooze';

export interface AlarmRingPayload {
  alarmId: string;
  label: string;
  time: string;
  sound: string;
  snoozeMinutes: number;
  vibrate: boolean;
  notificationIdentifier?: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

interface AlarmNotificationInput {
  id: string;
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
  label: string;
  sound: string;
  days: boolean[];
  vibrate: boolean;
  snooze: number;
  active: boolean;
  scheduledFor?: number;
}

function to24Hour(hour: number, period: 'AM' | 'PM') {
  if (period === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function soundFileFor(label: string): string | null | undefined {
  return getAlarmSound(label)?.notificationFile;
}

function channelIdFor(sound: string, vibrate: boolean) {
  const file = soundFileFor(sound);
  const soundKey = file === null ? 'silent' : (file ?? 'default').replace(/\.[^.]+$/, '');
  return `alarm-${soundKey}-${vibrate ? 'vibrate' : 'quiet'}`;
}

async function ensureAlarmChannel(sound: string, vibrate: boolean) {
  if (Platform.OS !== 'android') return undefined;

  const file = soundFileFor(sound);
  const channelId = channelIdFor(sound, vibrate);
  await Notifications.setNotificationChannelAsync(channelId, {
    name: file === null ? 'Silent alarms' : `Alarms · ${sound}`,
    description: 'Time-critical OmniTask alarm notifications',
    importance: Notifications.AndroidImportance.MAX,
    sound: file === null ? null : (file ?? 'default'),
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
    enableVibrate: vibrate,
    vibrationPattern: vibrate ? [0, 400, 200, 400, 200, 700] : null,
    enableLights: true,
    lightColor: '#FF7A00',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    showBadge: true,
  });
  return channelId;
}

export async function requestNotificationPermission(): Promise<boolean> {
  await configureAlarmNotifications();
  await ensureAlarmChannel('Default alarm sound', true);
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function configureAlarmNotifications(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_ID, [
    {
      identifier: ALARM_SNOOZE_ACTION,
      buttonTitle: 'Snooze',
      options: { opensAppToForeground: true },
    },
    {
      identifier: ALARM_STOP_ACTION,
      buttonTitle: 'Stop',
      options: { isDestructive: true, opensAppToForeground: true },
    },
  ]);
}

export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return;
  }

  if (Platform.Version >= 31) {
    try {
      await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
      return;
    } catch {
      // Some Android vendors do not expose the exact-alarm settings activity.
    }
  }

  await Linking.openSettings();
}

function possibleAlarmIdentifiers(id: string) {
  return [
    `${ALARM_PREFIX}${id}`,
    `${ALARM_PREFIX}${id}_once`,
    `${ALARM_PREFIX}${id}_snooze`,
    ...Array.from({ length: 7 }, (_, day) => `${ALARM_PREFIX}${id}_day_${day}`),
  ];
}

function expectedAlarmIdentifiers(alarm: AlarmNotificationInput) {
  const selectedDays = alarm.days
    .map((selected, day) => selected ? day : -1)
    .filter(day => day >= 0);
  return selectedDays.length > 0
    ? selectedDays.map(day => `${ALARM_PREFIX}${alarm.id}_day_${day}`)
    : [`${ALARM_PREFIX}${alarm.id}_once`];
}

function alarmContent(alarm: AlarmNotificationInput): Notifications.NotificationContentInput {
  const soundFile = soundFileFor(alarm.sound);
  return {
    title: alarm.label || 'Alarm',
    body: `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')} ${alarm.period}`,
    sound: soundFile === null ? false : (soundFile ?? 'default'),
    priority: Notifications.AndroidNotificationPriority.MAX,
    categoryIdentifier: ALARM_CATEGORY_ID,
    sticky: true,
    autoDismiss: false,
    data: {
      type: 'alarm',
      alarmId: alarm.id,
      label: alarm.label || 'Alarm',
      time: `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')} ${alarm.period}`,
      sound: alarm.sound,
      snoozeMinutes: alarm.snooze,
      vibrate: alarm.vibrate,
    },
  };
}

export function getAlarmPayload(
  notification: Notifications.Notification,
): AlarmRingPayload | null {
  const data = notification.request.content.data;
  if (data.type !== 'alarm' || typeof data.alarmId !== 'string') return null;
  return {
    alarmId: data.alarmId,
    label: typeof data.label === 'string' ? data.label : 'Alarm',
    time: typeof data.time === 'string' ? data.time : '',
    sound: typeof data.sound === 'string' ? data.sound : 'Marimba Ringtone',
    snoozeMinutes: typeof data.snoozeMinutes === 'number' ? data.snoozeMinutes : 5,
    vibrate: typeof data.vibrate === 'boolean' ? data.vibrate : true,
    notificationIdentifier: notification.request.identifier,
  };
}

export async function dismissAlarmNotification(identifier?: string): Promise<void> {
  if (!identifier) return;
  await Notifications.dismissNotificationAsync(identifier).catch(() => undefined);
}

export async function snoozeAlarmNotification(payload: AlarmRingPayload): Promise<void> {
  const channelId = await ensureAlarmChannel(payload.sound, payload.vibrate);
  const soundFile = soundFileFor(payload.sound);
  const minutes = Math.max(1, payload.snoozeMinutes);
  await Notifications.scheduleNotificationAsync({
    identifier: `${ALARM_PREFIX}${payload.alarmId}_snooze`,
    content: {
      title: payload.label || 'Alarm',
      body: `Snoozed for ${minutes} minute${minutes === 1 ? '' : 's'}`,
      sound: soundFile === null ? false : (soundFile ?? 'default'),
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: ALARM_CATEGORY_ID,
      sticky: true,
      autoDismiss: false,
      data: { type: 'alarm', ...payload, notificationIdentifier: undefined },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + minutes * 60_000),
      channelId,
    },
  });
  await dismissAlarmNotification(payload.notificationIdentifier);
}

export async function cancelAlarmNotifications(id: string): Promise<void> {
  await Promise.all(
    possibleAlarmIdentifiers(id).map(identifier =>
      Notifications.cancelScheduledNotificationAsync(identifier)
    )
  );
}

export async function scheduleAlarmNotifications(alarm: AlarmNotificationInput): Promise<string[]> {
  await cancelAlarmNotifications(alarm.id);
  if (!alarm.active) return [];

  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) {
    throw new Error('Notification permission is required for alarms.');
  }

  const channelId = await ensureAlarmChannel(alarm.sound, alarm.vibrate);
  const hour24 = to24Hour(alarm.hour, alarm.period);
  const content = alarmContent(alarm);

  const selectedDays = alarm.days
    .map((selected, day) => selected ? day : -1)
    .filter(day => day >= 0);
  const scheduledIds: string[] = [];

  try {
    if (selectedDays.length > 0) {
      for (const day of selectedDays) {
        const identifier = `${ALARM_PREFIX}${alarm.id}_day_${day}`;
        await Notifications.scheduleNotificationAsync({
          identifier,
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: day + 1,
            hour: hour24,
            minute: alarm.minute,
            channelId,
          },
        });
        scheduledIds.push(identifier);
      }
    } else {
      const date = alarm.scheduledFor ? new Date(alarm.scheduledFor) : new Date();
      if (!alarm.scheduledFor) {
        date.setHours(hour24, alarm.minute, 0, 0);
        if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
      }
      if (date.getTime() <= Date.now()) {
        throw new Error('This one-time alarm has already passed. Choose a future time.');
      }
      const identifier = `${ALARM_PREFIX}${alarm.id}_once`;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId,
        },
      });
      scheduledIds.push(identifier);
    }

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const confirmed = new Set(scheduled.map(request => request.identifier));
    if (!scheduledIds.every(identifier => confirmed.has(identifier))) {
      throw new Error('The operating system did not retain every alarm schedule.');
    }
    return scheduledIds;
  } catch (error) {
    await cancelAlarmNotifications(alarm.id);
    throw error;
  }
}

async function performAlarmReconciliation(alarms: AlarmNotificationInput[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = new Set(scheduled.map(request => request.identifier));
  const knownAlarmIds = new Set(alarms.map(alarm => alarm.id));
  const orphaned = scheduled
    .filter(request => request.identifier.startsWith(ALARM_PREFIX))
    .filter(request => {
      const identifier = request.identifier.slice(ALARM_PREFIX.length);
      return ![...knownAlarmIds].some(id => identifier === id || identifier.startsWith(`${id}_`));
    });

  await Promise.all(orphaned.map(request => {
    scheduledIds.delete(request.identifier);
    return Notifications.cancelScheduledNotificationAsync(request.identifier);
  }));

  for (const alarm of alarms) {
    if (!alarm.active) {
      await cancelAlarmNotifications(alarm.id);
      continue;
    }

    // Never replace an alarm that Android has already accepted. Cancelling and
    // recreating nearby alarms as the app foregrounds can cause AlarmManager to
    // miss their exact window and defer them by several minutes.
    const expectedIds = expectedAlarmIdentifiers(alarm);
    if (expectedIds.every(identifier => scheduledIds.has(identifier))) continue;

    const repaired = await scheduleAlarmNotifications(alarm);
    repaired.forEach(identifier => scheduledIds.add(identifier));
  }
}

let reconciliationQueue: Promise<void> = Promise.resolve();

export function reconcileAlarmNotifications(alarms: AlarmNotificationInput[]): Promise<void> {
  const snapshot = alarms.map(alarm => ({ ...alarm, days: [...alarm.days] }));
  const result = reconciliationQueue.then(() => performAlarmReconciliation(snapshot));
  reconciliationQueue = result.catch(() => undefined);
  return result;
}

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
        content: { title: `Reminder: ${title}`, body: `Starts at ${startTime}`, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: Math.max(0, h),
          minute: Math.max(0, m),
        },
      });
    } else if (recurrence === 'weekly') {
      await Notifications.scheduleNotificationAsync({
        identifier: `event_${id}`,
        content: { title: `Weekly reminder: ${title}`, body: `Starts at ${startTime}`, sound: true },
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
        content: { title: `Upcoming: ${title}`, body: `Starts at ${startTime} · in ${minutesBefore} minutes`, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }
  } catch {}
}

export async function cancelNotification(notifId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notifId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
