import { CANVAS_INVITE_CODE_LENGTH, CANVAS_INVITE_VALIDITY_MS, diffCanvasObjects, mergeCanvasObjects, toCanvasInviteCode } from '@/services/CanvasCollaborationService';
import type { CanvasObject } from '@/types/note';

jest.mock('@/config/firebase', () => ({
  __esModule: true,
  default: {},
  auth: { currentUser: null },
  db: {},
}));
jest.mock('firebase/functions', () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), deleteDoc: jest.fn(), doc: jest.fn(), getDoc: jest.fn(), getDocs: jest.fn(),
  onSnapshot: jest.fn(), serverTimestamp: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(), writeBatch: jest.fn(),
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
});
