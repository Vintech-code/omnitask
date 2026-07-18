import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import { auth, db } from '../config/firebase';
import { getPendingDeletePaths, queueCloudDelete, queueCloudSet } from '../services/OfflineSyncService';
import { KEYS, Storage } from '../services/StorageService';
import type { ChecklistItem, Note, NoteTag } from '@/types/note';

export type { ChecklistItem, Note, NoteTag };

const DEFAULT_CATEGORIES = ['Personal', 'Work', 'School', 'Health', 'Finance'];

interface TaskContextType {
  notes: Note[];
  categories: string[];
  isLoading: boolean;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  removeNote: (id: string) => void;
  addCategory: (category: string) => void;
  renameCategory: (from: string, to: string) => void;
  removeCategory: (category: string) => void;
}

const TaskContext = createContext<TaskContextType>({
  notes: [], categories: DEFAULT_CATEGORIES, isLoading: true,
  addNote: () => {}, updateNote: () => {}, removeNote: () => {}, addCategory: () => {}, renameCategory: () => {}, removeCategory: () => {},
});

const notesCol = (uid: string) => collection(db, 'users', uid, 'notes');
const notePath = (uid: string, id: string) => ['users', uid, 'notes', id];
const metaPath = (uid: string) => ['users', uid, 'meta', 'taskMeta'];
const modified = (note: Note) => note.updatedAt ?? note.timestamp ?? 0;
const clean = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const notesRef = useRef<Note[]>([]);
  const categoriesRef = useRef(DEFAULT_CATEGORIES);
  const uidRef = useRef<string | null>(null);
  const unsubNotesRef = useRef<(() => void) | null>(null);

  const persistNotes = (updated: Note[]) => {
    notesRef.current = updated;
    setNotes(updated);
    if (uidRef.current) void Storage.setForUser(KEYS.TASKS, uidRef.current, updated);
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
    const unsubAuth = onAuthStateChanged(auth, async firebaseUser => {
      unsubNotesRef.current?.();
      unsubNotesRef.current = null;
      if (!firebaseUser) {
        uidRef.current = null;
        persistNotes([]);
        categoriesRef.current = DEFAULT_CATEGORIES;
        setCategories(DEFAULT_CATEGORIES);
        setIsLoading(false);
        return;
      }

      const uid = firebaseUser.uid;
      uidRef.current = uid;
      const [localNotes, localCategories] = await Promise.all([
        Storage.getForUser<Note[]>(KEYS.TASKS, uid),
        Storage.getForUser<string[]>(KEYS.TASK_CATEGORIES, uid),
      ]);
      persistNotes(localNotes ?? []);
      persistCategories(localCategories ?? DEFAULT_CATEGORIES, false);
      setIsLoading(false);

      void getDoc(doc(db, metaPath(uid).join('/'))).then(snapshot => {
        const cloudCategories = snapshot.data()?.categories;
        if (uidRef.current === uid && Array.isArray(cloudCategories)) {
          persistCategories([...new Set([...categoriesRef.current, ...cloudCategories])], false);
        }
      }).catch(() => undefined);

      unsubNotesRef.current = onSnapshot(notesCol(uid), async (snapshot: QuerySnapshot) => {
        if (uidRef.current !== uid) return;
        const pendingDeletes = await getPendingDeletePaths(uid);
        const cloud = snapshot.docs
          .map(item => item.data() as Note)
          .filter(item => !pendingDeletes.has(notePath(uid, item.id).join('/')));
        const merged = new Map(cloud.map(item => [item.id, item]));
        for (const local of notesRef.current) {
          const remote = merged.get(local.id);
          if (!remote || modified(local) > modified(remote)) {
            merged.set(local.id, local);
            void queueCloudSet(uid, notePath(uid, local.id), clean(local as unknown as Record<string, unknown>));
          }
        }
        persistNotes([...merged.values()].sort((a, b) => b.timestamp - a.timestamp));
      }, () => undefined);
    });
    return () => {
      unsubAuth();
      unsubNotesRef.current?.();
    };
  }, []);

  const saveNote = (note: Note, isNew: boolean) => {
    const uid = uidRef.current;
    if (!uid) return;
    const updatedNote = { ...note, updatedAt: Date.now() };
    persistNotes(isNew
      ? [updatedNote, ...notesRef.current]
      : notesRef.current.map(item => item.id === note.id ? updatedNote : item));
    void queueCloudSet(uid, notePath(uid, note.id), clean(updatedNote as unknown as Record<string, unknown>));
  };

  const addNote = (note: Note) => saveNote(note, true);
  const updateNote = (note: Note) => saveNote(note, false);
  const removeNote = (id: string) => {
    const uid = uidRef.current;
    if (!uid) return;
    persistNotes(notesRef.current.filter(note => note.id !== id));
    void queueCloudDelete(uid, notePath(uid, id));
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
    if (uid) {
      updatedNotes
        .filter(note => note.category === nextName)
        .forEach(note => void queueCloudSet(uid, notePath(uid, note.id), clean(note as unknown as Record<string, unknown>)));
    }
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
      if (uid) {
        updatedNotes
          .filter(note => note.category === 'Uncategorized')
          .forEach(note => void queueCloudSet(uid, notePath(uid, note.id), clean(note as unknown as Record<string, unknown>)));
      }
    }
    const remaining = categoriesRef.current.filter(item => item !== category);
    persistCategories(affectedNotes.length > 0 && !remaining.includes('Uncategorized') ? [...remaining, 'Uncategorized'] : remaining);
  };

  return <TaskContext.Provider value={{ notes, categories, isLoading, addNote, updateNote, removeNote, addCategory, renameCategory, removeCategory }}>{children}</TaskContext.Provider>;
};

export const useTaskStore = () => useContext(TaskContext);
