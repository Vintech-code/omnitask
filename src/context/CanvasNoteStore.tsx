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
import { CANVAS_DOCUMENT_VERSION, type InfiniteCanvasNote } from '@/types/note';
import { cleanupOrphanedAttachments, deleteAttachment, migrateLegacyCanvasAttachments } from '@/services/AttachmentService';
import { createUserCollectionRepository } from '@/repositories';

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

const canvasRepository = createUserCollectionRepository<InfiniteCanvasNote>('canvasNotes');
const pathFor = canvasRepository.path;
const migrateCanvasDocuments = (notes: InfiniteCanvasNote[]) => {
  const changedIds: string[] = [];
  const migrated = notes.map(note => {
    if ((note.documentVersion ?? 0) >= CANVAS_DOCUMENT_VERSION) return note;
    changedIds.push(note.id);
    return {
      ...note,
      objects: Array.isArray(note.objects) ? note.objects : [],
      canvasPosition: note.canvasPosition ?? { x: 0, y: 0 },
      zoomLevel: Math.max(0.2, note.zoomLevel ?? 1),
      gridEnabled: note.gridEnabled ?? true,
      snapEnabled: note.snapEnabled ?? true,
      documentVersion: CANVAS_DOCUMENT_VERSION,
    };
  });
  return { notes: migrated, changedIds };
};

export function CanvasNoteProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const authenticatedUid = user?.id ?? null;
  const [canvasNotes, setCanvasNotes] = useState<InfiniteCanvasNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const notesRef = useRef<InfiniteCanvasNote[]>([]);
  const uidRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const orphanTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const persist = (notes: InfiniteCanvasNote[]) => {
    const sorted = [...notes].sort((left, right) => right.updatedAt - left.updatedAt);
    notesRef.current = sorted;
    setCanvasNotes(sorted);
    if (uidRef.current) void Storage.setForUser(KEYS.CANVAS_NOTES, uidRef.current, sorted);
  };

  useEffect(() => {
    let disposed = false;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      if (authLoading) return () => { disposed = true; };
      if (!authenticatedUid) {
        uidRef.current = null;
        persist([]);
        setIsLoading(false);
        return () => { disposed = true; };
      }

      const uid = authenticatedUid;
      uidRef.current = uid;
      setIsLoading(true);
      void (async () => {
      const local = await Storage.getForUser<InfiniteCanvasNote[]>(KEYS.CANVAS_NOTES, uid) ?? [];
      if (disposed || uidRef.current !== uid) return;
      const localMigration = await migrateLegacyCanvasAttachments(uid, local);
      if (disposed || uidRef.current !== uid) return;
      const localSchemaMigration = migrateCanvasDocuments(localMigration.notes);
      persist(localSchemaMigration.notes);
      localSchemaMigration.notes.forEach(note => {
        void cleanupOrphanedAttachments(
          uid,
          'canvas',
          note.id,
          note.objects.flatMap(object => object.attachmentId ? [object.attachmentId] : []),
        );
      });
      [...new Set([...localMigration.changedIds, ...localSchemaMigration.changedIds])].forEach(id => {
        const note = localSchemaMigration.notes.find(item => item.id === id);
        if (note) void queueCloudSet(uid, pathFor(uid, note.id), note as unknown as Record<string, unknown>);
      });
      setIsLoading(false);

      unsubscribeRef.current = canvasRepository.subscribe(uid, async documents => {
        if (uidRef.current !== uid) return;
        const pendingPaths = await getPendingMutationPaths(uid);
        await Promise.all(documents.map(item =>
          recordCloudSnapshot(uid, pathFor(uid, item.id), item.raw)
        ));
        const remote = documents
          .map(item => withoutSyncMetadata<InfiniteCanvasNote>(item.data))
          .filter(item => !pendingPaths.has(pathFor(uid, item.id).join('/')));
        const merged = new Map(remote.map(item => [item.id, item]));
        for (const local of notesRef.current) {
          const cloud = merged.get(local.id);
          const path = pathFor(uid, local.id).join('/');
          const rawCloud = documents.find(item => item.id === local.id)?.raw;
          const keepLocal = pendingPaths.has(path)
            || !cloud
            || syncRevision(rawCloud) === 0 && local.updatedAt > cloud.updatedAt;
          if (keepLocal) {
            merged.set(local.id, local);
            if (!pendingPaths.has(path)) {
              void queueCloudSet(uid, pathFor(uid, local.id), local as unknown as Record<string, unknown>);
            }
          }
        }
        const migration = await migrateLegacyCanvasAttachments(uid, [...merged.values()]);
        const schemaMigration = migrateCanvasDocuments(migration.notes);
        persist(schemaMigration.notes);
        [...new Set([...migration.changedIds, ...schemaMigration.changedIds])].forEach(id => {
          const note = schemaMigration.notes.find(item => item.id === id);
          if (note) void queueCloudSet(uid, pathFor(uid, note.id), note as unknown as Record<string, unknown>);
        });
      }, error => {
        void reportSyncDiagnostic(uid, {
          path: `users/${uid}/canvasNotes`,
          severity: 'error',
          code: 'firestore/canvas-listen-failed',
          message: error.message || 'Canvas documents could not refresh from the cloud.',
        });
      });
      })();
    return () => {
      disposed = true;
      unsubscribeRef.current?.();
      orphanTimersRef.current.forEach(timer => clearTimeout(timer));
      orphanTimersRef.current.clear();
    };
  }, [authenticatedUid, authLoading]);

  const save = (note: InfiniteCanvasNote, isNew: boolean) => {
    const uid = uidRef.current;
    if (!uid) return;
    const previous = notesRef.current.find(item => item.id === note.id);
    const nextAttachmentIds = new Set(note.objects.flatMap(object => object.attachmentId ? [object.attachmentId] : []));
    nextAttachmentIds.forEach(id => {
      const timer = orphanTimersRef.current.get(id);
      if (timer) clearTimeout(timer);
      orphanTimersRef.current.delete(id);
    });
    const removedIds = (previous?.objects ?? [])
      .flatMap(object => object.attachmentId ? [object.attachmentId] : [])
      .filter(id => !nextAttachmentIds.has(id));
    removedIds.forEach(attachmentId => {
      const existingTimer = orphanTimersRef.current.get(attachmentId);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(() => {
        const stillReferenced = notesRef.current.some(canvas => canvas.objects.some(object => object.attachmentId === attachmentId));
        if (!stillReferenced) void deleteAttachment(uid, attachmentId);
        orphanTimersRef.current.delete(attachmentId);
      }, 30_000);
      orphanTimersRef.current.set(attachmentId, timer);
    });
    const updated = { ...note, updatedAt: Date.now(), documentVersion: CANVAS_DOCUMENT_VERSION };
    persist(isNew ? [updated, ...notesRef.current] : notesRef.current.map(item => item.id === note.id ? updated : item));
    void canvasRepository.set(uid, note.id, updated);
  };

  const removeCanvasNote = (id: string) => {
    const uid = uidRef.current;
    if (!uid) return;
    const note = notesRef.current.find(item => item.id === id);
    note?.objects.forEach(object => {
      if (object.attachmentId) void deleteAttachment(uid, object.attachmentId);
    });
    persist(notesRef.current.filter(note => note.id !== id));
    void canvasRepository.remove(uid, id);
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
