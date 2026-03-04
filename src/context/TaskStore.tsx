import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, QuerySnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { Storage, KEYS } from '../services/StorageService';
import type { Note, NoteTag, ChecklistItem } from '@/types/note';

export type { Note, NoteTag, ChecklistItem };

const DEFAULT_CATEGORIES = ['Personal', 'Work', 'School', 'Health', 'Finance'];

const SEED_NOTES: Note[] = [
  {
    id: 'n1', title: 'Pick up groceries',
    body: 'Eggs, milk, bread, fruits, vegetables',
    date: 'Today', timestamp: Date.now() - 100,
    category: 'Personal', cardColor: '#FFF9C4',
    tags: [{ label: 'PERSONAL', color: '#4CAF50' }],
  },
  {
    id: 'n2', title: 'Send weekly report',
    body: 'Compile data from monday to friday and send before 5pm.',
    date: 'Yesterday', timestamp: Date.now() - 86400000,
    category: 'Work', cardColor: '#E3F2FD',
    tags: [{ label: 'WORK', color: '#2196F3' }],
  },
  {
    id: 'n3', title: 'Study for exam',
    body: 'Review chapters 4–7. Focus on formulas and diagrams.',
    date: 'Mar 1, 2026', timestamp: Date.now() - 172800000,
    category: 'School', cardColor: '#FFF3E0',
    tags: [{ label: 'STUDY', color: '#4CAF50' }, { label: 'EXAM', color: '#F44336' }],
  },
];

// ─── Context type ────────────────────────────────────────────────────────────
interface TaskContextType {
  notes: Note[];
  categories: string[];
  isLoading: boolean;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  removeNote: (id: string) => void;
  addCategory: (cat: string) => void;
  removeCategory: (cat: string) => void;
}

const TaskContext = createContext<TaskContextType>({
  notes: [],
  categories: DEFAULT_CATEGORIES,
  isLoading: true,
  addNote: () => {},
  updateNote: () => {},
  removeNote: () => {},
  addCategory: () => {},
  removeCategory: () => {},
});

// ─── Firestore helpers ──────────────────────────────────────────────────────
const notesCol = (uid: string) => collection(db, 'users', uid, 'notes');
const noteDoc  = (uid: string, id: string) => doc(db, 'users', uid, 'notes', id);
const metaDoc  = (uid: string) => doc(db, 'users', uid, 'meta', 'taskMeta');

// ─── Provider ────────────────────────────────────────────────────────────────
export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes]           = useState<Note[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading]   = useState(true);
  const uidRef     = useRef<string | null>(null);
  const unsubNotes = useRef<(() => void) | null>(null);

  useEffect(() => {
    // 1. Hydrate from local cache instantly
    (async () => {
      const storedNotes = await Storage.get<Note[]>(KEYS.TASKS);
      const storedCats  = await Storage.get<string[]>(KEYS.TASK_CATEGORIES);
      setNotes(storedNotes ?? SEED_NOTES);
      setCategories(storedCats ?? DEFAULT_CATEGORIES);
      setIsLoading(false);
    })();

    // 2. Attach Firestore realtime listener when authenticated
    const unsubAuth = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (unsubNotes.current) { unsubNotes.current(); unsubNotes.current = null; }
      if (!fbUser) { uidRef.current = null; return; }
      uidRef.current = fbUser.uid;

      unsubNotes.current = onSnapshot(
        notesCol(fbUser.uid),
        (snap: QuerySnapshot) => {
          const fetched: Note[] = snap.docs.map(d => d.data() as Note);
          if (fetched.length > 0) {
            setNotes(fetched);
            Storage.set(KEYS.TASKS, fetched);
          }
        },
        () => {}
      );

      // Fetch categories metadata
      try {
        const firestoreImport = await import('firebase/firestore');
        const snap = await firestoreImport.getDoc(metaDoc(fbUser.uid));
        const data = snap.data();
        if (data?.categories) {
          setCategories(data.categories);
          Storage.set(KEYS.TASK_CATEGORIES, data.categories);
        }
      } catch { /* offline */ }
    });

    return () => {
      unsubAuth();
      if (unsubNotes.current) unsubNotes.current();
    };
  }, []);

  const persist = (updated: Note[]) => {
    setNotes(updated);
    Storage.set(KEYS.TASKS, updated);
  };

  const persistCats = (updated: string[]) => {
    setCategories(updated);
    Storage.set(KEYS.TASK_CATEGORIES, updated);
    if (uidRef.current) {
      setDoc(metaDoc(uidRef.current), { categories: updated }, { merge: true }).catch(() => {});
    }
  };

  // Firestore rejects `undefined` field values — strip them before writing
  const toFirestoreDoc = (note: Note): Record<string, unknown> =>
    Object.fromEntries(Object.entries(note).filter(([, v]) => v !== undefined));

  const addNote = (note: Note) => {
    persist([note, ...notes]);
    if (uidRef.current) setDoc(noteDoc(uidRef.current, note.id), toFirestoreDoc(note)).catch(() => {});
  };
  const updateNote = (note: Note) => {
    persist(notes.map(n => n.id === note.id ? note : n));
    if (uidRef.current) setDoc(noteDoc(uidRef.current, note.id), toFirestoreDoc(note)).catch(() => {});
  };
  const removeNote = (id: string) => {
    persist(notes.filter(n => n.id !== id));
    if (uidRef.current) deleteDoc(noteDoc(uidRef.current, id)).catch(() => {});
  };
  const addCategory = (cat: string) => {
    if (!categories.includes(cat)) persistCats([...categories, cat]);
  };
  const removeCategory = (cat: string) => persistCats(categories.filter(c => c !== cat));

  return (
    <TaskContext.Provider value={{ notes, categories, isLoading, addNote, updateNote, removeNote, addCategory, removeCategory }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskStore = () => useContext(TaskContext);
