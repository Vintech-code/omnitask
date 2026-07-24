const mockLocalStore = new Map<string, unknown>();
const mockQueueCloudSet = jest.fn(async (..._args: unknown[]) => undefined);
const mockQueueCloudDelete = jest.fn(async (..._args: unknown[]) => undefined);
const mockDeleteObject = jest.fn(async (..._args: unknown[]) => undefined);
const mockUploadBytesResumable = jest.fn();
const mockGetDownloadUrl = jest.fn(async (value: { path?: string }) => `https://storage.test/${value.path ?? 'image'}`);
let mockUploadFailure: Error | null = null;
let mockHoldUpload = false;
let mockCloudAttachments: Array<Record<string, unknown>> = [];

jest.mock('@/config/firebase', () => ({ db: {}, firebaseStorage: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  onSnapshot: jest.fn((_reference, onNext: (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void) => {
    queueMicrotask(() => onNext({ docs: mockCloudAttachments.map(item => ({ id: String(item.id), data: () => item })) }));
    return jest.fn();
  }),
}));
jest.mock('firebase/storage', () => ({
  ref: jest.fn((_storage, path: string) => ({ path })),
  uploadBytesResumable: (...args: unknown[]) => mockUploadBytesResumable(...args),
  getDownloadURL: (value: { path?: string }) => mockGetDownloadUrl(value),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
  listAll: jest.fn(async () => ({ items: [], prefixes: [] })),
}));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file://documents/',
  makeDirectoryAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
  copyAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 2048 })),
}));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: jest.fn(async () => ({ uri: 'file://cache/thumbnail.jpg', width: 360, height: 240 })),
}));
jest.mock('@/services/OfflineSyncService', () => ({
  queueCloudSet: (...args: unknown[]) => mockQueueCloudSet(...args),
  queueCloudDelete: (...args: unknown[]) => mockQueueCloudDelete(...args),
  getPendingMutationPaths: jest.fn(async () => new Set()),
  recordCloudSnapshot: jest.fn(async () => undefined),
  reportSyncDiagnostic: jest.fn(async () => undefined),
  syncRevision: jest.fn(() => 0),
  withoutSyncMetadata: jest.fn((data: Record<string, unknown>) => data),
}));
jest.mock('@/services/StorageService', () => ({
  KEYS: { ATTACHMENTS: 'attachments' },
  Storage: {
    getForUser: jest.fn(async (key: string, uid: string) => mockLocalStore.get(`${key}:${uid}`) ?? null),
    setForUser: jest.fn(async (key: string, uid: string, value: unknown) => { mockLocalStore.set(`${key}:${uid}`, value); }),
  },
}));

import {
  attachmentDisplayUri,
  cancelAttachmentUpload,
  currentAttachments,
  deleteAttachment,
  importAttachment,
  migrateLegacyNoteAttachments,
  retryPendingAttachments,
  startAttachmentSession,
} from '@/services/AttachmentService';

describe('AttachmentService', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: jest.fn(async () => ({ ok: true, blob: async () => new Blob(['image']) })),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStore.clear();
    mockUploadFailure = null;
    mockHoldUpload = false;
    mockCloudAttachments = [];
    mockUploadBytesResumable.mockImplementation((_target: { path: string }) => {
      const task = {
        snapshot: { ref: _target },
        cancel: jest.fn(),
        on: (_event: string, _progress: unknown, failed: (error: Error) => void, completed: () => void) => {
          if (!mockHoldUpload) {
            queueMicrotask(() => mockUploadFailure ? failed(mockUploadFailure) : completed());
          }
        },
      };
      return task;
    });
  });

  it('copies locally first and exposes the remote URL after background upload', async () => {
    const attachment = await importAttachment('user-a', {
      uri: 'file://picker/photo.jpg',
      purpose: 'note',
      parentId: 'note-1',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
    });

    expect(attachment.localUri).toContain('file://documents/attachments/user-a/');
    expect(attachment.uploadState).toBe('pending');
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
    const uploaded = currentAttachments().find(item => item.id === attachment.id);
    expect(uploaded).toMatchObject({ uploadState: 'uploaded', remoteUrl: expect.stringContaining('https://storage.test/') });
    expect(attachmentDisplayUri({ ...uploaded!, localUri: undefined })).toBe(uploaded?.remoteUrl);
  });

  it('keeps the managed local copy when an upload fails and succeeds on retry', async () => {
    mockUploadFailure = Object.assign(new Error('offline'), { code: 'storage/retry-limit-exceeded' });
    const attachment = await importAttachment('user-b', {
      uri: 'file://picker/offline.png',
      purpose: 'canvas',
      parentId: 'canvas-1',
      mimeType: 'image/png',
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(currentAttachments().find(item => item.id === attachment.id)).toMatchObject({
      uploadState: 'failed',
      localUri: expect.stringContaining('file://documents/attachments/user-b/'),
      retryCount: 1,
    });

    mockUploadFailure = null;
    await retryPendingAttachments('user-b');
    expect(currentAttachments().find(item => item.id === attachment.id)?.uploadState).toBe('uploaded');
  });

  it('migrates legacy Note URIs deterministically without removing them or duplicating metadata', async () => {
    const note = {
      id: 'note-legacy', title: 'Photos', body: '', date: 'Today', timestamp: 1,
      category: 'Personal', cardColor: '#fff', tags: [], images: ['file://legacy/image.jpg'],
    };
    const first = await migrateLegacyNoteAttachments('user-c', [note]);
    const second = await migrateLegacyNoteAttachments('user-c', first.notes);

    expect(first.notes[0].images).toEqual(note.images);
    expect(first.notes[0].attachmentIds).toHaveLength(1);
    expect(second.notes[0].attachmentIds).toEqual(first.notes[0].attachmentIds);
    expect(currentAttachments().filter(item => item.parentId === note.id)).toHaveLength(1);
  });

  it('cancels an interrupted upload without deleting its only local copy', async () => {
    mockHoldUpload = true;
    const attachment = await importAttachment('user-d', {
      uri: 'file://picker/interrupted.jpg',
      purpose: 'note',
      parentId: 'note-interrupted',
      mimeType: 'image/jpeg',
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    await cancelAttachmentUpload('user-d', attachment.id);

    expect(currentAttachments().find(item => item.id === attachment.id)).toMatchObject({
      uploadState: 'cancelled',
      localUri: expect.stringContaining('file://documents/attachments/user-d/'),
    });
  });

  it('restores cloud metadata and uses the remote image on another device', async () => {
    mockCloudAttachments = [{
      id: 'remote-only',
      ownerId: 'user-e',
      purpose: 'note',
      parentId: 'note-remote',
      scope: 'user',
      remotePath: 'users/user-e/attachments/remote-only/original.jpg',
      remoteUrl: 'https://storage.test/remote-only.jpg',
      mimeType: 'image/jpeg',
      byteSize: 2048,
      uploadState: 'uploaded',
      retryCount: 0,
      createdAt: 1,
      updatedAt: 2,
      version: 1,
    }];

    const stop = await startAttachmentSession('user-e');
    await new Promise(resolve => setTimeout(resolve, 0));
    const restored = currentAttachments().find(item => item.id === 'remote-only');

    expect(restored?.localUri).toBeUndefined();
    expect(attachmentDisplayUri(restored)).toBe('https://storage.test/remote-only.jpg');
    stop();
  });

  it('removes a local-only attachment without requiring the cloud bucket', async () => {
    mockHoldUpload = true;
    const attachment = await importAttachment('user-f', {
      uri: 'file://picker/local-only.jpg',
      purpose: 'canvas',
      parentId: 'canvas-local',
      mimeType: 'image/jpeg',
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    await deleteAttachment('user-f', attachment.id);

    expect(currentAttachments().find(item => item.id === attachment.id)).toBeUndefined();
    expect(mockDeleteObject).not.toHaveBeenCalled();
    expect(mockQueueCloudDelete).toHaveBeenCalled();
  });

  it('rejects unsupported media before it is added to the attachment repository', async () => {
    await expect(importAttachment('user-g', {
      uri: 'file://picker/animation.gif',
      purpose: 'note',
      parentId: 'note-unsupported',
      mimeType: 'image/gif',
    })).rejects.toThrow('Unsupported image type');
  });
});
