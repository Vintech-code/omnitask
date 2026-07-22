import {
  eventOccursOnDate,
  eventOccurrenceStartOnDate,
  formatEventSchedule,
  nextUpcomingEvent,
  parseEventDateTime,
  reminderMinutes,
} from '@/utils/eventDate';
import type { AppEvent } from '@/types/event';

const event = (overrides: Partial<AppEvent> = {}): AppEvent => ({
  id: 'event-1',
  title: 'Conference',
  description: '',
  startDate: 'Jul 17, 2026',
  startTime: '08:00 AM',
  endDate: 'Jul 19, 2026',
  endTime: '05:00 PM',
  allDay: false,
  timeZone: 'Asia/Manila',
  location: '',
  category: 'Work',
  priority: 'Medium',
  reminders: ['15 minutes before'],
  recurrence: 'none',
  alarmActive: true,
  ...overrides,
});

describe('event date and timezone behavior', () => {
  it('converts a wall-clock event time from its saved timezone', () => {
    expect(parseEventDateTime('Jul 17, 2026', '08:00 AM', 'Asia/Manila')?.toISOString())
      .toBe('2026-07-17T00:00:00.000Z');
    expect(parseEventDateTime('Jul 17, 2026', '08:00 AM', 'America/New_York')?.toISOString())
      .toBe('2026-07-17T12:00:00.000Z');
  });

  it('includes every day in a multi-day event range', () => {
    expect(eventOccursOnDate(event(), new Date(2026, 6, 16))).toBe(false);
    expect(eventOccursOnDate(event(), new Date(2026, 6, 17))).toBe(true);
    expect(eventOccursOnDate(event(), new Date(2026, 6, 18))).toBe(true);
    expect(eventOccursOnDate(event(), new Date(2026, 6, 19))).toBe(true);
    expect(eventOccursOnDate(event(), new Date(2026, 6, 20))).toBe(false);
  });

  it('reflects recurring events on their current occurrence date', () => {
    const weekly = event({ startDate: 'Jul 1, 2026', endDate: 'Jul 1, 2026', recurrence: 'weekly' });
    const daily = event({ startDate: 'Jul 20, 2026', endDate: 'Jul 20, 2026', recurrence: 'daily' });
    const monthly = event({ startDate: 'Jun 22, 2026', endDate: 'Jun 22, 2026', recurrence: 'monthly' });

    expect(eventOccursOnDate(weekly, new Date(2026, 6, 22))).toBe(true);
    expect(eventOccursOnDate(daily, new Date(2026, 6, 22))).toBe(true);
    expect(eventOccursOnDate(monthly, new Date(2026, 6, 22))).toBe(true);
    expect(eventOccurrenceStartOnDate(weekly, new Date(2026, 6, 22))?.toISOString()).toBe('2026-07-22T00:00:00.000Z');
  });

  it('formats all-day ranges without misleading midnight times', () => {
    expect(formatEventSchedule(event({ allDay: true, startTime: '12:00 AM', endTime: '' })))
      .toBe('Jul 17, 2026 – Jul 19, 2026 · All day');
  });

  it('parses supported reminder offsets', () => {
    expect(reminderMinutes('30 minutes before')).toBe(30);
    expect(reminderMinutes('1 hour before')).toBe(60);
    expect(reminderMinutes('1 day before')).toBe(1440);
  });

  it('keeps an ongoing all-day event in the upcoming summary', () => {
    const allDay = event({
      allDay: true,
      startDate: 'Jul 17, 2026',
      endDate: 'Jul 17, 2026',
      startTime: '12:00 AM',
      endTime: '',
    });
    expect(nextUpcomingEvent([allDay], new Date('2026-07-17T04:00:00.000Z'))?.id).toBe(allDay.id);
  });
});
