import * as Notifications from 'expo-notifications';

import {
  buildEventNotificationRequests,
  scheduleEventNotifications,
} from '@/services/EventNotificationService';
import type { AppEvent } from '@/types/event';

const baseEvent = (overrides: Partial<AppEvent> = {}): AppEvent => ({
  id: 'event-1',
  title: 'Flight',
  description: '',
  startDate: 'Jul 20, 2026',
  startTime: '08:00 AM',
  endDate: 'Jul 20, 2026',
  endTime: '09:00 AM',
  allDay: false,
  timeZone: 'Asia/Manila',
  location: 'Airport',
  latitude: 14.5086,
  longitude: 121.0198,
  category: 'Travel',
  priority: 'High',
  reminders: ['15 minutes before', '1 hour before'],
  recurrence: 'none',
  alarmActive: true,
  ...overrides,
});

describe('event notification scheduling', () => {
  it('builds one timezone-correct request per reminder', () => {
    const requests = buildEventNotificationRequests(baseEvent(), new Date('2026-07-17T00:00:00Z'));
    expect(requests.map(request => request.identifier)).toEqual(['event_event-1_15', 'event_event-1_60']);
    expect(requests.every(request => (request.trigger as Notifications.DateTriggerInput).type === Notifications.SchedulableTriggerInputTypes.DATE)).toBe(true);
  });

  it('uses timezone-aware repeating calendar triggers', () => {
    const [request] = buildEventNotificationRequests(
      baseEvent({ recurrence: 'weekly', reminders: ['15 minutes before'] }),
      new Date('2026-07-17T00:00:00Z'),
    );
    expect(request.trigger).toEqual(expect.objectContaining({
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      timezone: 'Asia/Manila',
      repeats: true,
      weekday: 2,
      hour: 7,
      minute: 45,
    }));
  });

  it('does not schedule and reports a denied permission state', async () => {
    const schedule = jest.fn();
    await expect(scheduleEventNotifications(baseEvent(), {
      getAllScheduled: jest.fn(async () => []),
      cancelScheduled: jest.fn(async () => undefined),
      schedule,
      requestPermission: jest.fn(async () => false),
      now: () => new Date('2026-07-17T00:00:00Z'),
    })).rejects.toThrow('Notification permission is required');
    expect(schedule).not.toHaveBeenCalled();
  });

  it('cleans up event notifications after a partial scheduling failure', async () => {
    const getAllScheduled = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ identifier: 'event_event-1_15' }]);
    const cancelScheduled = jest.fn(async () => undefined);
    const schedule = jest.fn()
      .mockResolvedValueOnce('event_event-1_15')
      .mockRejectedValueOnce(new Error('native scheduling failed'));

    await expect(scheduleEventNotifications(baseEvent(), {
      getAllScheduled,
      cancelScheduled,
      schedule,
      requestPermission: jest.fn(async () => true),
      now: () => new Date('2026-07-17T00:00:00Z'),
    })).rejects.toThrow('native scheduling failed');
    expect(cancelScheduled).toHaveBeenCalledWith('event_event-1_15');
  });
});
