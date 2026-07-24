import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import type {
  CanvasCollaborationActivity,
  CanvasCollaborationActivityType,
  CanvasCollaborationComment,
  CanvasCollaborationMember,
  CanvasCollaborationRole,
  CanvasCollaborationVersion,
  CanvasObject,
  InfiniteCanvasNote,
} from '@/types/note';
import {
  deleteCollaborationAttachment,
  deleteCollaborationAttachments,
  mirrorAttachmentToCollaboration,
} from '@/services/AttachmentService';

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
  memberLimit?: number;
  objectLimit?: number;
}

export interface CanvasPresence {
  uid: string;
  name: string;
  role?: CanvasCollaborationRole;
  cursor?: { x: number; y: number };
  activeAt?: Timestamp;
}
export interface CanvasCollaborationSnapshot {
  note: InfiniteCanvasNote;
  members: CanvasCollaborationMember[];
  online: CanvasPresence[];
  lastEditorId?: string;
}
export interface CanvasObjectDiff { upserts: CanvasObject[]; deletes: string[] }

export const CANVAS_COLLABORATION_MEMBER_LIMIT = 20;
export const CANVAS_COLLABORATION_OBJECT_LIMIT = 1000;
export const CANVAS_COLLABORATION_VERSION_LIMIT = 50;
export const CANVAS_COLLABORATION_COMMENT_LIMIT = 1000;
export const CANVAS_COLLABORATION_COMMENT_MAX_LENGTH = 2000;

export const canEditCanvas = (role: CanvasCollaborationRole) => role === 'owner' || role === 'editor';
export const canCommentOnCanvas = (role: CanvasCollaborationRole) => role !== 'viewer';

export function normalizeCanvasMember(
  value: Partial<CanvasCollaborationMember> & Pick<CanvasCollaborationMember, 'uid' | 'name' | 'joinedAt'>,
  ownerId: string,
): CanvasCollaborationMember {
  return {
    ...value,
    role: value.uid === ownerId ? 'owner' : value.role ?? 'editor',
  };
}

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
const commentsRef = (boardId: string) => collection(db, 'sharedCanvasBoards', boardId, 'comments');
const versionsRef = (boardId: string) => collection(db, 'sharedCanvasBoards', boardId, 'versions');
const activityRef = (boardId: string) => collection(db, 'sharedCanvasBoards', boardId, 'activity');
const memberRef = (boardId: string, uid: string) => doc(db, 'sharedCanvasBoards', boardId, 'members', uid);

async function withSharedAttachmentUrls(uid: string, boardId: string, objects: CanvasObject[]): Promise<CanvasObject[]> {
  return Promise.all(objects.map(async object => {
    if (object.type !== 'image' || !object.attachmentId || object.attachmentRemoteUrl) return object;
    const shared = await mirrorAttachmentToCollaboration(uid, object.attachmentId, boardId);
    return {
      ...object,
      attachmentRemoteUrl: shared.remoteUrl,
      attachmentThumbnailUrl: shared.thumbnailRemoteUrl,
      updatedAt: Date.now(),
    };
  }));
}

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

const userName = (user: ReturnType<typeof requireUser>) => (
  user.displayName || user.email?.split('@')[0] || 'Collaborator'
);

async function requireBoardRole(
  boardId: string,
  allowed: CanvasCollaborationRole[],
): Promise<{ member: CanvasCollaborationMember; metadata: SharedBoardMetadata }> {
  const user = requireUser();
  const [boardSnapshot, memberSnapshot] = await Promise.all([
    getDoc(boardRef(boardId)),
    getDoc(memberRef(boardId, user.uid)),
  ]);
  if (!boardSnapshot.exists() || boardSnapshot.data().active !== true || !memberSnapshot.exists()) {
    throw new Error('You do not have access to this shared canvas.');
  }
  const metadata = boardSnapshot.data() as SharedBoardMetadata;
  const member = normalizeCanvasMember(
    memberSnapshot.data() as CanvasCollaborationMember,
    metadata.ownerId,
  );
  if (!allowed.includes(member.role)) {
    throw new Error(
      member.role === 'viewer'
        ? 'Viewers cannot change this shared canvas.'
        : 'Your collaboration role does not allow this action.',
    );
  }
  return { member, metadata };
}

async function recordActivity(
  boardId: string,
  type: CanvasCollaborationActivityType,
  details: Pick<CanvasCollaborationActivity, 'targetId' | 'targetName' | 'detail'> = {},
): Promise<void> {
  const user = requireUser();
  const target = doc(activityRef(boardId));
  await setDoc(target, {
    id: target.id,
    type,
    actorId: user.uid,
    actorName: userName(user),
    createdAt: Date.now(),
    ...details,
  });
}

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

const rollbackCanvasCollaborationCreation = async (boardId: string, uid: string) => {
  await deleteCollaborationAttachments(boardId).catch(() => undefined);
  const objectSnapshot = await getDocs(objectsRef(boardId)).catch(() => null);
  const objectRefs = objectSnapshot?.docs.map(item => item.ref) ?? [];
  for (let offset = 0; offset < objectRefs.length; offset += 400) {
    const batch = writeBatch(db);
    objectRefs.slice(offset, offset + 400).forEach(ref => batch.delete(ref));
    await batch.commit().catch(() => undefined);
  }
  await updateDoc(boardRef(boardId), { active: false, updatedAt: Date.now() }).catch(() => undefined);
  await deleteDoc(memberRef(boardId, uid)).catch(() => undefined);
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
      memberLimit: CANVAS_COLLABORATION_MEMBER_LIMIT,
      objectLimit: CANVAS_COLLABORATION_OBJECT_LIMIT,
    });
    await setDoc(memberRef(board.id, user.uid), {
      uid: user.uid,
      name: userName(user),
      joinedAt: now,
      role: 'owner',
    });
    const sharedObjects = await withSharedAttachmentUrls(user.uid, board.id, note.objects);
    if (sharedObjects.length > CANVAS_COLLABORATION_OBJECT_LIMIT) {
      throw new Error(`A shared canvas supports up to ${CANVAS_COLLABORATION_OBJECT_LIMIT} objects.`);
    }
    await writeObjectChanges(board.id, { upserts: sharedObjects, deletes: [] });
    await recordActivity(board.id, 'board-created');
    const code = await createCanvasInvite(board.id);
    return { boardId: board.id, inviteCode: code };
  } catch (error) {
    await rollbackCanvasCollaborationCreation(board.id, user.uid);
    throw friendlyError(error);
  }
}

export async function createCanvasInvite(
  boardId: string,
  role: Exclude<CanvasCollaborationRole, 'owner'> = 'editor',
): Promise<string> {
  const user = requireUser();
  try {
    await requireBoardRole(boardId, ['owner']);
    const members = await getDocs(membersRef(boardId));
    if (members.size >= CANVAS_COLLABORATION_MEMBER_LIMIT) {
      throw new Error(
        `This canvas has reached its ${CANVAS_COLLABORATION_MEMBER_LIMIT}-member limit.`,
      );
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = inviteId();
      const target = doc(db, 'canvasCollaborationInvites', code);
      if ((await getDoc(target)).exists()) continue;
      await setDoc(target, {
        boardId,
        ownerId: user.uid,
        role,
        expiresAt: Timestamp.fromMillis(Date.now() + CANVAS_INVITE_VALIDITY_MS),
        createdAt: serverTimestamp(),
      });
      await recordActivity(boardId, 'invite-created', { detail: `${role} invite` });
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
    const data = invitation.data() as {
      boardId: string;
      ownerId: string;
      role?: Exclude<CanvasCollaborationRole, 'owner'>;
      expiresAt: Timestamp;
    };
    if (!data.expiresAt || data.expiresAt.toMillis() <= Date.now()) throw new Error('This invitation has expired. Ask the owner for a new code.');
    // The invitee cannot read private board metadata or enumerate members until
    // this capability-code write creates their membership. Loading those
    // collections before setDoc causes the legitimate join to be denied.
    await setDoc(memberRef(data.boardId, user.uid), {
      uid: user.uid,
      name: userName(user),
      joinedAt: Date.now(),
      role: data.role ?? 'editor',
      invitedBy: data.ownerId,
      inviteCode: code,
    });
    await recordActivity(data.boardId, 'member-joined', {
      targetId: user.uid,
      targetName: userName(user),
      detail: data.role ?? 'editor',
    });
    return await getCollaborativeCanvas(data.boardId);
  } catch (error) { if (error instanceof Error && !('code' in error)) throw error; throw friendlyError(error); }
}

export async function leaveCanvasCollaboration(boardId: string): Promise<void> {
  const user = requireUser();
  try {
    const { member } = await requireBoardRole(boardId, ['editor', 'commenter', 'viewer']);
    await recordActivity(boardId, 'member-left', {
      targetId: user.uid,
      targetName: member.name,
    });
    await deleteDoc(doc(db, 'sharedCanvasBoards', boardId, 'presence', user.uid)).catch(() => undefined);
    await deleteDoc(memberRef(boardId, user.uid));
  }
  catch (error) { throw friendlyError(error); }
}

export async function removeCanvasCollaborator(boardId: string, uid: string): Promise<void> {
  try {
    await requireBoardRole(boardId, ['owner']);
    const targetSnapshot = await getDoc(memberRef(boardId, uid));
    if (!targetSnapshot.exists()) return;
    const target = targetSnapshot.data() as CanvasCollaborationMember;
    if (target.role === 'owner') throw new Error('Transfer ownership before removing the owner.');
    await recordActivity(boardId, 'member-removed', {
      targetId: uid,
      targetName: target.name,
    });
    await deleteDoc(doc(db, 'sharedCanvasBoards', boardId, 'presence', uid)).catch(() => undefined);
    await deleteDoc(memberRef(boardId, uid));
  }
  catch (error) { throw friendlyError(error); }
}

export async function stopCanvasCollaboration(boardId: string): Promise<void> {
  try {
    await requireBoardRole(boardId, ['owner']);
    await recordActivity(boardId, 'sharing-stopped');
    const [objects, presence] = await Promise.all([
      getDocs(objectsRef(boardId)),
      getDocs(presenceRef(boardId)),
    ]);
    const contentRefs = [...objects.docs, ...presence.docs].map(item => item.ref);
    for (let offset = 0; offset < contentRefs.length; offset += 400) {
      const batch = writeBatch(db);
      contentRefs.slice(offset, offset + 400).forEach(ref => batch.delete(ref));
      await batch.commit();
    }
    await deleteCollaborationAttachments(boardId).catch(() => undefined);
    // Inactive board metadata is the durable revocation boundary. Membership
    // records remain for audit/recovery; deleting the Owner membership is both
    // forbidden by Rules and would turn a successful stop into a partial error.
    await updateDoc(boardRef(boardId), { active: false, updatedAt: Date.now() });
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
    await requireBoardRole(boardId, ['owner', 'editor']);
    if (note.objects.length > CANVAS_COLLABORATION_OBJECT_LIMIT) {
      throw new Error(`A shared canvas supports up to ${CANVAS_COLLABORATION_OBJECT_LIMIT} objects.`);
    }
    const sharedObjects = await withSharedAttachmentUrls(user.uid, boardId, note.objects);
    const changes = diffCanvasObjects(previousObjects, sharedObjects);
    await writeObjectChanges(boardId, changes);
    const currentIds = new Set(sharedObjects.map(object => object.id));
    const removedAttachments = previousObjects
      .filter(object => !currentIds.has(object.id) && object.attachmentId)
      .map(object => object.attachmentId!);
    await Promise.all(removedAttachments.map(id => deleteCollaborationAttachment(boardId, id).catch(() => undefined)));
    await updateDoc(boardRef(boardId), { title: note.title, canvasPosition: note.canvasPosition, zoomLevel: note.zoomLevel, gridEnabled: note.gridEnabled, snapEnabled: note.snapEnabled ?? true, documentVersion: note.documentVersion ?? 1, background: note.background ?? null, canvasTheme: note.canvasTheme ?? 'system', folder: note.folder ?? null, tags: note.tags ?? [], updatedAt: note.updatedAt, lastEditorId: user.uid });
  } catch (error) { throw friendlyError(error); }
}

export async function updateCanvasCollaboratorRole(
  boardId: string,
  uid: string,
  role: Exclude<CanvasCollaborationRole, 'owner'>,
): Promise<void> {
  try {
    await requireBoardRole(boardId, ['owner']);
    const target = await getDoc(memberRef(boardId, uid));
    if (!target.exists()) throw new Error('That collaborator is no longer a member.');
    const member = target.data() as CanvasCollaborationMember;
    if (member.role === 'owner') throw new Error('Transfer ownership instead of changing the owner role.');
    await updateDoc(memberRef(boardId, uid), { role });
    await recordActivity(boardId, 'role-changed', {
      targetId: uid,
      targetName: member.name,
      detail: role,
    });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) throw error;
    throw friendlyError(error);
  }
}

export async function transferCanvasOwnership(boardId: string, uid: string): Promise<void> {
  const user = requireUser();
  try {
    const { member: owner } = await requireBoardRole(boardId, ['owner']);
    if (uid === user.uid) return;
    const targetSnapshot = await getDoc(memberRef(boardId, uid));
    if (!targetSnapshot.exists()) throw new Error('That collaborator is no longer a member.');
    const target = targetSnapshot.data() as CanvasCollaborationMember;
    const batch = writeBatch(db);
    batch.update(boardRef(boardId), {
      ownerId: uid,
      updatedAt: Date.now(),
      lastEditorId: user.uid,
    });
    batch.update(memberRef(boardId, user.uid), { role: 'editor' });
    batch.update(memberRef(boardId, uid), { role: 'owner' });
    await batch.commit();
    await recordActivity(boardId, 'ownership-transferred', {
      targetId: uid,
      targetName: target.name,
      detail: `${owner.name} transferred ownership`,
    });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) throw error;
    throw friendlyError(error);
  }
}

export async function addCanvasComment(
  boardId: string,
  body: string,
  options: { parentId?: string; objectId?: string; mentions?: string[] } = {},
): Promise<string> {
  const user = requireUser();
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Write a comment first.');
  if (trimmed.length > CANVAS_COLLABORATION_COMMENT_MAX_LENGTH) {
    throw new Error(`Comments can contain up to ${CANVAS_COLLABORATION_COMMENT_MAX_LENGTH} characters.`);
  }
  try {
    await requireBoardRole(boardId, ['owner', 'editor', 'commenter']);
    const existing = await getDocs(commentsRef(boardId));
    if (existing.size >= CANVAS_COLLABORATION_COMMENT_LIMIT) {
      throw new Error(`This canvas has reached its ${CANVAS_COLLABORATION_COMMENT_LIMIT}-comment limit.`);
    }
    if (options.parentId) {
      const parent = await getDoc(doc(db, 'sharedCanvasBoards', boardId, 'comments', options.parentId));
      if (!parent.exists()) throw new Error('The comment you are replying to no longer exists.');
    }
    const target = doc(commentsRef(boardId));
    const now = Date.now();
    await setDoc(target, {
      id: target.id,
      authorId: user.uid,
      authorName: userName(user),
      body: trimmed,
      mentions: [...new Set(options.mentions ?? [])].slice(0, CANVAS_COLLABORATION_MEMBER_LIMIT),
      ...(options.parentId ? { parentId: options.parentId } : {}),
      ...(options.objectId ? { objectId: options.objectId } : {}),
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(boardId, 'comment-added', { targetId: target.id });
    return target.id;
  } catch (error) {
    if (error instanceof Error && !('code' in error)) throw error;
    throw friendlyError(error);
  }
}

export async function resolveCanvasComment(
  boardId: string,
  commentId: string,
  resolved: boolean,
): Promise<void> {
  const user = requireUser();
  try {
    await requireBoardRole(boardId, ['owner', 'editor', 'commenter']);
    await updateDoc(doc(db, 'sharedCanvasBoards', boardId, 'comments', commentId), resolved
      ? { resolvedAt: Date.now(), resolvedBy: user.uid, updatedAt: Date.now() }
      : { resolvedAt: null, resolvedBy: null, updatedAt: Date.now() });
    await recordActivity(boardId, 'comment-resolved', {
      targetId: commentId,
      detail: resolved ? 'resolved' : 'reopened',
    });
  } catch (error) {
    throw friendlyError(error);
  }
}

const versionObjectsRef = (boardId: string, versionId: string) => (
  collection(db, 'sharedCanvasBoards', boardId, 'versions', versionId, 'objects')
);

export async function createCanvasVersion(boardId: string, label?: string): Promise<string> {
  const user = requireUser();
  try {
    const { metadata } = await requireBoardRole(boardId, ['owner', 'editor']);
    const objects = await getDocs(objectsRef(boardId));
    const target = doc(versionsRef(boardId));
    const createdAt = Date.now();
    await setDoc(target, {
      id: target.id,
      label: label?.trim().slice(0, 80) || 'Restore point',
      createdAt,
      createdBy: user.uid,
      createdByName: userName(user),
      objectCount: objects.size,
      board: {
        title: metadata.title,
        canvasPosition: metadata.canvasPosition,
        zoomLevel: metadata.zoomLevel,
        gridEnabled: metadata.gridEnabled,
        snapEnabled: metadata.snapEnabled ?? true,
        documentVersion: metadata.documentVersion ?? 1,
        background: metadata.background ?? null,
        canvasTheme: metadata.canvasTheme ?? 'system',
      },
    });
    const values = objects.docs.map(item => item.data() as CanvasObject);
    await writeVersionObjects(boardId, target.id, values);
    await pruneCanvasVersions(boardId);
    await recordActivity(boardId, 'version-created', { targetId: target.id });
    return target.id;
  } catch (error) {
    if (error instanceof Error && !('code' in error)) throw error;
    throw friendlyError(error);
  }
}

async function writeVersionObjects(
  boardId: string,
  versionId: string,
  objects: CanvasObject[],
): Promise<void> {
  for (let offset = 0; offset < objects.length; offset += 400) {
    const batch = writeBatch(db);
    objects.slice(offset, offset + 400).forEach(object => {
      batch.set(doc(db, 'sharedCanvasBoards', boardId, 'versions', versionId, 'objects', object.id), object);
    });
    await batch.commit();
  }
}

async function deleteCanvasVersion(boardId: string, versionId: string): Promise<void> {
  const objects = await getDocs(versionObjectsRef(boardId, versionId));
  for (let offset = 0; offset < objects.docs.length; offset += 400) {
    const batch = writeBatch(db);
    objects.docs.slice(offset, offset + 400).forEach(item => batch.delete(item.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'sharedCanvasBoards', boardId, 'versions', versionId));
}

async function pruneCanvasVersions(boardId: string): Promise<void> {
  const versions = await getDocs(query(versionsRef(boardId), orderBy('createdAt', 'desc')));
  await Promise.all(
    versions.docs
      .slice(CANVAS_COLLABORATION_VERSION_LIMIT)
      .map(item => deleteCanvasVersion(boardId, item.id)),
  );
}

export async function restoreCanvasVersion(boardId: string, versionId: string): Promise<void> {
  const user = requireUser();
  try {
    await requireBoardRole(boardId, ['owner', 'editor']);
    const [version, savedObjects, currentObjects] = await Promise.all([
      getDoc(doc(db, 'sharedCanvasBoards', boardId, 'versions', versionId)),
      getDocs(versionObjectsRef(boardId, versionId)),
      getDocs(objectsRef(boardId)),
    ]);
    if (!version.exists()) throw new Error('That restore point is no longer available.');
    const data = version.data() as { board?: Partial<SharedBoardMetadata> };
    const restored = savedObjects.docs.map(item => item.data() as CanvasObject);
    const current = currentObjects.docs.map(item => item.data() as CanvasObject);
    await writeObjectChanges(boardId, diffCanvasObjects(current, restored));
    await updateDoc(boardRef(boardId), {
      ...(data.board ?? {}),
      updatedAt: Date.now(),
      lastEditorId: user.uid,
    });
    await recordActivity(boardId, 'version-restored', { targetId: versionId });
  } catch (error) {
    if (error instanceof Error && !('code' in error)) throw error;
    throw friendlyError(error);
  }
}

export function subscribeCanvasCollaborationDetails(
  boardId: string,
  onChange: (value: {
    comments: CanvasCollaborationComment[];
    versions: CanvasCollaborationVersion[];
    activity: CanvasCollaborationActivity[];
  }) => void,
  onError: (message: string) => void,
): () => void {
  let comments: CanvasCollaborationComment[] = [];
  let versions: CanvasCollaborationVersion[] = [];
  let activity: CanvasCollaborationActivity[] = [];
  const emit = () => onChange({ comments, versions, activity });
  const fail = (error: unknown) => onError(friendlyError(error).message);
  const unsubscribers = [
    onSnapshot(query(commentsRef(boardId), orderBy('createdAt', 'asc'), limit(CANVAS_COLLABORATION_COMMENT_LIMIT)), snapshot => {
      comments = snapshot.docs.map(item => item.data() as CanvasCollaborationComment);
      emit();
    }, fail),
    onSnapshot(query(versionsRef(boardId), orderBy('createdAt', 'desc'), limit(CANVAS_COLLABORATION_VERSION_LIMIT)), snapshot => {
      versions = snapshot.docs.map(item => item.data() as CanvasCollaborationVersion);
      emit();
    }, fail),
    onSnapshot(query(activityRef(boardId), orderBy('createdAt', 'desc'), limit(100)), snapshot => {
      activity = snapshot.docs.map(item => item.data() as CanvasCollaborationActivity);
      emit();
    }, fail),
  ];
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
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
    onSnapshot(membersRef(boardId), snapshot => {
      members = snapshot.docs.map(item => normalizeCanvasMember(
        item.data() as CanvasCollaborationMember,
        metadata?.ownerId ?? '',
      ));
      emit();
    }, fail),
    onSnapshot(presenceRef(boardId), snapshot => { const cutoff = Date.now() - 90_000; online = snapshot.docs.map(item => item.data() as CanvasPresence).filter(item => !item.activeAt || item.activeAt.toMillis() >= cutoff); emit(); }, fail),
  ];
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

export async function setCanvasPresence(boardId: string, name: string): Promise<() => Promise<void>> {
  const user = auth.currentUser;
  if (!user) return async () => undefined;
  const target = doc(db, 'sharedCanvasBoards', boardId, 'presence', user.uid);
  const member = await getDoc(memberRef(boardId, user.uid));
  const role = member.exists()
    ? (member.data() as CanvasCollaborationMember).role ?? 'editor'
    : 'viewer';
  const refresh = () => setDoc(target, { uid: user.uid, name, role, activeAt: serverTimestamp() });
  await refresh();
  const heartbeat = setInterval(() => { void refresh().catch(() => undefined); }, 45_000);
  return async () => { clearInterval(heartbeat); await deleteDoc(target).catch(() => undefined); };
}

export async function updateCanvasPresenceCursor(
  boardId: string,
  cursor: { x: number; y: number },
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await updateDoc(doc(db, 'sharedCanvasBoards', boardId, 'presence', user.uid), {
    cursor,
    activeAt: serverTimestamp(),
  });
}
