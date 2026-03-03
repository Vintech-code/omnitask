import React, { createContext, useContext, useState, useEffect } from 'react';
import { Storage, KEYS } from '../services/StorageService';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface NoteTag { label: string; color: string; }

export interface Note {
  id: string;
  title: string;
  body: string;
  date: string;
  timestamp: number;
  category: string;
  cardColor: string;
  tags: NoteTag[];
}

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

// ─── Provider ────────────────────────────────────────────────────────────────
export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  // Load from AsyncStorage on mount; seed with example notes on first launch
  useEffect(() => {
    (async () => {
      const storedNotes = await Storage.get<Note[]>(KEYS.TASKS);
      const storedCats  = await Storage.get<string[]>(KEYS.TASK_CATEGORIES);
      setNotes(storedNotes ?? SEED_NOTES);
      setCategories(storedCats ?? DEFAULT_CATEGORIES);
      setIsLoading(false);
    })();
  }, []);

  const persist = (updated: Note[]) => {
    setNotes(updated);
    Storage.set(KEYS.TASKS, updated);
  };

  const persistCats = (updated: string[]) => {
    setCategories(updated);
    Storage.set(KEYS.TASK_CATEGORIES, updated);
  };

  const addNote = (note: Note) => persist([note, ...notes]);
  const updateNote = (note: Note) => persist(notes.map(n => n.id === note.id ? note : n));
  const removeNote = (id: string) => persist(notes.filter(n => n.id !== id));
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
