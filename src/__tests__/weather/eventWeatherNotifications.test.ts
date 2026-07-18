import * as Notifications from 'expo-notifications';

import { syncEventWeatherWarnings } from '@/services/EventWeatherNotificationService';
import type { AppEvent } from '@/types/event';
import type { WeatherForecast } from '@/types/weather';

const event: AppEvent = {
  id: 'outdoor-event',
  title: 'Site visit',
  description: '',
  startDate: 'Jul 20, 2026',
  startTime: '08:00 AM',
  endDate: 'Jul 20, 2026',
  endTime: '09:00 AM',
  allDay: false,
  timeZone: 'Asia/Manila',
  location: 'Manila',
  latitude: 14.6,
  longitude: 121,
  category: 'Work',
  priority: 'Medium',
  reminders: [],
  alarmActive: false,
  recurrence: 'none',
};

const forecast = (rainProbability: number): WeatherForecast => ({
  latitude: 14.6,
  longitude: 121,
  timezone: 'Asia/Manila',
  fetchedAt: Date.now(),
  current: {
    time: new Date('2026-07-19T00:00:00Z'),
    temperatureC: 29,
    precipitationProbability: 20,
    weatherCode: 2,
    windSpeedKmh: 10,
    isDay: true,
  },
  hourly: [{
    time: new Date('2026-07-20T00:00:00Z'),
    temperatureC: 28,
    precipitationProbability: rainProbability,
    weatherCode: rainProbability >= 60 ? 63 : 2,
    windSpeedKmh: 15,
    windGustKmh: 24,
  }],
});

describe('event weather notifications', () => {
  it('schedules one warning three hours before a rainy event', async () => {
    const schedule = jest.fn(async (_request: Notifications.NotificationRequestInput) => 'weather_event_outdoor-event');
    const saveState = jest.fn(async () => undefined);
    await syncEventWeatherWarnings([event], 'user-1', {
      getForecast: jest.fn(async () => forecast(75)),
      getAllScheduled: jest.fn(async () => []),
      cancelScheduled: jest.fn(async () => undefined),
      schedule,
      requestPermission: jest.fn(async () => true),
      configureChannel: jest.fn(async () => undefined),
      loadState: jest.fn(async () => ({})),
      saveState,
      now: () => new Date('2026-07-19T00:00:00Z'),
    });

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0][0]).toEqual(expect.objectContaining({
      identifier: 'weather_event_outdoor-event',
      content: expect.objectContaining({
        title: 'Weather warning: Site visit',
        data: { type: 'event-weather', eventId: 'outdoor-event' },
      }),
      trigger: expect.objectContaining({
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date('2026-07-19T21:00:00Z'),
      }),
    }));
    expect(saveState).toHaveBeenCalledWith('user-1', expect.objectContaining({
      'outdoor-event': expect.objectContaining({ warningAt: new Date('2026-07-19T21:00:00Z').getTime() }),
    }));
  });

  it('does not schedule a warning for a low-risk forecast', async () => {
    const schedule = jest.fn();
    await syncEventWeatherWarnings([event], 'user-1', {
      getForecast: jest.fn(async () => forecast(25)),
      getAllScheduled: jest.fn(async () => []),
      cancelScheduled: jest.fn(async () => undefined),
      schedule,
      requestPermission: jest.fn(async () => true),
      configureChannel: jest.fn(async () => undefined),
      loadState: jest.fn(async () => ({})),
      saveState: jest.fn(async () => undefined),
      now: () => new Date('2026-07-19T00:00:00Z'),
    });
    expect(schedule).not.toHaveBeenCalled();
  });
});
