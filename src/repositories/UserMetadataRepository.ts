import { doc, getDoc, onSnapshot, type DocumentData } from 'firebase/firestore';

import { db } from '@/config/firebase';
import { queueCloudSet } from '@/services/OfflineSyncService';

export interface UserMetadataRepository<T extends object> {
  path: (uid: string) => string[];
  read: (uid: string) => Promise<T | null>;
  subscribe: (
    uid: string,
    onData: (data: T, raw: DocumentData) => void | Promise<void>,
    onError: (error: Error) => void,
  ) => () => void;
  set: (uid: string, value: T | Record<string, unknown>) => Promise<void>;
}

export function createUserMetadataRepository<T extends object>(
  documentId: string,
): UserMetadataRepository<T> {
  const path = (uid: string) => ['users', uid, 'meta', documentId];
  return {
    path,
    read: async uid => {
      const snapshot = await getDoc(doc(db, path(uid).join('/')));
      return snapshot.exists() ? snapshot.data() as T : null;
    },
    subscribe: (uid, onData, onError) => onSnapshot(
      doc(db, path(uid).join('/')),
      snapshot => {
        if (snapshot.exists()) void onData(snapshot.data() as T, snapshot.data());
      },
      onError,
    ),
    set: (uid, value) =>
      queueCloudSet(uid, path(uid), value as unknown as Record<string, unknown>),
  };
}
