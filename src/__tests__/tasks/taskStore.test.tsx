import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

const mockQueueCloudSet = jest.fn(async (..._args: unknown[]) => undefined);
const mockQueueCloudDelete = jest.fn(async (..._args: unknown[]) => undefined);
const mockStorageSetForUser = jest.fn(async (..._args: unknown[]) => undefined);
const mockScheduleTaskNotifications = jest.fn(async (..._args: unknown[]) => []);
const mockCancelTaskNotifications = jest.fn(async (..._args: unknown[]) => undefined);

jest.mock('@/config/firebase', () => ({ auth: {}, db: {} }));
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isLoading: false }),
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(async () => ({ exists: () => false, data: () => undefined })),
  onSnapshot: jest.fn(() => jest.fn()),
}));
jest.mock('@/services/OfflineSyncService', () => ({
  getPendingMutationPaths: jest.fn(async () => new Set()),
  queueCloudSet: (uid: string, path: string[], data: unknown) => mockQueueCloudSet(uid, path, data),
  queueCloudDelete: (uid: string, path: string[]) => mockQueueCloudDelete(uid, path),
  recordCloudSnapshot: jest.fn(async () => undefined),
  reportSyncDiagnostic: jest.fn(async () => undefined),
  syncRevision: jest.fn(() => 0),
  withoutSyncMetadata: jest.fn((data: unknown) => data),
}));
jest.mock('@/services/StorageService', () => ({
  KEYS: {
    TASKS: 'notes',
    UNIFIED_TASKS: 'tasks',
    TASK_CATEGORIES: 'categories',
    TASK_MIGRATION_VERSION: 'task-migration',
  },
  Storage: {
    getForUser: jest.fn(async () => null),
    setForUser: (key: string, uid: string, value: unknown) => mockStorageSetForUser(key, uid, value),
  },
}));
jest.mock('@/services/TaskNotificationService', () => ({
  scheduleTaskNotifications: (task: unknown) => mockScheduleTaskNotifications(task),
  cancelTaskNotifications: (taskId: string) => mockCancelTaskNotifications(taskId),
}));
jest.mock('@/services/AttachmentService', () => ({
  deleteAttachment: jest.fn(async () => undefined),
  migrateLegacyNoteAttachments: jest.fn(async (_uid: string, notes: unknown[]) => ({ notes, changedIds: [] })),
}));

import {
  TaskProvider,
  useTaskStore,
  type TaskContextType,
} from '@/context/TaskStore';

let currentStore: TaskContextType | null = null;

function StoreProbe() {
  const store = useTaskStore();
  currentStore = store;
  return <Text>{store.isLoading ? 'loading' : `${store.tasks.length} tasks`}</Text>;
}

describe('TaskStore offline operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentStore = null;
  });

  it('creates locally first, completes, reopens, and deletes the same UID-scoped Task', async () => {
    const screen = await render(<TaskProvider><StoreProbe /></TaskProvider>);
    await waitFor(() => expect(screen.getByText('0 tasks')).toBeTruthy());

    await act(async () => {
      await currentStore!.createTask({
        title: 'Offline task',
        status: 'inbox',
        priority: 'medium',
        recurrence: { frequency: 'none', interval: 1 },
        reminderMinutes: [],
      });
    });
    const taskId = currentStore!.tasks[0].id;
    expect(currentStore!.tasks[0]).toMatchObject({ title: 'Offline task', status: 'inbox', version: 1 });
    expect(mockStorageSetForUser).toHaveBeenCalledWith('tasks', 'user-1', expect.arrayContaining([
      expect.objectContaining({ id: taskId }),
    ]));
    expect(mockQueueCloudSet).toHaveBeenCalledWith(
      'user-1',
      ['users', 'user-1', 'tasks', taskId],
      expect.objectContaining({ title: 'Offline task' }),
    );

    await act(async () => currentStore!.setTaskStatus(taskId, 'completed'));
    expect(currentStore!.tasks[0].status).toBe('completed');

    await act(async () => currentStore!.setTaskStatus(taskId, 'inbox'));
    expect(currentStore!.tasks[0].status).toBe('inbox');

    await act(async () => currentStore!.removeTask(taskId));
    expect(currentStore!.tasks).toEqual([]);
    expect(mockCancelTaskNotifications).toHaveBeenCalledWith(taskId);
    expect(mockQueueCloudDelete).toHaveBeenCalledWith('user-1', ['users', 'user-1', 'tasks', taskId]);
  });
});
