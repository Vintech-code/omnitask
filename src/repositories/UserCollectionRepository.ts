import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { queueCloudDelete, queueCloudSet } from '@/services/OfflineSyncService';

export interface UserCollectionDocument<T> {
  id: string;
  data: T;
  raw: DocumentData;
}

export interface UserCollectionRepository<T extends object> {
  path: (uid: string, id: string) => string[];
  subscribe: (
    uid: string,
    onData: (documents: UserCollectionDocument<T>[], snapshot: QuerySnapshot) => void | Promise<void>,
    onError: (error: Error) => void,
  ) => () => void;
  readMeta: (uid: string, documentId: string) => Promise<DocumentData | null>;
  set: (uid: string, id: string, value: T | Record<string, unknown>) => Promise<void>;
  remove: (uid: string, id: string) => Promise<void>;
}

/**
 * Keeps Firestore construction and mutation queuing out of React stores.
 * Domain stores remain responsible for local-first merges and migrations.
 */
export function createUserCollectionRepository<T extends object>(
  collectionName: string,
): UserCollectionRepository<T> {
  const path = (uid: string, id: string) => ['users', uid, collectionName, id];

  return {
    path,
    subscribe: (uid, onData, onError) => onSnapshot(
      collection(db, 'users', uid, collectionName),
      snapshot => { void onData(
        snapshot.docs.map(document => ({
          id: document.id,
          data: document.data() as T,
          raw: document.data(),
        })),
        snapshot,
      ); },
      onError,
    ),
    readMeta: async (uid, documentId) => {
      const snapshot = await getDoc(doc(db, 'users', uid, 'meta', documentId));
      return snapshot.exists() ? snapshot.data() : null;
    },
    set: (uid, id, value) =>
      queueCloudSet(uid, path(uid, id), value as unknown as Record<string, unknown>),
    remove: (uid, id) => queueCloudDelete(uid, path(uid, id)),
  };
}
