import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { queueCloudSet, recordCloudSnapshot } from './OfflineSyncService';
import { KEYS, Storage } from './StorageService';

const focusPath = (uid: string) => ['users', uid, 'meta', 'focusStats'];

export async function saveFocusSessions(uid: string, sessions: number) {
  await Storage.setForUser(KEYS.SESSIONS, uid, sessions);
  await queueCloudSet(uid, focusPath(uid), { sessions, updatedAt: Date.now() });
}

export async function hydrateFocusSessions(
  uid: string,
  onValue: (sessions: number) => void,
) {
  const cached = await Storage.getForUser<number>(KEYS.SESSIONS, uid) ?? 0;
  onValue(cached);

  void getDoc(doc(db, focusPath(uid).join('/'))).then(async snapshot => {
    if (snapshot.exists()) await recordCloudSnapshot(uid, focusPath(uid), snapshot.data());
    const remote = snapshot.data()?.sessions;
    const resolved = typeof remote === 'number' ? Math.max(cached, remote) : cached;
    onValue(resolved);
    await Storage.setForUser(KEYS.SESSIONS, uid, resolved);
    if (resolved > (typeof remote === 'number' ? remote : -1)) {
      await queueCloudSet(uid, focusPath(uid), { sessions: resolved, updatedAt: Date.now() });
    }
  }).catch(() => undefined);
}
