const mockCollection = jest.fn(() => ({ kind: 'collection' }));
const mockDoc = jest.fn(() => ({ kind: 'document' }));
const mockGetDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockQueueSet = jest.fn(async () => undefined);
const mockQueueDelete = jest.fn(async () => undefined);

jest.mock('@/config/firebase', () => ({ db: { kind: 'db' } }));
jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => (mockCollection as jest.Mock)(...args),
  doc: (...args: unknown[]) => (mockDoc as jest.Mock)(...args),
  getDoc: (...args: unknown[]) => (mockGetDoc as jest.Mock)(...args),
  onSnapshot: (...args: unknown[]) => (mockOnSnapshot as jest.Mock)(...args),
}));
jest.mock('@/services/OfflineSyncService', () => ({
  queueCloudSet: (...args: unknown[]) => (mockQueueSet as jest.Mock)(...args),
  queueCloudDelete: (...args: unknown[]) => (mockQueueDelete as jest.Mock)(...args),
}));

import { createUserCollectionRepository, createUserMetadataRepository } from '@/repositories';

describe('UserCollectionRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes queued writes and deletes to the authenticated user', async () => {
    const repository = createUserCollectionRepository<{ id: string }>('items');
    await repository.set('user-a', 'item-1', { id: 'item-1' });
    await repository.remove('user-a', 'item-1');

    expect(repository.path('user-a', 'item-1')).toEqual(['users', 'user-a', 'items', 'item-1']);
    expect(mockQueueSet).toHaveBeenCalledWith(
      'user-a',
      ['users', 'user-a', 'items', 'item-1'],
      { id: 'item-1' },
    );
    expect(mockQueueDelete).toHaveBeenCalledWith(
      'user-a',
      ['users', 'user-a', 'items', 'item-1'],
    );
  });

  it('reads only the current user metadata path', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ schemaVersion: 2 }),
    });
    const repository = createUserCollectionRepository<object>('items');

    await expect(repository.readMeta('user-b', 'itemMeta')).resolves.toEqual({ schemaVersion: 2 });
    expect(mockDoc).toHaveBeenCalledWith(
      { kind: 'db' },
      'users',
      'user-b',
      'meta',
      'itemMeta',
    );
  });

  it('queues metadata through a stable UID-scoped path', async () => {
    const repository = createUserMetadataRepository<{ enabled: boolean }>('preferences');
    await repository.set('user-c', { enabled: true });

    expect(repository.path('user-c')).toEqual(['users', 'user-c', 'meta', 'preferences']);
    expect(mockQueueSet).toHaveBeenCalledWith(
      'user-c',
      ['users', 'user-c', 'meta', 'preferences'],
      { enabled: true },
    );
  });
});
