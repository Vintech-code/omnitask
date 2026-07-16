import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Storage } from './StorageService';

const OUTBOX_KEY = 'omnitask_cloud_outbox';

type CloudMutation = {
  id: string;
  uid: string;
  path: string[];
  operation: 'set' | 'delete';
  data?: Record<string, unknown>;
};

let outboxLock: Promise<unknown> = Promise.resolve();
const flushing = new Map<string, Promise<void>>();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = outboxLock.then(operation, operation);
  outboxLock = result.catch(() => undefined);
  return result;
}

async function readOutbox() {
  return await Storage.get<CloudMutation[]>(OUTBOX_KEY) ?? [];
}

async function enqueue(mutation: Omit<CloudMutation, 'id'>) {
  await serialize(async () => {
    const queued = await readOutbox();
    const pathKey = mutation.path.join('/');
    const next = queued.filter(item => !(item.uid === mutation.uid && item.path.join('/') === pathKey));
    next.push({ ...mutation, id: `${Date.now()}_${Math.random().toString(36).slice(2)}` });
    await Storage.set(OUTBOX_KEY, next);
  });
  void flushCloudMutations(mutation.uid);
}

export async function queueCloudSet(
  uid: string,
  path: string[],
  data: Record<string, unknown>,
) {
  await enqueue({ uid, path, operation: 'set', data });
}

export async function queueCloudDelete(uid: string, path: string[]) {
  await enqueue({ uid, path, operation: 'delete' });
}

export async function getPendingDeletePaths(uid: string): Promise<Set<string>> {
  const queued = await readOutbox();
  return new Set(
    queued
      .filter(item => item.uid === uid && item.operation === 'delete')
      .map(item => item.path.join('/')),
  );
}

export function flushCloudMutations(uid: string): Promise<void> {
  const existing = flushing.get(uid);
  if (existing) return existing;

  let completed = false;
  const task = (async () => {
    const queued = await readOutbox();
    for (const mutation of queued.filter(item => item.uid === uid)) {
      const reference = doc(db, mutation.path.join('/'));
      if (mutation.operation === 'set') {
        await setDoc(reference, mutation.data ?? {}, { merge: true });
      } else {
        await deleteDoc(reference);
      }

      await serialize(async () => {
        const latest = await readOutbox();
        await Storage.set(OUTBOX_KEY, latest.filter(item => item.id !== mutation.id));
      });
    }
    completed = true;
  })().finally(async () => {
    flushing.delete(uid);
    if (!completed) return;
    const remaining = await readOutbox();
    if (remaining.some(item => item.uid === uid)) void flushCloudMutations(uid);
  });

  flushing.set(uid, task);
  task.catch(() => undefined);
  return task;
}
