import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FocusSessionContext, type FocusSessionContextValue } from '@/context/FocusSessionContext';
import { useTaskStore } from '@/context/TaskStore';
import {
  getPendingMutationPaths,
  recordCloudSnapshot,
  reportSyncDiagnostic,
  syncRevision,
  withoutSyncMetadata,
} from '@/services/OfflineSyncService';
import { KEYS, Storage } from '@/services/StorageService';
import {
  DEFAULT_DAILY_FOCUS_GOAL_MINUTES,
  FOCUS_PREFERENCES_SCHEMA_VERSION,
  FOCUS_SESSION_SCHEMA_VERSION,
  calculateFocusMetrics,
  createFocusSession,
  finishFocusSession,
  focusSessionExpectedEndAt,
  pauseFocusSession,
  resumeFocusSession,
  type FocusPreferences,
  type FocusSession,
  type LegacyFocusSummary,
  type StartFocusSessionInput,
} from '@/types/focus';
import { createUserCollectionRepository, createUserMetadataRepository } from '@/repositories';

const FOCUS_MIGRATION_VERSION = 1;
const focusSessionRepository = createUserCollectionRepository<FocusSession>('focusSessions');
const sessionPath = focusSessionRepository.path;
const preferenceRepository = createUserMetadataRepository<FocusPreferences>('focusPreferences');
const legacyRepository = createUserMetadataRepository<LegacyFocusSummary>('focusLegacySummary');
const oldStatsRepository = createUserMetadataRepository<{ sessions?: number }>('focusStats');
const preferencePath = preferenceRepository.path;
const legacyPath = legacyRepository.path;
const oldStatsPath = oldStatsRepository.path;

const defaultPreferences = (): FocusPreferences => ({
  dailyGoalMinutes: DEFAULT_DAILY_FOCUS_GOAL_MINUTES,
  updatedAt: 0,
  version: FOCUS_PREFERENCES_SCHEMA_VERSION,
});

function normalizedSession(session: FocusSession): FocusSession {
  return {
    ...session,
    plannedMinutes: Math.max(0, session.plannedMinutes ?? 0),
    elapsedMs: Math.max(0, session.elapsedMs ?? 0),
    interruptionCount: Math.max(0, session.interruptionCount ?? 0),
    segments: Array.isArray(session.segments) ? session.segments : [],
    version: FOCUS_SESSION_SCHEMA_VERSION,
  };
}

export function FocusSessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { tasks, updateTask } = useTaskStore();
  const uid = user?.id ?? null;
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [preferences, setPreferences] = useState<FocusPreferences>(defaultPreferences);
  const [legacySummary, setLegacySummary] = useState<LegacyFocusSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metricNow, setMetricNow] = useState(Date.now());
  const sessionsRef = useRef<FocusSession[]>([]);
  const legacyRef = useRef<LegacyFocusSummary | null>(null);
  const uidRef = useRef<string | null>(null);

  const replaceSessions = (next: FocusSession[]) => {
    const sorted = [...next].sort((left, right) => right.startedAt - left.startedAt);
    sessionsRef.current = sorted;
    setSessions(sorted);
  };

  const persistSessions = (ownerUid: string, next: FocusSession[]) => {
    replaceSessions(next);
    void Storage.setForUser(KEYS.FOCUS_SESSIONS, ownerUid, next);
  };

  const replaceLegacySummary = (summary: LegacyFocusSummary | null) => {
    legacyRef.current = summary;
    setLegacySummary(summary);
  };

  const persistOne = (ownerUid: string, session: FocusSession) => {
    const next = sessionsRef.current.some(item => item.id === session.id)
      ? sessionsRef.current.map(item => item.id === session.id ? session : item)
      : [session, ...sessionsRef.current];
    persistSessions(ownerUid, next);
    void focusSessionRepository.set(ownerUid, session.id, session);
  };

  useEffect(() => {
    uidRef.current = uid;
    if (!uid) {
      replaceSessions([]);
      setPreferences(defaultPreferences());
      replaceLegacySummary(null);
      setIsLoading(false);
      return undefined;
    }

    let disposed = false;
    let unsubscribeSessions: (() => void) | undefined;
    let unsubscribePreferences: (() => void) | undefined;
    let unsubscribeLegacy: (() => void) | undefined;
    setIsLoading(true);

    void (async () => {
      const [localSessions, localPreferences, localLegacy, migrationVersion] = await Promise.all([
        Storage.getForUser<FocusSession[]>(KEYS.FOCUS_SESSIONS, uid),
        Storage.getForUser<FocusPreferences>(KEYS.FOCUS_PREFERENCES, uid),
        Storage.getForUser<LegacyFocusSummary>(KEYS.FOCUS_LEGACY_SUMMARY, uid),
        Storage.getForUser<number>(KEYS.FOCUS_MIGRATION_VERSION, uid),
      ]);
      if (disposed || uidRef.current !== uid) return;
      replaceSessions((localSessions ?? []).map(normalizedSession));
      setPreferences(localPreferences ?? defaultPreferences());
      replaceLegacySummary(localLegacy ?? null);
      setIsLoading(false);

      if ((migrationVersion ?? 0) < FOCUS_MIGRATION_VERSION) {
        const cachedLegacyCount = await Storage.getForUser<number>(KEYS.SESSIONS, uid) ?? 0;
        if (cachedLegacyCount > 0) {
          const summary: LegacyFocusSummary = {
            completedSessionCount: cachedLegacyCount,
            importedAt: Date.now(),
            source: 'legacy-session-counter',
            version: 1,
          };
          replaceLegacySummary(summary);
          await Storage.setForUser(KEYS.FOCUS_LEGACY_SUMMARY, uid, summary);
          await legacyRepository.set(uid, summary);
        }
        await Storage.setForUser(
          KEYS.FOCUS_MIGRATION_VERSION,
          uid,
          FOCUS_MIGRATION_VERSION,
        );
      }

      void oldStatsRepository.read(uid).then(async oldCloudStats => {
        if (!oldCloudStats || disposed || uidRef.current !== uid) return;
        await recordCloudSnapshot(uid, oldStatsPath(uid), oldCloudStats);
        const cloudCount = oldCloudStats.sessions;
        if (typeof cloudCount !== 'number' || cloudCount <= 0) return;
        if ((legacyRef.current?.completedSessionCount ?? 0) >= cloudCount) return;
        const summary: LegacyFocusSummary = {
          completedSessionCount: cloudCount,
          importedAt: Date.now(),
          source: 'legacy-session-counter',
          version: 1,
        };
        replaceLegacySummary(summary);
        void Storage.setForUser(KEYS.FOCUS_LEGACY_SUMMARY, uid, summary);
        void legacyRepository.set(uid, summary);
      }).catch(() => undefined);

      unsubscribeSessions = focusSessionRepository.subscribe(uid, async documents => {
        if (disposed || uidRef.current !== uid) return;
        const pending = await getPendingMutationPaths(uid);
        await Promise.all(documents.map(item =>
          recordCloudSnapshot(uid, sessionPath(uid, item.id), item.raw)
        ));
        const remote = documents
          .map(item => normalizedSession(withoutSyncMetadata<FocusSession>(item.data)))
          .filter(item => !pending.has(sessionPath(uid, item.id).join('/')));
        const merged = new Map(remote.map(item => [item.id, item]));
        for (const local of sessionsRef.current) {
          const path = sessionPath(uid, local.id).join('/');
          const cloud = merged.get(local.id);
          const rawCloud = documents.find(item => item.id === local.id)?.raw;
          const keepLocal = pending.has(path)
            || !cloud
            || syncRevision(rawCloud) === 0 && local.updatedAt > cloud.updatedAt;
          if (keepLocal) {
            merged.set(local.id, local);
            if (!pending.has(path)) {
              void focusSessionRepository.set(uid, local.id, local);
            }
          }
        }
        persistSessions(uid, [...merged.values()]);
      }, error => {
        void reportSyncDiagnostic(uid, {
          path: `users/${uid}/focusSessions`,
          severity: 'error',
          code: 'firestore/focus-listen-failed',
          message: error.message || 'Focus history could not refresh from the cloud.',
        });
      });

      unsubscribePreferences = preferenceRepository.subscribe(uid, async (data, raw) => {
        if (disposed || uidRef.current !== uid) return;
        const path = preferencePath(uid);
        await recordCloudSnapshot(uid, path, raw);
        const pending = await getPendingMutationPaths(uid);
        if (pending.has(path.join('/'))) return;
        const remote = withoutSyncMetadata<FocusPreferences>(data);
        const resolved = {
          ...defaultPreferences(),
          ...remote,
          dailyGoalMinutes: Math.max(15, remote.dailyGoalMinutes),
          version: FOCUS_PREFERENCES_SCHEMA_VERSION,
        };
        setPreferences(resolved);
        void Storage.setForUser(KEYS.FOCUS_PREFERENCES, uid, resolved);
      }, error => {
        void reportSyncDiagnostic(uid, {
          path: preferencePath(uid).join('/'),
          severity: 'warning',
          code: 'firestore/focus-preferences-listen-failed',
          message: error.message || 'Focus preferences could not refresh.',
        });
      });

      unsubscribeLegacy = legacyRepository.subscribe(uid, async (data, raw) => {
        if (disposed || uidRef.current !== uid) return;
        await recordCloudSnapshot(uid, legacyPath(uid), raw);
        const remote = withoutSyncMetadata<LegacyFocusSummary>(data);
        const resolved = !legacyRef.current
          || remote.completedSessionCount > legacyRef.current.completedSessionCount
          ? remote
          : legacyRef.current;
        replaceLegacySummary(resolved);
        void Storage.setForUser(KEYS.FOCUS_LEGACY_SUMMARY, uid, resolved);
      }, error => {
        void reportSyncDiagnostic(uid, {
          path: legacyPath(uid).join('/'),
          severity: 'warning',
          code: 'firestore/focus-legacy-listen-failed',
          message: error.message || 'Legacy Focus totals could not refresh.',
        });
      });
    })();

    return () => {
      disposed = true;
      unsubscribeSessions?.();
      unsubscribePreferences?.();
      unsubscribeLegacy?.();
    };
  }, [uid]);

  const activePomodoro = sessions.find(session => (
    session.kind === 'pomodoro'
    && (session.status === 'active' || session.status === 'paused')
  )) ?? null;
  const activeStopwatch = sessions.find(session => (
    session.kind === 'stopwatch'
    && (session.status === 'active' || session.status === 'paused')
  )) ?? null;

  useEffect(() => {
    if (!activePomodoro && !activeStopwatch) return undefined;
    const timer = setInterval(() => setMetricNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [activePomodoro?.id, activeStopwatch?.id]);

  const metrics = useMemo(
    () => calculateFocusMetrics(sessions, preferences, legacySummary, metricNow),
    [legacySummary, metricNow, preferences, sessions],
  );

  const startSession = (input: StartFocusSessionInput, now = Date.now()): FocusSession => {
    if (!uidRef.current) throw new Error('Sign in before starting a Focus session.');
    const ownerUid = uidRef.current;
    const replaced = sessionsRef.current.map(session => (
      session.kind === input.kind
      && (session.status === 'active' || session.status === 'paused')
        ? finishFocusSession(session, false, now)
        : session
    ));
    replaced
      .filter((session, index) => session !== sessionsRef.current[index])
      .forEach(session => {
        void focusSessionRepository.set(ownerUid, session.id, session);
      });
    const created = createFocusSession(input, now);
    persistSessions(ownerUid, [created, ...replaced]);
    void focusSessionRepository.set(ownerUid, created.id, created);
    return created;
  };

  const mutateSession = (
    id: string,
    mutation: (session: FocusSession) => FocusSession,
  ): FocusSession | null => {
    const ownerUid = uidRef.current;
    const existing = sessionsRef.current.find(session => session.id === id);
    if (!ownerUid || !existing) return null;
    const updated = mutation(existing);
    if (updated === existing) return existing;
    persistOne(ownerUid, updated);
    return updated;
  };

  const finalizeSession = (
    id: string,
    completed: boolean,
    now = Date.now(),
  ): FocusSession | null => {
    const ownerUid = uidRef.current;
    const existing = sessionsRef.current.find(session => session.id === id);
    if (!ownerUid || !existing) return null;
    const updated = finishFocusSession(existing, completed, now);
    if (updated === existing) return existing;
    persistOne(ownerUid, updated);
    if (updated.taskId && updated.elapsedMs > 0) {
      const task = tasks.find(item => item.id === updated.taskId);
      if (task) {
        const minutes = Math.round((updated.elapsedMs / 60_000) * 10) / 10;
        void updateTask({
          ...task,
          actualFocusMinutes: Math.round(
            ((task.actualFocusMinutes ?? 0) + minutes) * 10,
          ) / 10,
        });
      }
    }
    return updated;
  };

  useEffect(() => {
    if (!activePomodoro || activePomodoro.status !== 'active') return;
    const expectedEndAt = focusSessionExpectedEndAt(activePomodoro);
    if (expectedEndAt !== null && expectedEndAt <= metricNow) {
      finalizeSession(activePomodoro.id, true, expectedEndAt);
    }
  }, [activePomodoro?.id, activePomodoro?.status, activePomodoro?.updatedAt, metricNow]);

  const value = useMemo<FocusSessionContextValue>(() => ({
    sessions,
    preferences,
    legacySummary,
    metrics,
    activePomodoro,
    activeStopwatch,
    isLoading,
    startSession,
    pauseSession: (id, now = Date.now()) =>
      mutateSession(id, session => pauseFocusSession(session, now)),
    resumeSession: (id, now = Date.now()) =>
      mutateSession(id, session => resumeFocusSession(session, now)),
    finishSession: finalizeSession,
    updateSessionLinks: (id, links) =>
      mutateSession(id, session => ({
        ...session,
        ...links,
        updatedAt: Date.now(),
      })),
    setDailyGoalMinutes: minutes => {
      const ownerUid = uidRef.current;
      if (!ownerUid) return;
      const next: FocusPreferences = {
        dailyGoalMinutes: Math.max(15, Math.min(12 * 60, Math.round(minutes))),
        updatedAt: Date.now(),
        version: FOCUS_PREFERENCES_SCHEMA_VERSION,
      };
      setPreferences(next);
      void Storage.setForUser(KEYS.FOCUS_PREFERENCES, ownerUid, next);
      void preferenceRepository.set(ownerUid, next);
    },
  }), [
    activePomodoro,
    activeStopwatch,
    isLoading,
    legacySummary,
    metrics,
    preferences,
    sessions,
    tasks,
    updateTask,
  ]);

  return <FocusSessionContext.Provider value={value}>{children}</FocusSessionContext.Provider>;
}

export { useFocusSessions } from '@/context/FocusSessionContext';
