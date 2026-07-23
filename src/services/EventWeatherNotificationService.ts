import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { requestNotificationPermission } from '@/services/NotificationService';
import { getWeatherForecast } from '@/services/WeatherService';
import { KEYS, Storage } from '@/services/StorageService';
import { eventStart, parseEventDateTime, systemTimeZone } from '@/utils/eventDate';
import { assessWeatherWarning, nearestHourlyWeather, weatherWarningBody } from '@/utils/weather';
import type { AppEvent } from '@/types/event';
import { OMNITASK_PALETTE } from '@/theme/colors';

const WEATHER_NOTIFICATION_PREFIX = 'weather_event_';
const WEATHER_CHANNEL_ID = 'event-weather-warnings';
const FORECAST_HORIZON_MS = 16 * 24 * 60 * 60_000;
const WARNING_LEAD_MS = 3 * 60 * 60_000;

interface WarningRecord {
  fingerprint: string;
  warningAt: number;
}

type WarningState = Record<string, WarningRecord>;

export interface EventWeatherDependencies {
  getForecast: typeof getWeatherForecast;
  getAllScheduled: typeof Notifications.getAllScheduledNotificationsAsync;
  cancelScheduled: typeof Notifications.cancelScheduledNotificationAsync;
  schedule: typeof Notifications.scheduleNotificationAsync;
  requestPermission: typeof requestNotificationPermission;
  configureChannel: () => Promise<void>;
  loadState: (uid: string) => Promise<WarningState>;
  saveState: (uid: string, state: WarningState) => Promise<void>;
  now: () => Date;
}

async function configureWeatherChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(WEATHER_CHANNEL_ID, {
    name: 'Event weather warnings',
    description: 'Weather advisories for upcoming events with a saved location',
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
    vibrationPattern: [0, 250, 150, 250],
    enableLights: true,
    lightColor: OMNITASK_PALETTE.actionBlue,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

const defaultDependencies: EventWeatherDependencies = {
  getForecast: getWeatherForecast,
  getAllScheduled: Notifications.getAllScheduledNotificationsAsync,
  cancelScheduled: Notifications.cancelScheduledNotificationAsync,
  schedule: Notifications.scheduleNotificationAsync,
  requestPermission: requestNotificationPermission,
  configureChannel: configureWeatherChannel,
  loadState: async uid => (await Storage.getForUser<WarningState>(KEYS.EVENT_WEATHER_WARNINGS, uid)) ?? {},
  saveState: (uid, state) => Storage.setForUser(KEYS.EVENT_WEATHER_WARNINGS, uid, state),
  now: () => new Date(),
};

function weatherDate(event: AppEvent): Date | null {
  if (!event.allDay) return eventStart(event);
  return parseEventDateTime(event.startDate, '09:00 AM', event.timeZone ?? systemTimeZone());
}

function validEventCoordinates(event: AppEvent): event is AppEvent & { latitude: number; longitude: number } {
  return typeof event.latitude === 'number' && Number.isFinite(event.latitude)
    && typeof event.longitude === 'number' && Number.isFinite(event.longitude);
}

function eventFingerprint(event: AppEvent, start: Date): string {
  return [start.getTime(), event.latitude?.toFixed(4), event.longitude?.toFixed(4)].join(':');
}

export async function syncEventWeatherWarnings(
  events: AppEvent[],
  uid: string,
  overrides: Partial<EventWeatherDependencies> = {},
): Promise<void> {
  const dependencies = { ...defaultDependencies, ...overrides };
  const now = dependencies.now();
  const horizon = now.getTime() + FORECAST_HORIZON_MS;
  const candidates = events
    .map(event => ({ event, start: weatherDate(event) }))
    .filter((item): item is { event: AppEvent & { latitude: number; longitude: number }; start: Date } => (
      validEventCoordinates(item.event)
      && Boolean(item.start)
      && item.start!.getTime() > now.getTime()
      && item.start!.getTime() <= horizon
    ));

  const state = await dependencies.loadState(uid);
  const candidateIds = new Set(candidates.map(item => item.event.id));
  const scheduled = await dependencies.getAllScheduled();
  const scheduledIds = new Set(scheduled.map(item => item.identifier));
  const stale = scheduled.filter(request => (
    request.identifier.startsWith(WEATHER_NOTIFICATION_PREFIX)
    && !candidateIds.has(request.identifier.slice(WEATHER_NOTIFICATION_PREFIX.length))
  ));
  await Promise.all(stale.map(request => dependencies.cancelScheduled(request.identifier)));
  let stateChanged = stale.length > 0;
  Object.keys(state).forEach(eventId => {
    if (!candidateIds.has(eventId)) {
      delete state[eventId];
      stateChanged = true;
    }
  });

  let notificationsReady = false;
  for (const { event, start } of candidates) {
    try {
      const forecast = await dependencies.getForecast(
        { latitude: event.latitude, longitude: event.longitude },
        { forecastDays: 16 },
      );
      const hourly = nearestHourlyWeather(forecast.hourly, start, 90 * 60_000);
      if (!hourly || Math.abs(hourly.time.getTime() - start.getTime()) > 90 * 60_000) continue;

      const assessment = assessWeatherWarning(hourly);
      const identifier = `${WEATHER_NOTIFICATION_PREFIX}${event.id}`;
      const fingerprint = eventFingerprint(event, start);
      const warningAt = Math.max(now.getTime() + 2_000, start.getTime() - WARNING_LEAD_MS);
      if (!assessment.shouldWarn) {
        if (scheduledIds.has(identifier)) await dependencies.cancelScheduled(identifier);
        if (state[event.id]) {
          delete state[event.id];
          stateChanged = true;
        }
        continue;
      }

      const existing = state[event.id];
      if (existing?.fingerprint === fingerprint && (scheduledIds.has(identifier) || existing.warningAt <= now.getTime())) continue;
      if (!notificationsReady) {
        if (!await dependencies.requestPermission()) break;
        await dependencies.configureChannel();
        notificationsReady = true;
      }
      if (scheduledIds.has(identifier)) await dependencies.cancelScheduled(identifier);
      await dependencies.schedule({
        identifier,
        content: {
          title: `Weather warning: ${event.title}`,
          body: weatherWarningBody(event.title, hourly),
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'event-weather', eventId: event.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(warningAt),
          channelId: WEATHER_CHANNEL_ID,
        },
      });
      state[event.id] = { fingerprint, warningAt };
      stateChanged = true;
    } catch {
      // A weather or notification failure must never interrupt event persistence.
    }
  }
  if (stateChanged) await dependencies.saveState(uid, state);
}
