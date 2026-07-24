import {
  CANVAS_COLLABORATION_COMMENT_MAX_LENGTH,
  CANVAS_COLLABORATION_MEMBER_LIMIT,
  CANVAS_COLLABORATION_OBJECT_LIMIT,
  CANVAS_COLLABORATION_VERSION_LIMIT,
  CANVAS_INVITE_CODE_LENGTH,
  CANVAS_INVITE_VALIDITY_MS,
  canCommentOnCanvas,
  canEditCanvas,
  diffCanvasObjects,
  mergeCanvasObjects,
  normalizeCanvasMember,
  joinCanvasCollaboration,
  stopCanvasCollaboration,
  toCanvasInviteCode,
} from '@/services/CanvasCollaborationService';
import type { CanvasObject } from '@/types/note';

jest.mock('@/services/AttachmentService', () => ({
  mirrorAttachmentToCollaboration: jest.fn(async () => ({ remoteUrl: 'https://storage.test/image.jpg' })),
  deleteCollaborationAttachment: jest.fn(async () => undefined),
  deleteCollaborationAttachments: jest.fn(async () => undefined),
}));
jest.mock('@/config/firebase', () => ({
  __esModule: true,
  default: {},
  auth: { currentUser: null },
  db: {},
}));
jest.mock('firebase/functions', () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), deleteDoc: jest.fn(), doc: jest.fn(), getDoc: jest.fn(), getDocs: jest.fn(),
  limit: jest.fn(), onSnapshot: jest.fn(), orderBy: jest.fn(), query: jest.fn(), serverTimestamp: jest.fn(),
  setDoc: jest.fn(), updateDoc: jest.fn(), writeBatch: jest.fn(),
}));

const object = (id: string, content: string): CanvasObject => ({
  id,
  type: 'text',
  content,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 50 },
  rotation: 0,
  style: { color: '#111' },
  layer: 1,
});

describe('canvas collaboration object diff', () => {
  it('creates compact three-day invitation values', () => {
    expect(toCanvasInviteCode('AbCdEfGhIjKlMn')).toBe('ABCDEFGHIJ');
    expect(CANVAS_INVITE_CODE_LENGTH).toBe(10);
    expect(CANVAS_INVITE_VALIDITY_MS).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it('enforces explicit collaboration capabilities and bounded resources', () => {
    expect(canEditCanvas('owner')).toBe(true);
    expect(canEditCanvas('editor')).toBe(true);
    expect(canEditCanvas('commenter')).toBe(false);
    expect(canEditCanvas('viewer')).toBe(false);
    expect(canCommentOnCanvas('commenter')).toBe(true);
    expect(canCommentOnCanvas('viewer')).toBe(false);
    expect(CANVAS_COLLABORATION_MEMBER_LIMIT).toBe(20);
    expect(CANVAS_COLLABORATION_OBJECT_LIMIT).toBe(1000);
    expect(CANVAS_COLLABORATION_VERSION_LIMIT).toBe(50);
    expect(CANVAS_COLLABORATION_COMMENT_MAX_LENGTH).toBe(2000);
  });

  it('migrates legacy members safely without elevating them to owner', () => {
    expect(normalizeCanvasMember({ uid: 'owner', name: 'Owner', joinedAt: 1 }, 'owner').role).toBe('owner');
    expect(normalizeCanvasMember({ uid: 'member', name: 'Member', joinedAt: 1 }, 'owner').role).toBe('editor');
    expect(normalizeCanvasMember({
      uid: 'member',
      name: 'Member',
      joinedAt: 1,
      role: 'viewer',
    }, 'owner').role).toBe('viewer');
  });

  it('sends only changed and new objects', () => {
    const unchanged = object('a', 'One');
    const result = diffCanvasObjects([unchanged, object('b', 'Old')], [unchanged, object('b', 'New'), object('c', 'Three')]);
    expect(result.upserts.map(item => item.id)).toEqual(['b', 'c']);
    expect(result.deletes).toEqual([]);
  });

  it('deletes objects removed from the local board', () => {
    const result = diffCanvasObjects([object('a', 'One'), object('b', 'Two')], [object('b', 'Two')]);
    expect(result.upserts).toEqual([]);
    expect(result.deletes).toEqual(['a']);
  });

  it('merges remote objects without discarding unsaved local edits', () => {
    const base = [object('a', 'One'), object('b', 'Two')];
    const local = [object('a', 'Local'), object('b', 'Two')];
    const remote = [object('a', 'Remote'), object('b', 'Remote two'), object('c', 'New')];
    expect(mergeCanvasObjects(base, local, remote).map(item => [item.id, item.content])).toEqual([
      ['a', 'Local'], ['b', 'Remote two'], ['c', 'New'],
    ]);
  });

  it('creates invitee membership before reading the private board', async () => {
    const firebase = require('@/config/firebase');
    const firestore = require('firebase/firestore');
    firebase.auth.currentUser = {
      uid: 'invitee',
      displayName: 'Invitee',
      email: 'invitee@example.test',
    };
    firestore.collection.mockReturnValue({ path: 'collection' });
    firestore.doc.mockImplementation((...parts: unknown[]) => ({
      id: parts.at(-1) === 'objects' ? 'objects' : String(parts.at(-1) ?? 'generated'),
      path: parts.join('/'),
    }));
    firestore.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          boardId: 'board-1',
          ownerId: 'owner',
          role: 'editor',
          expiresAt: { toMillis: () => Date.now() + 60_000 },
        }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          title: 'Shared board',
          canvasPosition: { x: 0, y: 0 },
          zoomLevel: 1,
          gridEnabled: true,
          ownerId: 'owner',
          active: true,
          createdAt: 1,
          updatedAt: 1,
        }),
      });
    firestore.getDocs.mockResolvedValue({
      size: 0,
      docs: [],
    });
    firestore.setDoc.mockResolvedValue(undefined);

    await expect(joinCanvasCollaboration('INVITECODE')).resolves.toMatchObject({
      collaborationId: 'board-1',
    });
    expect(firestore.getDocs).toHaveBeenCalledTimes(1);
    expect(firestore.setDoc.mock.invocationCallOrder[0]).toBeLessThan(
      firestore.getDocs.mock.invocationCallOrder[0],
    );
  });

  it('stops sharing without deleting the protected Owner membership', async () => {
    const firebase = require('@/config/firebase');
    const firestore = require('firebase/firestore');
    firebase.auth.currentUser = {
      uid: 'owner',
      displayName: 'Owner',
      email: 'owner@example.test',
    };
    firestore.getDoc.mockReset();
    firestore.getDocs.mockReset();
    firestore.setDoc.mockClear();
    firestore.deleteDoc.mockClear();
    firestore.updateDoc.mockResolvedValue(undefined);
    firestore.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ active: true, ownerId: 'owner' }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ uid: 'owner', name: 'Owner', joinedAt: 1, role: 'owner' }),
      });
    firestore.getDocs.mockResolvedValue({ size: 0, docs: [] });

    await expect(stopCanvasCollaboration('board-1')).resolves.toBeUndefined();
    expect(firestore.getDocs).toHaveBeenCalledTimes(2);
    expect(firestore.deleteDoc).not.toHaveBeenCalled();
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ active: false }),
    );
  });
});
