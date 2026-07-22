import type { AppEvent } from '@/types/event';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseEventDateParts(value: string): { year: number; month: number; day: number } | null {
  const match = value.trim().match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTHS.findIndex(item => item.toLowerCase() === match[1].toLowerCase());
  if (month < 0) return null;
  const year = Number(match[3]);
  const day = Number(match[2]);
  if (day < 1 || day > new Date(year, month + 1, 0).getDate()) return null;
  return { year, month, day };
}

export const COMMON_TIME_ZONES = [
  'UTC',
  'Asia/Manila',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Hong_Kong',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Pacific/Auckland',
];

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function zonedDate(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const target = Date.UTC(year, month, day, hour, minute, 0, 0);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const offsetAt = (timestamp: number) => {
    const values = Object.fromEntries(
      formatter.formatToParts(new Date(timestamp)).map(part => [part.type, part.value]),
    );
    const represented = Date.UTC(
      Number(values.year), Number(values.month) - 1, Number(values.day),
      Number(values.hour), Number(values.minute), Number(values.second),
    );
    return represented - timestamp;
  };
  let result = target - offsetAt(target);
  result = target - offsetAt(result);
  return new Date(result);
}

export function parseEventDateTime(startDate: string, startTime: string, timeZone = systemTimeZone()): Date | null {
  const dateMatch = startDate.trim().match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
  const timeMatch = startTime.trim().match(/^(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (!dateMatch || !timeMatch) return null;
  const month = MONTHS.findIndex(value => value.toLowerCase() === dateMatch[1].toLowerCase());
  if (month < 0) return null;
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const period = timeMatch[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  if (period === 'AM') hour = hour === 12 ? 0 : hour;
  else hour = hour === 12 ? 12 : hour + 12;
  let result: Date;
  try {
    result = zonedDate(Number(dateMatch[3]), month, Number(dateMatch[2]), hour, minute, timeZone);
  } catch {
    result = new Date(Number(dateMatch[3]), month, Number(dateMatch[2]), hour, minute, 0, 0);
  }
  return Number.isNaN(result.getTime()) ? null : result;
}

export function eventStart(
  event: Pick<AppEvent, 'startDate' | 'startTime'> & Partial<Pick<AppEvent, 'allDay' | 'timeZone'>>,
): Date | null {
  return parseEventDateTime(
    event.startDate,
    event.allDay ? '12:00 AM' : event.startTime,
    event.timeZone ?? systemTimeZone(),
  );
}

export function datePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdays.indexOf(parts.weekday) + 1,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function eventEnd(event: AppEvent): Date | null {
  const endDate = event.endDate || event.startDate;
  const endTime = event.allDay ? '11:59 PM' : (event.endTime || event.startTime);
  return parseEventDateTime(endDate, endTime, event.timeZone ?? systemTimeZone());
}

export function eventOccursOnDate(event: AppEvent, date: Date): boolean {
  const start = parseEventDateParts(event.startDate);
  const end = parseEventDateParts(event.endDate || event.startDate);
  if (!start || !end) return false;
  const targetKey = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const startKey = Date.UTC(start.year, start.month, start.day);
  const endKey = Date.UTC(end.year, end.month, end.day);
  if (targetKey < startKey) return false;

  const recurrence = event.recurrence ?? 'none';
  if (recurrence === 'none') return targetKey <= endKey;
  if (recurrence === 'daily') return true;

  const elapsedDays = Math.round((targetKey - startKey) / 86_400_000);
  if (recurrence === 'weekly') return elapsedDays % 7 === 0;
  return date.getDate() === start.day;
}

export function eventOccurrenceStartOnDate(event: AppEvent, date: Date): Date | null {
  if (!eventOccursOnDate(event, date)) return null;
  const start = parseEventDateParts(event.startDate);
  if (!start) return null;
  const recurrence = event.recurrence ?? 'none';
  const isOriginalStart = start.year === date.getFullYear()
    && start.month === date.getMonth()
    && start.day === date.getDate();
  if (recurrence === 'none' && isOriginalStart) return eventStart(event);

  const dateLabel = `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  return parseEventDateTime(
    dateLabel,
    event.allDay || recurrence === 'none' ? '12:00 AM' : event.startTime,
    event.timeZone ?? systemTimeZone(),
  );
}

export function formatEventSchedule(event: AppEvent): string {
  const endDate = event.endDate && event.endDate !== event.startDate ? ` – ${event.endDate}` : '';
  if (event.allDay) return `${event.startDate}${endDate} · All day`;
  const endTime = event.endTime ? ` – ${event.endTime}` : '';
  return `${event.startDate}${endDate} · ${event.startTime}${endTime}`;
}

export function reminderMinutes(label: string): number | null {
  const normalized = label.trim().toLowerCase();
  const amount = Number.parseInt(normalized, 10);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (normalized.includes('day')) return amount * 24 * 60;
  if (normalized.includes('hour')) return amount * 60;
  if (normalized.includes('minute') || normalized.includes('min')) return amount;
  return null;
}

export function nextUpcomingEvent(events: AppEvent[], now = new Date()): AppEvent | undefined {
  return events
    .map(event => ({ event, start: eventStart(event), end: eventEnd(event) }))
    .filter((item): item is { event: AppEvent; start: Date; end: Date } => Boolean(
      item.start && item.end && item.end.getTime() >= now.getTime(),
    ))
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0]?.event;
}

export function canScheduleEventReminders(event: AppEvent, now = new Date()): boolean {
  if (event.reminders.length === 0) return false;
  if ((event.recurrence ?? 'none') !== 'none') return true;
  const start = event.allDay
    ? parseEventDateTime(event.startDate, '09:00 AM', event.timeZone ?? systemTimeZone())
    : eventStart(event);
  if (!start) return false;
  return event.reminders.some(label => {
    const minutes = reminderMinutes(label);
    return minutes !== null && start.getTime() - minutes * 60_000 > now.getTime();
  });
}
