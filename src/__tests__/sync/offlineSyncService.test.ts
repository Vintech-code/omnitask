import AsyncStorage from '@react-native-async-storage/async-storage';

type RemoteRecord = Record<string, unknown>;
const mockRemoteByPath = new Map<string, RemoteRecord>();
const mockWrites: Array<{ operation: 'set' | 'delete'; path: string; data?: RemoteRecord }> = [];
let mockFailuresRemaining = 0;

const mockRunTransaction = jest.fn(async (
  _database: unknown,
  handler: (transaction: {
    get: (reference: { path: string }) => Promise<{
      exists: () => boolean;
      data: () => RemoteRecord;
    }>;
    set: (reference: { path: string }, data: RemoteRecord) => void;
    delete: (reference: { path: string }) => void;
  }) => Promise<unknown>,
) => {
  if (mockFailuresRemaining > 0) {
    mockFailuresRemaining -= 1;
    throw Object.assign(new Error('Network request failed'), { code: 'firestore/unavailable' });
  }
  return handler({
    get: async reference => ({
      exists: () => mockRemoteByPath.has(reference.path),
      data: () => mockRemoteByPath.get(reference.path) ?? {},
    }),
    set: (reference, data) => {
      mockWrites.push({ operation: 'set', path: reference.path, data });
      mockRemoteByPath.set(reference.path, {
        ...(mockRemoteByPath.get(reference.path) ?? {}),
        ...data,
      });
    },
    delete: reference => {
      mockWrites.push({ operation: 'delete', path: reference.path });
      mockRemoteByPath.delete(reference.path);
    },
  });
});

jest.mock('@/config/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_database, path: string) => ({ path })),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args as Parameters<typeof mockRunTransaction>),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
}));

import {
  __resetOfflineSyncForTests,
  currentSyncSnapshot,
  flushCloudMutations,
  getPendingDeletePaths,
  initializeOfflineSync,
  queueCloudDelete,
  queueCloudSet,
  recordCloudSnapshot,
  retryFailedMutations,
  setSyncConnectivity,
} from '@/services/OfflineSyncService';

describe('OfflineSyncService', () => {
  beforeEach(async () => {
    __resetOfflineSyncForTests();
    await AsyncStorage.clear();
    mockRemoteByPath.clear();
    mockWrites.length = 0;
    mockFailuresRemaining = 0;
    mockRunTransaction.mockClear();
    setSyncConnectivity(false);
  });

  afterEach(() => {
    __resetOfflineSyncForTests();
  });

  it('coalesces repeated writes per document without mixing account queues', async () => {
    await queueCloudSet('user-a', ['users', 'user-a', 'tasks', 'task-1'], { title: 'First' });
    await queueCloudSet('user-a', ['users', 'user-a', 'tasks', 'task-1'], { title: 'Latest' });
    await queueCloudSet('user-b', ['users', 'user-b', 'tasks', 'task-2'], { title: 'Other account' });

    expect(currentSyncSnapshot('user-a').mutations).toHaveLength(1);
    expect(currentSyncSnapshot('user-a').mutations[0].data).toMatchObject({ title: 'Latest' });
    expect(currentSyncSnapshot('user-b').mutations).toHaveLength(1);
    expect(currentSyncSnapshot('user-a').mutations[0].uid).toBe('user-a');
  });

  it('keeps deletes durable across a service restart and sends them in creation order', async () => {
    const firstPath = ['users', 'user-a', 'tasks', 'first'];
    const deletedPath = ['users', 'user-a', 'tasks', 'deleted'];
    mockRemoteByPath.set(deletedPath.join('/'), { title: 'Remove me' });
    await queueCloudSet('user-a', firstPath, { title: 'First' });
    await queueCloudDelete('user-a', deletedPath);

    __resetOfflineSyncForTests();
    setSyncConnectivity(false);
    await initializeOfflineSync('user-a');
    expect(await getPendingDeletePaths('user-a')).toEqual(new Set([deletedPath.join('/')]));

    setSyncConnectivity(true);
    await flushCloudMutations('user-a');

    expect(mockWrites.map(item => [item.operation, item.path])).toEqual([
      ['set', firstPath.join('/')],
      ['delete', deletedPath.join('/')],
    ]);
    expect(currentSyncSnapshot('user-a').mutations).toEqual([]);
  });

  it('records failures, backs off, and retries without creating duplicate documents', async () => {
    const path = ['users', 'user-a', 'events', 'event-1'];
    await queueCloudSet('user-a', path, { title: 'Offline event' });
    mockFailuresRemaining = 1;

    setSyncConnectivity(true);
    await flushCloudMutations('user-a');
    const failed = currentSyncSnapshot('user-a');
    expect(failed.status).toBe('failed');
    expect(failed.mutations[0]).toMatchObject({
      state: 'failed',
      retryCount: 1,
      errorCode: 'unavailable',
    });
    expect(failed.mutations[0].nextRetryAt).toBeGreaterThan(Date.now());

    await retryFailedMutations('user-a');
    expect(mockWrites.filter(item => item.path === path.join('/'))).toHaveLength(1);
    expect(currentSyncSnapshot('user-a').status).toBe('saved');
  });

  it('increases retry delay exponentially and caps it at five minutes', async () => {
    await queueCloudSet(
      'user-a',
      ['users', 'user-a', 'tasks', 'always-fails'],
      { title: 'Keep locally' },
    );
    mockFailuresRemaining = 12;
    setSyncConnectivity(true);
    await flushCloudMutations('user-a');

    const delays: number[] = [];
    for (let attempt = 0; attempt < 9; attempt += 1) {
      const mutation = currentSyncSnapshot('user-a').mutations[0];
      delays.push(mutation.nextRetryAt - Date.now());
      await retryFailedMutations('user-a');
    }

    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(Math.max(...delays)).toBeLessThanOrEqual(300_050);
    expect(delays.at(-1)).toBeGreaterThanOrEqual(299_900);
  });

  it('merges only locally changed fields when a newer remote revision exists', async () => {
    const path = ['users', 'user-a', 'notes', 'note-1'];
    const base = {
      title: 'Base title',
      body: 'Base body',
      _omniSync: { revision: 1 },
    };
    await recordCloudSnapshot('user-a', path, base);
    await queueCloudSet('user-a', path, { title: 'Local title', body: 'Base body' });
    mockRemoteByPath.set(path.join('/'), {
      title: 'Base title',
      body: 'Remote body',
      _omniSync: { revision: 2 },
    });

    setSyncConnectivity(true);
    await flushCloudMutations('user-a');

    const write = mockWrites.find(item => item.path === path.join('/'));
    expect(write?.data).toMatchObject({ title: 'Local title' });
    expect(write?.data).not.toHaveProperty('body');
    expect(mockRemoteByPath.get(path.join('/'))).toMatchObject({
      title: 'Local title',
      body: 'Remote body',
      _omniSync: { revision: 3 },
    });
  });

  it('retains every conflict baseline when a snapshot batch is recorded concurrently', async () => {
    const first = ['users', 'user-a', 'notes', 'first'];
    const second = ['users', 'user-a', 'notes', 'second'];
    await Promise.all([
      recordCloudSnapshot('user-a', first, {
        title: 'First base',
        body: 'First body',
        _omniSync: { revision: 1 },
      }),
      recordCloudSnapshot('user-a', second, {
        title: 'Second base',
        body: 'Second body',
        _omniSync: { revision: 1 },
      }),
    ]);
    await queueCloudSet('user-a', first, { title: 'First local', body: 'First body' });
    await queueCloudSet('user-a', second, { title: 'Second local', body: 'Second body' });
    mockRemoteByPath.set(first.join('/'), {
      title: 'First base',
      body: 'First remote',
      _omniSync: { revision: 2 },
    });
    mockRemoteByPath.set(second.join('/'), {
      title: 'Second base',
      body: 'Second remote',
      _omniSync: { revision: 2 },
    });

    setSyncConnectivity(true);
    await flushCloudMutations('user-a');

    const writes = mockWrites.filter(item => item.operation === 'set');
    expect(writes).toHaveLength(2);
    expect(writes.every(item => !Object.hasOwn(item.data ?? {}, 'body'))).toBe(true);
  });
});
