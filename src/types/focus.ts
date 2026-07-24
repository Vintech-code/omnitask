export const FOCUS_SESSION_SCHEMA_VERSION = 1;
export const FOCUS_PREFERENCES_SCHEMA_VERSION = 1;
export const DEFAULT_DAILY_FOCUS_GOAL_MINUTES = 200;

export type FocusSessionKind = 'pomodoro' | 'stopwatch';
export type FocusSessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface FocusSegment {
  startedAt: number;
  endedAt?: number;
}

export interface FocusSession {
  id: string;
  kind: FocusSessionKind;
  status: FocusSessionStatus;
  taskId?: string;
  noteId?: string;
  startedAt: number;
  endedAt?: number;
  plannedMinutes: number;
  elapsedMs: number;
  completed: boolean;
  interruptionCount: number;
  segments: FocusSegment[];
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface FocusPreferences {
  dailyGoalMinutes: number;
  updatedAt: number;
  version: number;
}

export interface LegacyFocusSummary {
  completedSessionCount: number;
  importedAt: number;
  source: 'legacy-session-counter';
  version: number;
}

export interface FocusMetrics {
  todayMinutes: number;
  todayCompletedSessions: number;
  weekMinutes: number;
  lifetimeMinutes: number;
  lifetimeCompletedSessions: number;
  legacyCompletedSessions: number;
  currentStreak: number;
  interruptionCount: number;
  productiveHour: number | null;
  goalProgress: number;
}

export interface StartFocusSessionInput {
  kind: FocusSessionKind;
  plannedMinutes: number;
  taskId?: string;
  noteId?: string;
}

const closedSegmentDuration = (segment: FocusSegment, now: number) =>
  Math.max(0, (segment.endedAt ?? now) - segment.startedAt);

export function focusSessionElapsedMs(session: FocusSession, now = Date.now()): number {
  return session.segments.reduce((total, segment) => (
    total + closedSegmentDuration(
      segment,
      session.status === 'active' ? now : segment.endedAt ?? session.updatedAt,
    )
  ), 0);
}

export function focusSessionExpectedEndAt(session: FocusSession): number | null {
  if (session.status !== 'active' || session.plannedMinutes <= 0) return null;
  const openSegment = [...session.segments].reverse().find(segment => segment.endedAt === undefined);
  if (!openSegment) return null;
  const closedMs = session.segments.reduce((total, segment) => (
    total + (typeof segment.endedAt === 'number'
      ? Math.max(0, segment.endedAt - segment.startedAt)
      : 0)
  ), 0);
  return openSegment.startedAt + Math.max(0, session.plannedMinutes * 60_000 - closedMs);
}

export function createFocusSession(
  input: StartFocusSessionInput,
  now = Date.now(),
  id = `focus_${now}_${Math.random().toString(36).slice(2, 9)}`,
): FocusSession {
  return {
    id,
    kind: input.kind,
    status: 'active',
    taskId: input.taskId,
    noteId: input.noteId,
    startedAt: now,
    plannedMinutes: Math.max(0, input.plannedMinutes),
    elapsedMs: 0,
    completed: false,
    interruptionCount: 0,
    segments: [{ startedAt: now }],
    createdAt: now,
    updatedAt: now,
    version: FOCUS_SESSION_SCHEMA_VERSION,
  };
}

export function pauseFocusSession(session: FocusSession, now = Date.now()): FocusSession {
  if (session.status !== 'active') return session;
  const segments = session.segments.map((segment, index) => (
    index === session.segments.length - 1 && segment.endedAt === undefined
      ? { ...segment, endedAt: Math.max(segment.startedAt, now) }
      : segment
  ));
  const updated = {
    ...session,
    status: 'paused' as const,
    segments,
    interruptionCount: session.interruptionCount + 1,
    updatedAt: now,
  };
  return { ...updated, elapsedMs: focusSessionElapsedMs(updated, now) };
}

export function resumeFocusSession(session: FocusSession, now = Date.now()): FocusSession {
  if (session.status !== 'paused') return session;
  return {
    ...session,
    status: 'active',
    segments: [...session.segments, { startedAt: now }],
    updatedAt: now,
  };
}

export function finishFocusSession(
  session: FocusSession,
  completed: boolean,
  now = Date.now(),
): FocusSession {
  if (session.status === 'completed' || session.status === 'abandoned') return session;
  const segments = session.segments.map((segment, index) => (
    index === session.segments.length - 1 && segment.endedAt === undefined
      ? { ...segment, endedAt: Math.max(segment.startedAt, now) }
      : segment
  ));
  const endedAt = Math.max(session.startedAt, now);
  const updated = {
    ...session,
    status: completed ? 'completed' as const : 'abandoned' as const,
    completed,
    endedAt,
    segments,
    updatedAt: endedAt,
  };
  return { ...updated, elapsedMs: focusSessionElapsedMs(updated, endedAt) };
}

function startOfDay(value: number | Date): number {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function overlapMs(start: number, end: number, rangeStart: number, rangeEnd: number): number {
  return Math.max(0, Math.min(end, rangeEnd) - Math.max(start, rangeStart));
}

function focusedMsInRange(
  session: FocusSession,
  rangeStart: number,
  rangeEnd: number,
  now: number,
): number {
  return session.segments.reduce((total, segment) => {
    const end = segment.endedAt
      ?? (session.status === 'active' ? now : session.updatedAt);
    return total + overlapMs(segment.startedAt, end, rangeStart, rangeEnd);
  }, 0);
}

export function calculateFocusMetrics(
  sessions: FocusSession[],
  preferences: FocusPreferences,
  legacy: LegacyFocusSummary | null,
  now = Date.now(),
): FocusMetrics {
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekStartDate = new Date(todayStart);
  const weekday = weekStartDate.getDay();
  weekStartDate.setDate(weekStartDate.getDate() - (weekday === 0 ? 6 : weekday - 1));
  const weekStart = weekStartDate.getTime();
  const ended = sessions.filter(session => (
    session.status === 'completed' || session.status === 'abandoned'
  ));
  const todayMs = sessions.reduce((total, session) => (
    total + focusedMsInRange(session, todayStart, tomorrowStart.getTime(), now)
  ), 0);
  const weekMs = sessions.reduce((total, session) => (
    total + focusedMsInRange(session, weekStart, tomorrowStart.getTime(), now)
  ), 0);
  const lifetimeMs = ended.reduce((total, session) => total + session.elapsedMs, 0);
  const todayCompletedSessions = ended.filter(session => (
    session.completed
    && typeof session.endedAt === 'number'
    && session.endedAt >= todayStart
    && session.endedAt < tomorrowStart.getTime()
  )).length;

  const byDay = new Map<number, number>();
  for (const session of ended) {
    for (const segment of session.segments) {
      const end = segment.endedAt ?? session.updatedAt;
      let cursor = startOfDay(segment.startedAt);
      while (cursor < end) {
        const next = new Date(cursor);
        next.setDate(next.getDate() + 1);
        const nextTime = next.getTime();
        byDay.set(
          cursor,
          (byDay.get(cursor) ?? 0) + overlapMs(segment.startedAt, end, cursor, nextTime),
        );
        cursor = nextTime;
      }
    }
  }

  let currentStreak = 0;
  const streakCursor = new Date(todayStart);
  if ((byDay.get(streakCursor.getTime()) ?? 0) < preferences.dailyGoalMinutes * 60_000) {
    streakCursor.setDate(streakCursor.getDate() - 1);
  }
  while ((byDay.get(streakCursor.getTime()) ?? 0) >= preferences.dailyGoalMinutes * 60_000) {
    currentStreak += 1;
    streakCursor.setDate(streakCursor.getDate() - 1);
  }

  const hourTotals = Array.from({ length: 24 }, () => 0);
  for (const session of ended) {
    for (const segment of session.segments) {
      const end = segment.endedAt ?? session.updatedAt;
      let cursor = segment.startedAt;
      while (cursor < end) {
        const hourEnd = new Date(cursor);
        hourEnd.setMinutes(60, 0, 0);
        const sliceEnd = Math.min(end, hourEnd.getTime());
        hourTotals[new Date(cursor).getHours()] += sliceEnd - cursor;
        cursor = sliceEnd;
      }
    }
  }
  const maxHourMs = Math.max(...hourTotals);
  const productiveHour = maxHourMs > 0 ? hourTotals.indexOf(maxHourMs) : null;
  const todayMinutes = todayMs / 60_000;

  return {
    todayMinutes,
    todayCompletedSessions,
    weekMinutes: weekMs / 60_000,
    lifetimeMinutes: lifetimeMs / 60_000,
    lifetimeCompletedSessions: ended.filter(session => session.completed).length
      + (legacy?.completedSessionCount ?? 0),
    legacyCompletedSessions: legacy?.completedSessionCount ?? 0,
    currentStreak,
    interruptionCount: ended.reduce((total, session) => total + session.interruptionCount, 0),
    productiveHour,
    goalProgress: Math.min(1, todayMinutes / Math.max(1, preferences.dailyGoalMinutes)),
  };
}
