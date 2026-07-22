import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import type { CanvasCollaborationMember, CanvasObject, InfiniteCanvasNote } from '@/types/note';

interface SharedBoardMetadata {
  title: string;
  canvasPosition: InfiniteCanvasNote['canvasPosition'];
  zoomLevel: number;
  gridEnabled: boolean;
  snapEnabled?: boolean;
  documentVersion?: number;
  background?: string;
  canvasTheme?: InfiniteCanvasNote['canvasTheme'];
  folder?: string;
  tags?: string[];
  ownerId: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  lastEditorId?: string;
}

export interface CanvasPresence { uid: string; name: string; activeAt?: Timestamp }
export interface CanvasCollaborationSnapshot {
  note: InfiniteCanvasNote;
  members: CanvasCollaborationMember[];
  online: CanvasPresence[];
  lastEditorId?: string;
}
export interface CanvasObjectDiff { upserts: CanvasObject[]; deletes: string[] }

const stableObject = (value: CanvasObject) => JSON.stringify(value);
const stableObjectOrMissing = (value: CanvasObject | undefined) => value ? stableObject(value) : '__missing__';

export function diffCanvasObjects(previous: CanvasObject[], current: CanvasObject[]): CanvasObjectDiff {
  const before = new Map(previous.map(object => [object.id, object]));
  const after = new Map(current.map(object => [object.id, object]));
  return {
    upserts: current.filter(object => !before.has(object.id) || stableObject(before.get(object.id)!) !== stableObject(object)),
    deletes: previous.filter(object => !after.has(object.id)).map(object => object.id),
  };
}

/** Local unsaved edits win their object while remote edits to untouched objects merge in. */
export function mergeCanvasObjects(base: CanvasObject[], local: CanvasObject[], remote: CanvasObject[]): CanvasObject[] {
  const baseMap = new Map(base.map(object => [object.id, object]));
  const localMap = new Map(local.map(object => [object.id, object]));
  const remoteMap = new Map(remote.map(object => [object.id, object]));
  const ids = new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()]);
  const merged: CanvasObject[] = [];
  ids.forEach(id => {
    const localValue = localMap.get(id);
    const chosen = stableObjectOrMissing(localValue) !== stableObjectOrMissing(baseMap.get(id)) ? localValue : remoteMap.get(id);
    if (chosen) merged.push(chosen);
  });
  return merged.sort((left, right) => left.layer - right.layer);
}

const boardRef = (boardId: string) => doc(db, 'sharedCanvasBoards', boardId);
const objectsRef = (boardId: string) => collection(db, 'sharedCanvasBoards', boardId, 'objects');
const membersRef = (boardId: string) => collection(db, 'sharedCanvasBoards', boardId, 'members');
const presenceRef = (boardId: string) => collection(db, 'sharedCanvasBoards', boardId, 'presence');
const memberRef = (boardId: string, uid: string) => doc(db, 'sharedCanvasBoards', boardId, 'members', uid);

export const CANVAS_INVITE_CODE_LENGTH = 10;
export const CANVAS_INVITE_VALIDITY_MS = 3 * 24 * 60 * 60 * 1000;
export const toCanvasInviteCode = (value: string) => value.replace(/[^a-z0-9]/gi, '').slice(0, CANVAS_INVITE_CODE_LENGTH).toUpperCase();
const inviteId = () => toCanvasInviteCode(doc(collection(db, 'canvasCollaborationInvites')).id);

const toNote = (boardId: string, metadata: SharedBoardMetadata, objects: CanvasObject[]): InfiniteCanvasNote => ({
  id: boardId,
  title: metadata.title,
  objects: [...objects].sort((left, right) => left.layer - right.layer),
  canvasPosition: metadata.canvasPosition,
  zoomLevel: metadata.zoomLevel,
  gridEnabled: metadata.gridEnabled,
  snapEnabled: metadata.snapEnabled,
  documentVersion: metadata.documentVersion,
  background: metadata.background,
  canvasTheme: metadata.canvasTheme,
  folder: metadata.folder,
  tags: metadata.tags ?? [],
  collaborationId: boardId,
  collaborationOwnerId: metadata.ownerId,
  createdAt: metadata.createdAt,
  updatedAt: metadata.updatedAt,
});

const friendlyError = (error: unknown): Error => {
  const raw = (error as { message?: string; code?: string })?.message ?? '';
  const code = (error as { code?: string })?.code ?? '';
  if (code.includes('permission-denied')) return new Error('You do not have access to this shared canvas. Verify your email or ask the owner for a new code.');
  return new Error(raw.replace(/^Firebase:\s*/i, '').replace(/\s*\(firestore\/[\w-]+\)\.?$/i, '') || 'Collaboration is unavailable. Try again.');
};

const requireUser = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before using canvas collaboration.');
  return user;
};

const writeObjectChanges = async (boardId: string, changes: CanvasObjectDiff) => {
  const operations = [...changes.upserts.map(object => ({ kind: 'set' as const, object })), ...changes.deletes.map(id => ({ kind: 'delete' as const, id }))];
  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = writeBatch(db);
    operations.slice(offset, offset + 400).forEach(operation => {
      const target = doc(db, 'sharedCanvasBoards', boardId, 'objects', operation.kind === 'set' ? operation.object.id : operation.id);
      if (operation.kind === 'set') batch.set(target, operation.object); else batch.delete(target);
    });
    await batch.commit();
  }
};

export async function createCanvasCollaboration(note: InfiniteCanvasNote): Promise<{ boardId: string; inviteCode: string }> {
  const user = requireUser();
  const board = doc(collection(db, 'sharedCanvasBoards'));
  const now = Date.now();
  try {
    await setDoc(board, {
      title: note.title,
      canvasPosition: note.canvasPosition,
      zoomLevel: note.zoomLevel,
      gridEnabled: note.gridEnabled,
      snapEnabled: note.snapEnabled ?? true,
      documentVersion: note.documentVersion ?? 1,
      background: note.background ?? null,
      canvasTheme: note.canvasTheme ?? 'system',
      folder: note.folder ?? null,
      tags: note.tags ?? [],
      ownerId: user.uid,
      active: true,
      createdAt: note.createdAt || now,
      updatedAt: now,
      lastEditorId: user.uid,
    });
    await setDoc(memberRef(board.id, user.uid), { uid: user.uid, name: user.displayName || user.email?.split('@')[0] || 'Owner', joinedAt: now, owner: true });
    await writeObjectChanges(board.id, { upserts: note.objects, deletes: [] });
    const code = await createCanvasInvite(board.id);
    return { boardId: board.id, inviteCode: code };
  } catch (error) { throw friendlyError(error); }
}

export async function createCanvasInvite(boardId: string): Promise<string> {
  const user = requireUser();
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = inviteId();
      const target = doc(db, 'canvasCollaborationInvites', code);
      if ((await getDoc(target)).exists()) continue;
      await setDoc(target, { boardId, ownerId: user.uid, expiresAt: Timestamp.fromMillis(Date.now() + CANVAS_INVITE_VALIDITY_MS), createdAt: serverTimestamp() });
      return code;
    }
    throw new Error('Unable to create a unique collaboration code. Try again.');
  } catch (error) { throw friendlyError(error); }
}

export async function joinCanvasCollaboration(inviteCode: string): Promise<InfiniteCanvasNote> {
  const user = requireUser();
  const code = inviteCode.trim().toUpperCase();
  try {
    const invitation = await getDoc(doc(db, 'canvasCollaborationInvites', code));
    if (!invitation.exists()) throw new Error('This invitation is invalid or has expired.');
    const data = invitation.data() as { boardId: string; expiresAt: Timestamp };
    if (!data.expiresAt || data.expiresAt.toMillis() <= Date.now()) throw new Error('This invitation has expired. Ask the owner for a new code.');
    await setDoc(memberRef(data.boardId, user.uid), { uid: user.uid, name: user.displayName || user.email?.split('@')[0] || 'Collaborator', joinedAt: Date.now(), inviteCode: code });
    return await getCollaborativeCanvas(data.boardId);
  } catch (error) { if (error instanceof Error && !('code' in error)) throw error; throw friendlyError(error); }
}

export async function leaveCanvasCollaboration(boardId: string): Promise<void> {
  const user = requireUser();
  try {
    await deleteDoc(doc(db, 'sharedCanvasBoards', boardId, 'presence', user.uid)).catch(() => undefined);
    await deleteDoc(memberRef(boardId, user.uid));
  }
  catch (error) { throw friendlyError(error); }
}

export async function removeCanvasCollaborator(boardId: string, uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'sharedCanvasBoards', boardId, 'presence', uid)).catch(() => undefined);
    await deleteDoc(memberRef(boardId, uid));
  }
  catch (error) { throw friendlyError(error); }
}

export async function stopCanvasCollaboration(boardId: string): Promise<void> {
  requireUser();
  try {
    const [objects, members, presence] = await Promise.all([getDocs(objectsRef(boardId)), getDocs(membersRef(boardId)), getDocs(presenceRef(boardId))]);
    const contentRefs = [...objects.docs, ...presence.docs].map(item => item.ref);
    for (let offset = 0; offset < contentRefs.length; offset += 400) {
      const batch = writeBatch(db);
      contentRefs.slice(offset, offset + 400).forEach(ref => batch.delete(ref));
      await batch.commit();
    }
    await updateDoc(boardRef(boardId), { active: false, updatedAt: Date.now() });
    const memberRefs = members.docs.map(item => item.ref);
    for (let offset = 0; offset < memberRefs.length; offset += 400) {
      const batch = writeBatch(db);
      memberRefs.slice(offset, offset + 400).forEach(ref => batch.delete(ref));
      await batch.commit();
    }
  } catch (error) { throw friendlyError(error); }
}

export async function getCollaborativeCanvas(boardId: string): Promise<InfiniteCanvasNote> {
  const [metadataSnapshot, objectSnapshot] = await Promise.all([getDoc(boardRef(boardId)), getDocs(objectsRef(boardId))]);
  if (!metadataSnapshot.exists() || metadataSnapshot.data().active !== true) throw new Error('This shared canvas is no longer available.');
  return toNote(boardId, metadataSnapshot.data() as SharedBoardMetadata, objectSnapshot.docs.map(item => item.data() as CanvasObject));
}

export async function saveCollaborativeCanvas(boardId: string, note: InfiniteCanvasNote, previousObjects: CanvasObject[]): Promise<void> {
  const user = requireUser();
  try {
    await writeObjectChanges(boardId, diffCanvasObjects(previousObjects, note.objects));
    await updateDoc(boardRef(boardId), { title: note.title, canvasPosition: note.canvasPosition, zoomLevel: note.zoomLevel, gridEnabled: note.gridEnabled, snapEnabled: note.snapEnabled ?? true, documentVersion: note.documentVersion ?? 1, background: note.background ?? null, canvasTheme: note.canvasTheme ?? 'system', folder: note.folder ?? null, tags: note.tags ?? [], updatedAt: note.updatedAt, lastEditorId: user.uid });
  } catch (error) { throw friendlyError(error); }
}

export function subscribeCanvasCollaboration(boardId: string, onChange: (snapshot: CanvasCollaborationSnapshot) => void, onError: (message: string) => void): () => void {
  let metadata: SharedBoardMetadata | null = null;
  let objects: CanvasObject[] | null = null;
  let members: CanvasCollaborationMember[] = [];
  let online: CanvasPresence[] = [];
  const emit = () => { if (metadata && objects) onChange({ note: toNote(boardId, metadata, objects), members, online, lastEditorId: metadata.lastEditorId }); };
  const fail = (error: unknown) => onError(friendlyError(error).message);
  const unsubscribers = [
    onSnapshot(boardRef(boardId), snapshot => { if (!snapshot.exists() || snapshot.data().active !== true) { onError('This shared canvas is no longer available.'); return; } metadata = snapshot.data() as SharedBoardMetadata; emit(); }, fail),
    onSnapshot(objectsRef(boardId), snapshot => { objects = snapshot.docs.map(item => item.data() as CanvasObject); emit(); }, fail),
    onSnapshot(membersRef(boardId), snapshot => { members = snapshot.docs.map(item => item.data() as CanvasCollaborationMember); emit(); }, fail),
    onSnapshot(presenceRef(boardId), snapshot => { const cutoff = Date.now() - 90_000; online = snapshot.docs.map(item => item.data() as CanvasPresence).filter(item => !item.activeAt || item.activeAt.toMillis() >= cutoff); emit(); }, fail),
  ];
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

export async function setCanvasPresence(boardId: string, name: string): Promise<() => Promise<void>> {
  const user = auth.currentUser;
  if (!user) return async () => undefined;
  const target = doc(db, 'sharedCanvasBoards', boardId, 'presence', user.uid);
  const refresh = () => setDoc(target, { uid: user.uid, name, activeAt: serverTimestamp() });
  await refresh();
  const heartbeat = setInterval(() => { void refresh().catch(() => undefined); }, 45_000);
  return async () => { clearInterval(heartbeat); await deleteDoc(target).catch(() => undefined); };
}
