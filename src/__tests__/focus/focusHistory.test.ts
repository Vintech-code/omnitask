import {
  calculateFocusMetrics,
  createFocusSession,
  finishFocusSession,
  focusSessionElapsedMs,
  focusSessionExpectedEndAt,
  pauseFocusSession,
  resumeFocusSession,
  type FocusPreferences,
  type LegacyFocusSummary,
} from '@/types/focus';

const preferences: FocusPreferences = {
  dailyGoalMinutes: 60,
  updatedAt: 1,
  version: 1,
};

describe('Focus session history', () => {
  it('records actual start, pause, resume, interruption, and completion times', () => {
    const start = new Date(2026, 6, 24, 9, 0).getTime();
    const created = createFocusSession(
      { kind: 'pomodoro', plannedMinutes: 25, taskId: 'task-1', noteId: 'note-1' },
      start,
      'focus-1',
    );
    const paused = pauseFocusSession(created, start + 10 * 60_000);
    const resumed = resumeFocusSession(paused, start + 15 * 60_000);
    const completed = finishFocusSession(resumed, true, start + 30 * 60_000);

    expect(paused).toMatchObject({ status: 'paused', interruptionCount: 1, elapsedMs: 10 * 60_000 });
    expect(resumed.segments).toEqual([
      { startedAt: start, endedAt: start + 10 * 60_000 },
      { startedAt: start + 15 * 60_000 },
    ]);
    expect(focusSessionExpectedEndAt(resumed)).toBe(start + 30 * 60_000);
    expect(completed).toMatchObject({
      status: 'completed',
      completed: true,
      elapsedMs: 25 * 60_000,
      endedAt: start + 30 * 60_000,
      taskId: 'task-1',
      noteId: 'note-1',
    });
  });

  it('counts active elapsed time while the app is backgrounded without inventing a pause', () => {
    const start = new Date(2026, 6, 24, 10, 0).getTime();
    const active = createFocusSession(
      { kind: 'pomodoro', plannedMinutes: 25 },
      start,
      'focus-background',
    );

    expect(focusSessionElapsedMs(active, start + 8 * 60_000)).toBe(8 * 60_000);
    expect(active.interruptionCount).toBe(0);
    expect(active.segments).toEqual([{ startedAt: start }]);
  });

  it('splits actual minutes correctly across midnight', () => {
    const start = new Date(2026, 6, 23, 23, 50).getTime();
    const end = new Date(2026, 6, 24, 0, 10).getTime();
    const now = new Date(2026, 6, 24, 12, 0).getTime();
    const completed = finishFocusSession(
      createFocusSession({ kind: 'stopwatch', plannedMinutes: 0 }, start, 'midnight'),
      true,
      end,
    );
    const metrics = calculateFocusMetrics([completed], preferences, null, now);

    expect(metrics.todayMinutes).toBe(10);
    expect(metrics.weekMinutes).toBe(20);
    expect(metrics.lifetimeMinutes).toBe(20);
    expect(metrics.todayCompletedSessions).toBe(1);
  });

  it('keeps incomplete work as actual time without calling it a completed session', () => {
    const start = new Date(2026, 6, 24, 13, 0).getTime();
    const abandoned = finishFocusSession(
      createFocusSession({ kind: 'pomodoro', plannedMinutes: 25 }, start, 'incomplete'),
      false,
      start + 12 * 60_000,
    );
    const metrics = calculateFocusMetrics(
      [abandoned],
      preferences,
      null,
      start + 30 * 60_000,
    );

    expect(metrics.lifetimeMinutes).toBe(12);
    expect(metrics.todayCompletedSessions).toBe(0);
    expect(metrics.lifetimeCompletedSessions).toBe(0);
  });

  it('preserves the legacy count without fabricating dates or focus minutes', () => {
    const legacy: LegacyFocusSummary = {
      completedSessionCount: 7,
      importedAt: Date.now(),
      source: 'legacy-session-counter',
      version: 1,
    };
    const metrics = calculateFocusMetrics([], preferences, legacy, Date.now());

    expect(metrics.lifetimeCompletedSessions).toBe(7);
    expect(metrics.legacyCompletedSessions).toBe(7);
    expect(metrics.lifetimeMinutes).toBe(0);
    expect(metrics.todayCompletedSessions).toBe(0);
  });

  it('calculates goal streaks, interruptions, and the most productive hour from history', () => {
    const sessionAt = (day: number, hour: number, id: string) => {
      const start = new Date(2026, 6, day, hour).getTime();
      return finishFocusSession(
        createFocusSession({ kind: 'stopwatch', plannedMinutes: 0 }, start, id),
        true,
        start + 60 * 60_000,
      );
    };
    const first = sessionAt(22, 9, 'first');
    const second = sessionAt(23, 14, 'second');
    const interrupted = pauseFocusSession(
      createFocusSession(
        { kind: 'pomodoro', plannedMinutes: 60 },
        new Date(2026, 6, 24, 14).getTime(),
        'third',
      ),
      new Date(2026, 6, 24, 14, 30).getTime(),
    );
    const third = finishFocusSession(
      resumeFocusSession(interrupted, new Date(2026, 6, 24, 14, 35).getTime()),
      true,
      new Date(2026, 6, 24, 15, 5).getTime(),
    );
    const metrics = calculateFocusMetrics(
      [first, second, third],
      preferences,
      null,
      new Date(2026, 6, 24, 18).getTime(),
    );

    expect(metrics.currentStreak).toBe(3);
    expect(metrics.interruptionCount).toBe(1);
    expect(metrics.productiveHour).toBe(14);
    expect(metrics.goalProgress).toBe(1);
  });
});
