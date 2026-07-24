import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  getPendingMutationPaths,
  queueCloudSet,
  recordCloudSnapshot,
  reportSyncDiagnostic,
  syncRevision,
  withoutSyncMetadata,
} from '@/services/OfflineSyncService';
import { KEYS, Storage } from '@/services/StorageService';
import { cancelTaskNotifications, scheduleTaskNotifications } from '@/services/TaskNotificationService';
import { deleteAttachment, migrateLegacyNoteAttachments } from '@/services/AttachmentService';
import { NOTE_SCHEMA_VERSION, type ChecklistItem, type Note, type NoteTag } from '@/types/note';
import {
  nextTaskDueAt,
  TASK_SCHEMA_VERSION,
  type Task,
  type TaskDraft,
  type TaskStatus,
} from '@/types/task';
import { createUserCollectionRepository } from '@/repositories';
import { migrateVersionedRecords } from '@/services/SchemaMigrationService';

export type { ChecklistItem, Note, NoteTag, Task, TaskDraft, TaskStatus };

const DEFAULT_CATEGORIES = ['Personal', 'Work', 'School', 'Health', 'Finance'];
const NO_RECURRENCE = { frequency: 'none' as const, interval: 1 };

export interface TaskContextType {
  notes: Note[];
  tasks: Task[];
  categories: string[];
  isLoading: boolean;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  removeNote: (id: string) => void;
  addCategory: (category: string) => void;
  renameCategory: (from: string, to: string) => void;
  removeCategory: (category: string) => void;
  createTask: (draft: TaskDraft) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task>;
  removeTask: (id: string) => Promise<void>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  promoteChecklistItem: (noteId: string, itemId: string) => Promise<Task | null>;
  linkChecklistItem: (taskId: string, noteId: string, itemId: string) => Promise<void>;
  unlinkChecklistItem: (noteId: string, itemId: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType>({
  notes: [],
  tasks: [],
  categories: DEFAULT_CATEGORIES,
  isLoading: true,
  addNote: () => undefined,
  updateNote: () => undefined,
  removeNote: () => undefined,
  addCategory: () => undefined,
  renameCategory: () => undefined,
  removeCategory: () => undefined,
  createTask: async draft => normalizeTaskDraft(draft),
  updateTask: async task => task,
  removeTask: async () => undefined,
  setTaskStatus: async () => undefined,
  promoteChecklistItem: async () => null,
  linkChecklistItem: async () => undefined,
  unlinkChecklistItem: async () => undefined,
});

const noteRepository = createUserCollectionRepository<Note>('notes');
const taskRepository = createUserCollectionRepository<Task>('tasks');
const notePath = noteRepository.path;
const taskPath = taskRepository.path;
const metaPath = (uid: string) => ['users', uid, 'meta', 'taskMeta'];
const modifiedNote = (note: Note) => note.updatedAt ?? note.timestamp ?? 0;
const clean = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
const migrateNotes = (notes: Note[]) => migrateVersionedRecords(
  notes,
  NOTE_SCHEMA_VERSION,
  note => ({
    ...note,
    tags: Array.isArray(note.tags) ? note.tags : [],
    body: note.body ?? '',
    title: note.title ?? '',
    category: note.category ?? 'Personal',
  }),
);

function idFor(prefix = 'task') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function stableChecklistTaskId(noteId: string, itemId: string): string {
  let hash = 2166136261;
  for (const character of `${noteId}:${itemId}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `checklist_${(hash >>> 0).toString(36)}_${itemId.replace(/[^a-z0-9_-]/gi, '').slice(-18) || 'item'}`;
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    title: task.title.trim() || 'Untitled task',
    status: task.status ?? 'inbox',
    priority: task.priority ?? 'medium',
    recurrence: {
      frequency: task.recurrence?.frequency ?? 'none',
      interval: Math.max(1, task.recurrence?.interval ?? 1),
    },
    reminderMinutes: [...new Set(task.reminderMinutes ?? [])].filter(value => value >= 0).sort((a, b) => a - b),
    reminderIds: task.reminderIds ?? [],
    actualFocusMinutes: task.actualFocusMinutes ?? 0,
    version: TASK_SCHEMA_VERSION,
  };
}

function normalizeTaskDraft(draft: TaskDraft, now = Date.now()): Task {
  return normalizeTask({
    ...draft,
    id: draft.id ?? idFor(),
    title: draft.title,
    recurrence: draft.recurrence ?? NO_RECURRENCE,
    reminderMinutes: draft.reminderMinutes ?? [],
    reminderIds: [],
    createdAt: now,
    updatedAt: now,
    version: TASK_SCHEMA_VERSION,
  });
}

export interface ChecklistMigrationResult {
  notes: Note[];
  tasks: Task[];
  changedNoteIds: string[];
  changedTaskIds: string[];
}

/** Idempotently gives every active checklist item a real Task without removing the checklist. */
export function migrateChecklistItems(
  notes: Note[],
  tasks: Task[],
  now = Date.now(),
): ChecklistMigrationResult {
  const taskMap = new Map(tasks.map(task => [task.id, normalizeTask(task)]));
  const changedNoteIds = new Set<string>();
  const changedTaskIds = new Set<string>();

  const migratedNotes = notes.map(note => {
    if (note.archived || !note.todos?.length) return note;
    let noteChanged = false;
    const todos = note.todos.map(item => {
      const matching = item.linkedTaskId
        ? taskMap.get(item.linkedTaskId)
        : [...taskMap.values()].find(task => task.noteId === note.id && task.checklistItemId === item.id);
      const taskId = matching?.id ?? item.linkedTaskId ?? stableChecklistTaskId(note.id, item.id);
      let task = matching ?? taskMap.get(taskId);
      if (!task) {
        task = normalizeTask({
          id: taskId,
          title: item.text.trim() || 'Untitled task',
          description: note.title.trim() ? `From checklist: ${note.title.trim()}` : undefined,
          status: item.done ? 'completed' : 'inbox',
          priority: 'medium',
          recurrence: NO_RECURRENCE,
          reminderMinutes: [],
          reminderIds: [],
          projectId: note.category || undefined,
          noteId: note.id,
          checklistItemId: item.id,
          completedAt: item.completedAt,
          createdAt: item.createdAt ?? note.createdAt ?? note.timestamp ?? now,
          updatedAt: modifiedNote(note) || now,
          version: TASK_SCHEMA_VERSION,
        });
        taskMap.set(taskId, task);
        changedTaskIds.add(taskId);
      }

      let nextItem = item;
      if (item.linkedTaskId !== taskId) {
        nextItem = { ...nextItem, linkedTaskId: taskId };
        noteChanged = true;
      }

      const noteIsNewer = modifiedNote(note) > task.updatedAt;
      if (noteIsNewer && (task.title !== item.text || (task.status === 'completed') !== item.done)) {
        taskMap.set(taskId, normalizeTask({
          ...task,
          title: item.text.trim() || task.title,
          status: item.done ? 'completed' : task.status === 'completed' ? 'inbox' : task.status,
          completedAt: item.done ? item.completedAt ?? now : undefined,
          updatedAt: modifiedNote(note),
        }));
        changedTaskIds.add(taskId);
      } else if (!noteIsNewer && (item.text !== task.title || item.done !== (task.status === 'completed'))) {
        nextItem = {
          ...nextItem,
          text: task.title,
          done: task.status === 'completed',
          completedAt: task.status === 'completed' ? task.completedAt ?? task.updatedAt : undefined,
        };
        noteChanged = true;
      }
      return nextItem;
    });
    if (!noteChanged) return note;
    changedNoteIds.add(note.id);
    return { ...note, todos, updatedAt: Math.max(modifiedNote(note), now) };
  });

  return {
    notes: migratedNotes,
    tasks: [...taskMap.values()].sort((a, b) => b.updatedAt - a.updatedAt),
    changedNoteIds: [...changedNoteIds],
    changedTaskIds: [...changedTaskIds],
  };
}

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const authenticatedUid = user?.id ?? null;
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const notesRef = useRef<Note[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const categoriesRef = useRef(DEFAULT_CATEGORIES);
  const uidRef = useRef<string | null>(null);
  const migrationDoneRef = useRef(false);
  const unsubNotesRef = useRef<(() => void) | null>(null);
  const unsubTasksRef = useRef<(() => void) | null>(null);

  const persistNotes = (updated: Note[]) => {
    notesRef.current = updated;
    setNotes(updated);
    if (uidRef.current) void Storage.setForUser(KEYS.TASKS, uidRef.current, updated);
  };

  const persistTasks = (updated: Task[]) => {
    const sorted = [...updated].map(normalizeTask).sort((a, b) => b.updatedAt - a.updatedAt);
    tasksRef.current = sorted;
    setTasks(sorted);
    if (uidRef.current) void Storage.setForUser(KEYS.UNIFIED_TASKS, uidRef.current, sorted);
  };

  const uploadNote = (uid: string, note: Note) => {
    void noteRepository.set(uid, note.id, clean(note as unknown as Record<string, unknown>));
  };

  const uploadTask = (uid: string, task: Task) => {
    void taskRepository.set(uid, task.id, clean(task as unknown as Record<string, unknown>));
  };

  const applyMigration = (uid: string, sourceNotes: Note[], sourceTasks: Task[]) => {
    const result = migrateChecklistItems(sourceNotes, sourceTasks);
    persistNotes(result.notes);
    persistTasks(result.tasks);
    result.changedNoteIds.forEach(id => {
      const note = result.notes.find(item => item.id === id);
      if (note) uploadNote(uid, note);
    });
    result.changedTaskIds.forEach(id => {
      const task = result.tasks.find(item => item.id === id);
      if (task) uploadTask(uid, task);
    });
  };

  const persistCategories = (updated: string[], upload = true) => {
    categoriesRef.current = updated;
    setCategories(updated);
    const uid = uidRef.current;
    if (!uid) return;
    void Storage.setForUser(KEYS.TASK_CATEGORIES, uid, updated);
    if (upload) void queueCloudSet(uid, metaPath(uid), { categories: updated, updatedAt: Date.now() });
  };

  useEffect(() => {
    let disposed = false;
      unsubNotesRef.current?.();
      unsubTasksRef.current?.();
      unsubNotesRef.current = null;
      unsubTasksRef.current = null;
      if (authLoading) return () => { disposed = true; };
      if (!authenticatedUid) {
        uidRef.current = null;
        migrationDoneRef.current = false;
        persistNotes([]);
        persistTasks([]);
        categoriesRef.current = DEFAULT_CATEGORIES;
        setCategories(DEFAULT_CATEGORIES);
        setIsLoading(false);
        return () => { disposed = true; };
      }

      const uid = authenticatedUid;
      uidRef.current = uid;
      setIsLoading(true);
      void (async () => {
      const [localNotes, localTasks, localCategories, localMigrationVersion] = await Promise.all([
        Storage.getForUser<Note[]>(KEYS.TASKS, uid),
        Storage.getForUser<Task[]>(KEYS.UNIFIED_TASKS, uid),
        Storage.getForUser<string[]>(KEYS.TASK_CATEGORIES, uid),
        Storage.getForUser<number>(KEYS.TASK_MIGRATION_VERSION, uid),
      ]);
      if (disposed || uidRef.current !== uid) return;
      const localAttachmentMigration = await migrateLegacyNoteAttachments(uid, localNotes ?? []);
      const localSchemaMigration = migrateNotes(localAttachmentMigration.notes);
      const preparedLocalNotes = localSchemaMigration.records;
      localSchemaMigration.changedIds.forEach(id => {
        const note = preparedLocalNotes.find(item => item.id === id);
        if (note) uploadNote(uid, note);
      });
      localAttachmentMigration.changedIds.forEach(id => {
        const note = preparedLocalNotes.find(item => item.id === id);
        if (note) uploadNote(uid, note);
      });
      void Storage.setForUser(KEYS.ATTACHMENT_MIGRATION_VERSION, uid, 1);
      persistCategories(localCategories ?? DEFAULT_CATEGORIES, false);
      migrationDoneRef.current = (localMigrationVersion ?? 0) >= TASK_SCHEMA_VERSION;
      if (!migrationDoneRef.current && preparedLocalNotes.length > 0) {
        applyMigration(uid, preparedLocalNotes, localTasks ?? []);
      } else {
        persistNotes(preparedLocalNotes);
        persistTasks(localTasks ?? []);
      }
      setIsLoading(false);

      void taskRepository.readMeta(uid, 'taskMeta').then(data => {
        if (data) void recordCloudSnapshot(uid, metaPath(uid), data);
        const cloudCategories = data?.categories;
        if (uidRef.current === uid && Array.isArray(cloudCategories)) {
          persistCategories([...new Set([...categoriesRef.current, ...cloudCategories])], false);
        }
      }).catch(() => undefined);

      unsubNotesRef.current = noteRepository.subscribe(uid, async documents => {
        if (uidRef.current !== uid) return;
        const pendingPaths = await getPendingMutationPaths(uid);
        await Promise.all(documents.map(item =>
          recordCloudSnapshot(uid, notePath(uid, item.id), item.raw)
        ));
        const cloud = documents
          .map(item => withoutSyncMetadata<Note>(item.data))
          .filter(item => !pendingPaths.has(notePath(uid, item.id).join('/')));
        const merged = new Map(cloud.map(item => [item.id, item]));
        for (const local of notesRef.current) {
          const remote = merged.get(local.id);
          const path = notePath(uid, local.id).join('/');
          const rawRemote = documents.find(item => item.id === local.id)?.raw;
          const keepLocal = pendingPaths.has(path)
            || !remote
            || syncRevision(rawRemote) === 0 && modifiedNote(local) > modifiedNote(remote);
          if (keepLocal) {
            merged.set(local.id, local);
            if (!pendingPaths.has(path)) uploadNote(uid, local);
          }
        }
        const attachmentMigration = await migrateLegacyNoteAttachments(
          uid,
          [...merged.values()].sort((a, b) => b.timestamp - a.timestamp),
        );
        const schemaMigration = migrateNotes(attachmentMigration.notes);
        const mergedNotes = schemaMigration.records;
        schemaMigration.changedIds.forEach(id => {
          const note = mergedNotes.find(item => item.id === id);
          if (note) uploadNote(uid, note);
        });
        attachmentMigration.changedIds.forEach(id => {
          const note = mergedNotes.find(item => item.id === id);
          if (note) uploadNote(uid, note);
        });
        if (!migrationDoneRef.current) {
          applyMigration(uid, mergedNotes, tasksRef.current);
          migrationDoneRef.current = true;
          void Storage.setForUser(KEYS.TASK_MIGRATION_VERSION, uid, TASK_SCHEMA_VERSION);
        } else {
          persistNotes(mergedNotes);
        }
      }, error => {
        void reportSyncDiagnostic(uid, {
          path: `users/${uid}/notes`,
          severity: 'error',
          code: 'firestore/notes-listen-failed',
          message: error.message || 'Notes could not refresh from the cloud.',
        });
      });

      unsubTasksRef.current = taskRepository.subscribe(uid, async documents => {
        if (uidRef.current !== uid) return;
        const pendingPaths = await getPendingMutationPaths(uid);
        await Promise.all(documents.map(item =>
          recordCloudSnapshot(uid, taskPath(uid, item.id), item.raw)
        ));
        const cloud = documents
          .map(item => normalizeTask(withoutSyncMetadata<Task>(item.data)))
          .filter(item => !pendingPaths.has(taskPath(uid, item.id).join('/')));
        const merged = new Map(cloud.map(item => [item.id, item]));
        for (const local of tasksRef.current) {
          const remote = merged.get(local.id);
          const path = taskPath(uid, local.id).join('/');
          const rawRemote = documents.find(item => item.id === local.id)?.raw;
          const keepLocal = pendingPaths.has(path)
            || !remote
            || syncRevision(rawRemote) === 0 && local.updatedAt > remote.updatedAt;
          if (keepLocal) {
            merged.set(local.id, local);
            if (!pendingPaths.has(path)) uploadTask(uid, local);
          }
        }
        const mergedTasks = [...merged.values()];
        persistTasks(mergedTasks);
        mergedTasks.forEach(task => updateLinkedChecklist(task));
      }, error => {
        void reportSyncDiagnostic(uid, {
          path: `users/${uid}/tasks`,
          severity: 'error',
          code: 'firestore/tasks-listen-failed',
          message: error.message || 'Tasks could not refresh from the cloud.',
        });
      });
      })();
    return () => {
      disposed = true;
      unsubNotesRef.current?.();
      unsubTasksRef.current?.();
    };
  }, [authenticatedUid, authLoading]);

  const saveNote = (note: Note, isNew: boolean) => {
    const uid = uidRef.current;
    if (!uid) return;
    const updatedNote = { ...note, updatedAt: Date.now(), version: NOTE_SCHEMA_VERSION };
    const updated = isNew
      ? [updatedNote, ...notesRef.current]
      : notesRef.current.map(item => item.id === note.id ? updatedNote : item);
    persistNotes(updated);
    uploadNote(uid, updatedNote);
    for (const checklist of updatedNote.todos ?? []) {
      if (!checklist.linkedTaskId) continue;
      const linkedTask = tasksRef.current.find(task => task.id === checklist.linkedTaskId);
      if (!linkedTask || (
        linkedTask.title === checklist.text
        && (linkedTask.status === 'completed') === checklist.done
      )) continue;
      void updateTask({
        ...linkedTask,
        title: checklist.text.trim() || linkedTask.title,
        status: checklist.done
          ? 'completed'
          : linkedTask.status === 'completed'
            ? 'inbox'
            : linkedTask.status,
        completedAt: checklist.done ? checklist.completedAt ?? Date.now() : undefined,
      });
    }
  };

  const addNote = (note: Note) => saveNote(note, true);
  const updateNote = (note: Note) => saveNote(note, false);
  const removeNote = (id: string) => {
    const uid = uidRef.current;
    if (!uid) return;
    const note = notesRef.current.find(item => item.id === id);
    (note?.attachmentIds ?? []).forEach(attachmentId => void deleteAttachment(uid, attachmentId));
    persistNotes(notesRef.current.filter(note => note.id !== id));
    void noteRepository.remove(uid, id);
  };

  const updateLinkedChecklist = (task: Task) => {
    const uid = uidRef.current;
    if (!uid || !task.noteId || !task.checklistItemId) return;
    const note = notesRef.current.find(item => item.id === task.noteId);
    const checklist = note?.todos?.find(item => item.id === task.checklistItemId);
    if (!note || !checklist || (
      checklist.linkedTaskId === task.id
      && checklist.text === task.title
      && checklist.done === (task.status === 'completed')
    )) return;
    const updatedNote: Note = {
      ...note,
      updatedAt: task.updatedAt,
      todos: (note.todos ?? []).map(item => item.id === task.checklistItemId
        ? {
            ...item,
            linkedTaskId: task.id,
            text: task.title,
            done: task.status === 'completed',
            completedAt: task.status === 'completed' ? task.completedAt ?? task.updatedAt : undefined,
          }
        : item),
    };
    persistNotes(notesRef.current.map(item => item.id === note.id ? updatedNote : item));
    uploadNote(uid, updatedNote);
  };

  const persistAndUploadTask = (task: Task) => {
    const uid = uidRef.current;
    if (!uid) return;
    const exists = tasksRef.current.some(item => item.id === task.id);
    persistTasks(exists
      ? tasksRef.current.map(item => item.id === task.id ? task : item)
      : [task, ...tasksRef.current]);
    updateLinkedChecklist(task);
    uploadTask(uid, task);
  };

  const syncReminders = async (task: Task): Promise<Task> => {
    const identifiers = await scheduleTaskNotifications(task);
    if (identifiers.join('|') === task.reminderIds.join('|')) return task;
    const synced = { ...task, reminderIds: identifiers, updatedAt: Date.now() };
    persistAndUploadTask(synced);
    return synced;
  };

  const createTask = async (draft: TaskDraft): Promise<Task> => {
    const task = normalizeTaskDraft(draft);
    persistAndUploadTask(task);
    return syncReminders(task);
  };

  const updateTask = async (task: Task): Promise<Task> => {
    const updated = normalizeTask({ ...task, updatedAt: Date.now(), version: TASK_SCHEMA_VERSION });
    persistAndUploadTask(updated);
    return syncReminders(updated);
  };

  const removeTask = async (id: string) => {
    const uid = uidRef.current;
    if (!uid) return;
    await cancelTaskNotifications(id);
    const linkedNotes = notesRef.current.map(note => {
      if (!note.todos?.some(item => item.linkedTaskId === id)) return note;
      const todos = note.todos.map(item => {
        if (item.linkedTaskId !== id) return item;
        const { linkedTaskId: _linkedTaskId, ...unlinked } = item;
        return unlinked;
      });
      const updated = { ...note, todos, updatedAt: Date.now() };
      uploadNote(uid, updated);
      return updated;
    });
    persistNotes(linkedNotes);
    persistTasks(tasksRef.current.filter(task => task.id !== id));
    await taskRepository.remove(uid, id);
  };

  const setTaskStatus = async (id: string, status: TaskStatus) => {
    const task = tasksRef.current.find(item => item.id === id);
    if (!task) return;
    const now = Date.now();
    const nextDue = status === 'completed' ? nextTaskDueAt(task) : undefined;
    const updated: Task = nextDue
      ? { ...task, status: 'planned', dueAt: nextDue, completedAt: now, updatedAt: now }
      : {
          ...task,
          status,
          completedAt: status === 'completed' ? now : undefined,
          updatedAt: now,
        };
    persistAndUploadTask(updated);
    await syncReminders(updated);
  };

  const promoteChecklistItem = async (noteId: string, itemId: string): Promise<Task | null> => {
    const note = notesRef.current.find(item => item.id === noteId);
    const item = note?.todos?.find(todo => todo.id === itemId);
    if (!note || !item) return null;
    if (item.linkedTaskId) return tasksRef.current.find(task => task.id === item.linkedTaskId) ?? null;
    const now = Date.now();
    const task = normalizeTaskDraft({
      id: stableChecklistTaskId(noteId, itemId),
      title: item.text,
      description: note.title ? `From checklist: ${note.title}` : undefined,
      status: item.done ? 'completed' : 'inbox',
      priority: 'medium',
      recurrence: NO_RECURRENCE,
      reminderMinutes: [],
      projectId: note.category || undefined,
      noteId,
      checklistItemId: itemId,
      completedAt: item.completedAt,
    }, now);
    persistAndUploadTask(task);
    return task;
  };

  const linkChecklistItem = async (taskId: string, noteId: string, itemId: string) => {
    const uid = uidRef.current;
    const task = tasksRef.current.find(item => item.id === taskId);
    const targetNote = notesRef.current.find(item => item.id === noteId);
    if (!uid || !task || !targetNote?.todos?.some(item => item.id === itemId)) return;
    const previousNotes = notesRef.current;

    const notesWithPreviousLinkRemoved = previousNotes.map(note => {
      if (!note.todos?.some(item => item.linkedTaskId === taskId)) return note;
      return {
        ...note,
        todos: note.todos.map(item => {
          if (item.linkedTaskId !== taskId) return item;
          const { linkedTaskId: _linkedTaskId, ...unlinked } = item;
          return unlinked;
        }),
        updatedAt: Date.now(),
      };
    });
    const linkedNotes = notesWithPreviousLinkRemoved.map(note => note.id !== noteId ? note : {
      ...note,
      updatedAt: Date.now(),
      todos: (note.todos ?? []).map(item => item.id === itemId ? {
        ...item,
        linkedTaskId: taskId,
        text: task.title,
        done: task.status === 'completed',
        completedAt: task.status === 'completed' ? task.completedAt ?? task.updatedAt : undefined,
      } : item),
    });
    persistNotes(linkedNotes);
    linkedNotes.filter((note, index) => note !== previousNotes[index]).forEach(note => uploadNote(uid, note));
    await updateTask({ ...task, noteId, checklistItemId: itemId });
  };

  const unlinkChecklistItem = async (noteId: string, itemId: string) => {
    const uid = uidRef.current;
    const note = notesRef.current.find(item => item.id === noteId);
    const item = note?.todos?.find(todo => todo.id === itemId);
    if (!uid || !note || !item?.linkedTaskId) return;
    const task = tasksRef.current.find(value => value.id === item.linkedTaskId);
    const todos = (note.todos ?? []).map(todo => {
      if (todo.id !== itemId) return todo;
      const { linkedTaskId: _linkedTaskId, ...unlinked } = todo;
      return unlinked;
    });
    const updatedNote = { ...note, todos, updatedAt: Date.now() };
    persistNotes(notesRef.current.map(value => value.id === note.id ? updatedNote : value));
    uploadNote(uid, updatedNote);
    if (task?.noteId === noteId && task.checklistItemId === itemId) {
      const { noteId: _noteId, checklistItemId: _checklistItemId, ...standalone } = task;
      await updateTask(standalone as Task);
    }
  };

  const addCategory = (category: string) => {
    if (!categoriesRef.current.includes(category)) persistCategories([...categoriesRef.current, category]);
  };

  const renameCategory = (from: string, to: string) => {
    const nextName = to.trim();
    if (!nextName || nextName === from || categoriesRef.current.includes(nextName)) return;
    const updatedNotes = notesRef.current.map(note => note.category === from ? { ...note, category: nextName, updatedAt: Date.now() } : note);
    persistNotes(updatedNotes);
    const uid = uidRef.current;
    if (uid) updatedNotes.filter(note => note.category === nextName).forEach(note => uploadNote(uid, note));
    persistCategories(categoriesRef.current.map(category => category === from ? nextName : category));
  };

  const removeCategory = (category: string) => {
    const affectedNotes = notesRef.current.filter(note => note.category === category);
    if (affectedNotes.length > 0) {
      const updatedNotes = notesRef.current.map(note => note.category === category
        ? { ...note, category: 'Uncategorized', updatedAt: Date.now() }
        : note);
      persistNotes(updatedNotes);
      const uid = uidRef.current;
      if (uid) updatedNotes.filter(note => note.category === 'Uncategorized').forEach(note => uploadNote(uid, note));
    }
    const remaining = categoriesRef.current.filter(item => item !== category);
    persistCategories(affectedNotes.length > 0 && !remaining.includes('Uncategorized') ? [...remaining, 'Uncategorized'] : remaining);
  };

  return (
    <TaskContext.Provider value={{
      notes,
      tasks,
      categories,
      isLoading,
      addNote,
      updateNote,
      removeNote,
      addCategory,
      renameCategory,
      removeCategory,
      createTask,
      updateTask,
      removeTask,
      setTaskStatus,
      promoteChecklistItem,
      linkChecklistItem,
      unlinkChecklistItem,
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskStore = () => useContext(TaskContext);
