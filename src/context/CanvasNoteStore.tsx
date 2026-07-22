import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import { auth, db } from '@/config/firebase';
import { getPendingDeletePaths, queueCloudDelete, queueCloudSet } from '@/services/OfflineSyncService';
import { KEYS, Storage } from '@/services/StorageService';
import type { InfiniteCanvasNote } from '@/types/note';

interface CanvasNoteContextValue {
  canvasNotes: InfiniteCanvasNote[];
  isLoading: boolean;
  addCanvasNote: (note: InfiniteCanvasNote) => void;
  updateCanvasNote: (note: InfiniteCanvasNote) => void;
  removeCanvasNote: (id: string) => void;
}

const CanvasNoteContext = createContext<CanvasNoteContextValue>({
  canvasNotes: [],
  isLoading: true,
  addCanvasNote: () => undefined,
  updateCanvasNote: () => undefined,
  removeCanvasNote: () => undefined,
});

const collectionFor = (uid: string) => collection(db, 'users', uid, 'canvasNotes');
const pathFor = (uid: string, id: string) => ['users', uid, 'canvasNotes', id];

export function CanvasNoteProvider({ children }: { children: React.ReactNode }) {
  const [canvasNotes, setCanvasNotes] = useState<InfiniteCanvasNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const notesRef = useRef<InfiniteCanvasNote[]>([]);
  const uidRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const persist = (notes: InfiniteCanvasNote[]) => {
    const sorted = [...notes].sort((left, right) => right.updatedAt - left.updatedAt);
    notesRef.current = sorted;
    setCanvasNotes(sorted);
    if (uidRef.current) void Storage.setForUser(KEYS.CANVAS_NOTES, uidRef.current, sorted);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async firebaseUser => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      if (!firebaseUser) {
        uidRef.current = null;
        persist([]);
        setIsLoading(false);
        return;
      }

      const uid = firebaseUser.uid;
      uidRef.current = uid;
      persist(await Storage.getForUser<InfiniteCanvasNote[]>(KEYS.CANVAS_NOTES, uid) ?? []);
      setIsLoading(false);

      unsubscribeRef.current = onSnapshot(collectionFor(uid), async (snapshot: QuerySnapshot) => {
        if (uidRef.current !== uid) return;
        const pendingDeletes = await getPendingDeletePaths(uid);
        const remote = snapshot.docs
          .map(item => item.data() as InfiniteCanvasNote)
          .filter(item => !pendingDeletes.has(pathFor(uid, item.id).join('/')));
        const merged = new Map(remote.map(item => [item.id, item]));
        for (const local of notesRef.current) {
          const cloud = merged.get(local.id);
          if (!cloud || local.updatedAt > cloud.updatedAt) {
            merged.set(local.id, local);
            void queueCloudSet(uid, pathFor(uid, local.id), local as unknown as Record<string, unknown>);
          }
        }
        persist([...merged.values()]);
      }, () => undefined);
    });
    return () => {
      unsubscribeAuth();
      unsubscribeRef.current?.();
    };
  }, []);

  const save = (note: InfiniteCanvasNote, isNew: boolean) => {
    const uid = uidRef.current;
    if (!uid) return;
    const updated = { ...note, updatedAt: Date.now() };
    persist(isNew ? [updated, ...notesRef.current] : notesRef.current.map(item => item.id === note.id ? updated : item));
    void queueCloudSet(uid, pathFor(uid, note.id), updated as unknown as Record<string, unknown>);
  };

  const removeCanvasNote = (id: string) => {
    const uid = uidRef.current;
    if (!uid) return;
    persist(notesRef.current.filter(note => note.id !== id));
    void queueCloudDelete(uid, pathFor(uid, id));
  };

  return (
    <CanvasNoteContext.Provider value={{
      canvasNotes,
      isLoading,
      addCanvasNote: note => save(note, true),
      updateCanvasNote: note => save(note, false),
      removeCanvasNote,
    }}>
      {children}
    </CanvasNoteContext.Provider>
  );
}

export const useCanvasNotes = () => useContext(CanvasNoteContext);
