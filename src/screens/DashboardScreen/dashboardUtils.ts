import type { Alarm } from '@/context/AlarmStore';
import type { Task } from '@/types/task';

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + amount);
  return result;
}

function alarmMinutes(alarm: Alarm) {
  let hour = alarm.hour;
  if (alarm.period === 'PM' && hour !== 12) hour += 12;
  if (alarm.period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + alarm.minute;
}

export function nextAlarmOccurrence(alarm: Alarm, now: Date): Date | null {
  if (!alarm.active) return null;
  if (alarm.scheduledFor) {
    const scheduled = new Date(alarm.scheduledFor);
    return scheduled.getTime() > now.getTime() ? scheduled : null;
  }
  const selectedDays = alarm.days
    .map((selected, index) => selected ? index : -1)
    .filter(index => index >= 0);
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = addDays(now, offset);
    const minutes = alarmMinutes(alarm);
    candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    const dayMatches = selectedDays.length === 0 || selectedDays.includes(candidate.getDay());
    if (dayMatches && candidate.getTime() > now.getTime()) return candidate;
  }
  return null;
}

export function nextAlarmFrom(alarms: Alarm[], now: Date) {
  return alarms
    .map(alarm => ({ alarm, occurrence: nextAlarmOccurrence(alarm, now) }))
    .filter((value): value is { alarm: Alarm; occurrence: Date } => Boolean(value.occurrence))
    .sort((left, right) => left.occurrence.getTime() - right.occurrence.getTime())[0] ?? null;
}

export function taskMeta(task: Task) {
  const timestamp = task.scheduledStart ?? task.dueAt;
  if (timestamp) {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return task.projectId ? `${time} · ${task.projectId}` : time;
  }
  return task.projectId || `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`;
}
