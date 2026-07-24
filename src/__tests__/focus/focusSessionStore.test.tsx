import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

const mockLocal = new Map<string, unknown>([['sessions:user-1', 5]]);
const mockQueueCloudSet = jest.fn(async (..._args: unknown[]) => undefined);
const mockUpdateTask = jest.fn(async (..._args: unknown[]) => undefined);

jest.mock('@/config/firebase', () => ({ db: {} }));
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/context/TaskStore', () => ({
  useTaskStore: () => ({
    tasks: [{
      id: 'task-1',
      title: 'Focused task',
      actualFocusMinutes: 0,
      status: 'in-progress',
    }],
    updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  }),
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, ...segments: string[]) => ({ path: segments.join('/') })),
  doc: jest.fn((_db, path: string) => ({ path })),
  getDoc: jest.fn(async (reference: { path: string }) => ({
    exists: () => reference.path.endsWith('/focusStats'),
    data: () => reference.path.endsWith('/focusStats') ? { sessions: 7 } : undefined,
  })),
  onSnapshot: jest.fn((
    reference: { path: string },
    onNext: (snapshot: {
      exists: () => boolean;
      data: () => undefined;
      docs: [];
    }) => void,
  ) => {
    queueMicrotask(() => onNext({
      exists: () => false,
      data: () => undefined,
      docs: [],
    }));
    return jest.fn();
  }),
}));
jest.mock('@/services/StorageService', () => ({
  KEYS: {
    FOCUS_SESSIONS: 'focus-sessions',
    FOCUS_PREFERENCES: 'focus-preferences',
    FOCUS_LEGACY_SUMMARY: 'focus-legacy',
    FOCUS_MIGRATION_VERSION: 'focus-migration',
    SESSIONS: 'sessions',
  },
  Storage: {
    getForUser: jest.fn(async (key: string, uid: string) => mockLocal.get(`${key}:${uid}`) ?? null),
    setForUser: jest.fn(async (key: string, uid: string, value: unknown) => {
      mockLocal.set(`${key}:${uid}`, value);
    }),
  },
}));
jest.mock('@/services/OfflineSyncService', () => ({
  getPendingMutationPaths: jest.fn(async () => new Set()),
  queueCloudSet: (...args: unknown[]) => mockQueueCloudSet(...args),
  recordCloudSnapshot: jest.fn(async () => undefined),
  reportSyncDiagnostic: jest.fn(async () => undefined),
  syncRevision: jest.fn(() => 0),
  withoutSyncMetadata: jest.fn((data: unknown) => data),
}));

import { FocusSessionProvider, useFocusSessions } from '@/context/FocusSessionStore';
import type { FocusSessionContextValue } from '@/context/FocusSessionContext';

let currentFocus: FocusSessionContextValue | null = null;
function Probe() {
  const focus = useFocusSessions();
  currentFocus = focus;
  return (
    <Text>
      {focus.isLoading
        ? 'loading'
        : `${focus.sessions.length}:${focus.legacySummary?.completedSessionCount ?? 0}`}
    </Text>
  );
}

describe('FocusSessionStore migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentFocus = null;
    mockLocal.clear();
    mockLocal.set('sessions:user-1', 5);
  });

  it('migrates the highest legacy count without creating fake session records', async () => {
    const screen = await render(<FocusSessionProvider><Probe /></FocusSessionProvider>);

    await waitFor(() => expect(screen.getByText('0:7')).toBeTruthy());
    expect(mockLocal.get('focus-sessions:user-1')).toEqual([]);
    expect(mockLocal.get('focus-legacy:user-1')).toMatchObject({
      completedSessionCount: 7,
      source: 'legacy-session-counter',
    });
    expect(mockQueueCloudSet).toHaveBeenCalledWith(
      'user-1',
      ['users', 'user-1', 'meta', 'focusLegacySummary'],
      expect.objectContaining({ completedSessionCount: 7 }),
    );
  });

  it('auto-completes an elapsed background timer and applies its actual task minutes once', async () => {
    const screen = await render(<FocusSessionProvider><Probe /></FocusSessionProvider>);
    await waitFor(() => expect(screen.getByText('0:7')).toBeTruthy());
    const startedAt = Date.now() - 2 * 60_000;

    await act(async () => {
      currentFocus!.startSession({
        kind: 'pomodoro',
        plannedMinutes: 1,
        taskId: 'task-1',
      }, startedAt);
    });

    await waitFor(() => expect(currentFocus!.sessions[0]).toMatchObject({
      status: 'completed',
      completed: true,
      elapsedMs: 60_000,
    }));
    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockUpdateTask).toHaveBeenCalledWith(expect.objectContaining({
      id: 'task-1',
      actualFocusMinutes: 1,
    }));
  });

  it('persists a user-selected daily goal locally first and queues it for sync', async () => {
    const screen = await render(<FocusSessionProvider><Probe /></FocusSessionProvider>);
    await waitFor(() => expect(screen.getByText('0:7')).toBeTruthy());

    await act(async () => {
      currentFocus!.setDailyGoalMinutes(90);
    });

    expect(currentFocus!.preferences.dailyGoalMinutes).toBe(90);
    expect(mockLocal.get('focus-preferences:user-1')).toMatchObject({
      dailyGoalMinutes: 90,
      version: 1,
    });
    expect(mockQueueCloudSet).toHaveBeenCalledWith(
      'user-1',
      ['users', 'user-1', 'meta', 'focusPreferences'],
      expect.objectContaining({ dailyGoalMinutes: 90 }),
    );
  });
});
