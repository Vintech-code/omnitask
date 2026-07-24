jest.mock('@/config/firebase', () => ({ auth: {}, db: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(() => jest.fn()) }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
}));
jest.mock('@/services/OfflineSyncService', () => ({
  getPendingDeletePaths: jest.fn(async () => new Set()),
  queueCloudDelete: jest.fn(async () => undefined),
  queueCloudSet: jest.fn(async () => undefined),
}));
jest.mock('@/services/TaskNotificationService', () => ({
  cancelTaskNotifications: jest.fn(async () => undefined),
  scheduleTaskNotifications: jest.fn(async () => []),
}));
jest.mock('@/services/AttachmentService', () => ({
  deleteAttachment: jest.fn(async () => undefined),
  migrateLegacyNoteAttachments: jest.fn(async (_uid: string, notes: unknown[]) => ({ notes, changedIds: [] })),
}));

import { migrateChecklistItems } from '@/context/TaskStore';
import type { Note } from '@/types/note';

const note: Note = {
  id: 'note-1',
  title: 'Launch checklist',
  body: '',
  date: 'Today',
  timestamp: 100,
  createdAt: 50,
  updatedAt: 100,
  category: 'Work',
  cardColor: '#fff',
  tags: [],
  todos: [
    { id: 'todo-1', text: 'Publish update', done: false, createdAt: 60 },
    { id: 'todo-2', text: 'Notify team', done: true, completedAt: 90, createdAt: 70 },
  ],
};

describe('Unified Task checklist migration', () => {
  it('preserves every checklist item while creating linked, versioned Tasks', () => {
    const result = migrateChecklistItems([note], [], 200);

    expect(result.notes[0].todos).toHaveLength(2);
    expect(result.tasks).toHaveLength(2);
    expect(result.notes[0].todos?.every(item => Boolean(item.linkedTaskId))).toBe(true);
    expect(result.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: 'Publish update',
        status: 'inbox',
        noteId: 'note-1',
        checklistItemId: 'todo-1',
        version: 1,
      }),
      expect.objectContaining({
        title: 'Notify team',
        status: 'completed',
        noteId: 'note-1',
        checklistItemId: 'todo-2',
        version: 1,
      }),
    ]));
  });

  it('is deterministic and does not duplicate Tasks when rerun', () => {
    const first = migrateChecklistItems([note], [], 200);
    const second = migrateChecklistItems(first.notes, first.tasks, 300);

    expect(second.tasks).toHaveLength(first.tasks.length);
    expect(second.tasks.map(task => task.id).sort()).toEqual(first.tasks.map(task => task.id).sort());
    expect(second.changedTaskIds).toEqual([]);
  });
});
