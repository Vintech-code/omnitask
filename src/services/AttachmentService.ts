import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import {
  collection,
  doc,
  onSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytesResumable,
  type UploadTask,
} from 'firebase/storage';

import { db, firebaseStorage } from '@/config/firebase';
import {
  getPendingMutationPaths,
  queueCloudDelete,
  queueCloudSet,
  recordCloudSnapshot,
  reportSyncDiagnostic,
  syncRevision,
  withoutSyncMetadata,
} from '@/services/OfflineSyncService';
import { KEYS, Storage } from '@/services/StorageService';
import {
  ATTACHMENT_LIMITS,
  ATTACHMENT_SCHEMA_VERSION,
  type Attachment,
  type AttachmentImport,
} from '@/types/attachment';
import type { InfiniteCanvasNote, Note } from '@/types/note';

type Listener = (attachments: Attachment[]) => void;

let activeUid: string | null = null;
let records: Attachment[] = [];
let cloudUnsubscribe: (() => void) | null = null;
const listeners = new Set<Listener>();
const uploadTasks = new Map<string, UploadTask>();
const cancelledIds = new Set<string>();
const collaborationUrls = new Map<string, { remoteUrl: string; thumbnailRemoteUrl?: string }>();

const attachmentCollection = (uid: string) => collection(db, 'users', uid, 'attachments');
const attachmentPath = (uid: string, id: string) => ['users', uid, 'attachments', id];
const safeSegment = (value: string) => value.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80) || 'attachment';
const extensionForMime = (mime: string) => mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'image/heic' || mime === 'image/heif' ? 'heic' : 'jpg';
const normalizedMime = (value?: string | null) => {
  const mime = value?.toLowerCase();
  if (!mime) return 'image/jpeg';
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mime)) {
    throw new Error('Unsupported image type. Choose a JPEG, PNG, WebP, HEIC, or HEIF image.');
  }
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
};
const attachmentId = () => `attachment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const clean = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));

export function stableLegacyAttachmentId(parentId: string, uri: string, index: number): string {
  let hash = 2166136261;
  for (const character of `${parentId}:${index}:${uri}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `legacy_attachment_${(hash >>> 0).toString(36)}`;
}

function cloudRecord(attachment: Attachment): Record<string, unknown> {
  const {
    localUri: _localUri,
    thumbnailLocalUri: _thumbnailLocalUri,
    lastError: _lastError,
    ...cloud
  } = attachment;
  return clean(cloud as unknown as Record<string, unknown>);
}

function emit() {
  const snapshot = [...records].sort((left, right) => right.updatedAt - left.updatedAt);
  listeners.forEach(listener => listener(snapshot));
}

async function persist(uid: string, next: Attachment[], uploadMetadata = true) {
  if (activeUid !== uid) activeUid = uid;
  records = [...next].sort((left, right) => right.updatedAt - left.updatedAt);
  await Storage.setForUser(KEYS.ATTACHMENTS, uid, records);
  emit();
  if (uploadMetadata) {
    records.forEach(attachment => {
      void queueCloudSet(uid, attachmentPath(uid, attachment.id), cloudRecord(attachment));
    });
  }
}

async function replaceRecord(uid: string, attachment: Attachment, uploadMetadata = true) {
  const exists = records.some(item => item.id === attachment.id);
  await persist(uid, exists
    ? records.map(item => item.id === attachment.id ? attachment : item)
    : [attachment, ...records], false);
  if (uploadMetadata) {
    await queueCloudSet(uid, attachmentPath(uid, attachment.id), cloudRecord(attachment));
  }
}

async function ensureLoaded(uid: string) {
  if (activeUid === uid) return;
  activeUid = uid;
  records = await Storage.getForUser<Attachment[]>(KEYS.ATTACHMENTS, uid) ?? [];
  emit();
}

function managedDirectory(uid: string) {
  if (!FileSystem.documentDirectory) throw new Error('Managed attachment storage is unavailable on this device.');
  return `${FileSystem.documentDirectory}attachments/${safeSegment(uid)}/`;
}

async function exists(uri?: string): Promise<boolean> {
  if (!uri) return false;
  if (/^https?:/i.test(uri)) return true;
  return (await FileSystem.getInfoAsync(uri)).exists;
}

async function copyIntoManagedStorage(uid: string, source: string, id: string, extension: string) {
  if (/^https?:/i.test(source)) return source;
  const directory = managedDirectory(uid);
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${safeSegment(id)}.${extension}`;
  if (source !== destination) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    await FileSystem.copyAsync({ from: source, to: destination });
  }
  return destination;
}

async function makeThumbnail(uid: string, source: string, id: string): Promise<string | undefined> {
  try {
    const result = await manipulateAsync(
      source,
      [{ resize: { width: 360 } }],
      { compress: 0.68, format: SaveFormat.JPEG },
    );
    return copyIntoManagedStorage(uid, result.uri, `${id}_thumb`, 'jpg');
  } catch {
    return undefined;
  }
}

function uploadBlob(storagePath: string, uri: string, mimeType: string, taskKey: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(uri);
      if (!response.ok && /^https?:/i.test(uri)) throw new Error(`Could not read image (${response.status}).`);
      const blob = await response.blob();
      const task = uploadBytesResumable(ref(firebaseStorage, storagePath), blob, { contentType: mimeType });
      uploadTasks.set(taskKey, task);
      task.on('state_changed', undefined, reject, async () => {
        uploadTasks.delete(taskKey);
        resolve(await getDownloadURL(task.snapshot.ref));
      });
    } catch (error) {
      uploadTasks.delete(taskKey);
      reject(error);
    }
  });
}

function friendlyUploadError(error: unknown) {
  const code = (error as { code?: string }).code ?? '';
  if (code.includes('bucket-not-found') || code.includes('storage/unknown')) {
    return 'Firebase Storage is not available for this project yet. Enable Storage and retry.';
  }
  if (code.includes('unauthorized')) return 'You do not have permission to upload this attachment.';
  if (code.includes('canceled')) return 'Upload cancelled.';
  return (error as { message?: string }).message?.replace(/^Firebase:\s*/i, '') || 'Upload failed. Check your connection and retry.';
}

export function subscribeAttachmentRecords(listener: Listener): () => void {
  listeners.add(listener);
  listener([...records]);
  return () => listeners.delete(listener);
}

export function currentAttachments(): Attachment[] {
  return [...records];
}

export function attachmentById(id?: string): Attachment | undefined {
  return id ? records.find(item => item.id === id) : undefined;
}

export function attachmentDisplayUri(attachment?: Attachment, thumbnail = false): string | undefined {
  if (!attachment) return undefined;
  if (thumbnail) return attachment.thumbnailLocalUri ?? attachment.thumbnailRemoteUrl ?? attachment.localUri ?? attachment.remoteUrl;
  return attachment.localUri ?? attachment.remoteUrl ?? attachment.thumbnailLocalUri ?? attachment.thumbnailRemoteUrl;
}

export async function startAttachmentSession(uid: string): Promise<() => void> {
  cloudUnsubscribe?.();
  cloudUnsubscribe = null;
  await ensureLoaded(uid);
  cloudUnsubscribe = onSnapshot(attachmentCollection(uid), async (snapshot: QuerySnapshot) => {
    if (activeUid !== uid) return;
    const pendingPaths = await getPendingMutationPaths(uid);
    await Promise.all(snapshot.docs.map(item =>
      recordCloudSnapshot(uid, attachmentPath(uid, item.id), item.data())
    ));
    const cloud = snapshot.docs
      .map(item => withoutSyncMetadata<Attachment>(item.data()))
      .filter(item => !pendingPaths.has(attachmentPath(uid, item.id).join('/')));
    const merged = new Map(cloud.map(item => [item.id, item]));
    records.forEach(local => {
      const remote = merged.get(local.id);
      const path = attachmentPath(uid, local.id).join('/');
      const rawRemote = snapshot.docs.find(item => item.id === local.id)?.data();
      const keepLocal = pendingPaths.has(path)
        || !remote
        || syncRevision(rawRemote) === 0 && local.updatedAt > remote.updatedAt;
      if (keepLocal) {
        merged.set(local.id, local);
        if (!pendingPaths.has(path)) {
          void queueCloudSet(uid, attachmentPath(uid, local.id), cloudRecord(local));
        }
      } else if (local.localUri || local.thumbnailLocalUri) {
        merged.set(local.id, { ...remote, localUri: local.localUri, thumbnailLocalUri: local.thumbnailLocalUri });
      }
    });
    records = [...merged.values()];
    await Storage.setForUser(KEYS.ATTACHMENTS, uid, records);
    emit();
    void retryPendingAttachments(uid);
  }, error => {
    void reportSyncDiagnostic(uid, {
      path: `users/${uid}/attachments`,
      severity: 'error',
      code: 'firestore/attachments-listen-failed',
      message: error.message || 'Attachment metadata could not refresh from the cloud.',
    });
  });
  void retryPendingAttachments(uid);
  return () => {
    cloudUnsubscribe?.();
    cloudUnsubscribe = null;
    if (activeUid === uid) {
      activeUid = null;
      records = [];
      emit();
    }
  };
}

export async function importAttachment(uid: string, input: AttachmentImport): Promise<Attachment> {
  await ensureLoaded(uid);
  const id = input.id ?? attachmentId();
  const existing = records.find(item => item.id === id);
  if (existing) {
    if (existing.uploadState === 'failed' || existing.uploadState === 'pending') void uploadAttachment(uid, id);
    return existing;
  }
  const parentCount = records.filter(item => item.parentId === input.parentId && item.purpose === input.purpose && item.uploadState !== 'delete-pending').length;
  const maxCount = input.purpose === 'note' ? ATTACHMENT_LIMITS.noteMaxCount : input.purpose === 'canvas' ? ATTACHMENT_LIMITS.canvasMaxCount : 1;
  if (input.purpose !== 'profile' && parentCount >= maxCount) throw new Error(`${input.purpose === 'canvas' ? 'Canvas' : 'Note'} attachment limit reached.`);
  const mimeType = normalizedMime(input.mimeType);
  const extension = extensionForMime(mimeType);
  const localUri = await copyIntoManagedStorage(uid, input.uri, id, extension);
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  const byteSize = input.fileSize ?? (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0);
  const maxBytes = input.purpose === 'profile' ? ATTACHMENT_LIMITS.profileMaxBytes : ATTACHMENT_LIMITS.maxBytes;
  if (byteSize > maxBytes) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
    throw new Error(`Image is too large. Choose one under ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
  const thumbnailLocalUri = await makeThumbnail(uid, localUri, id);
  const now = Date.now();
  const basePath = `users/${uid}/attachments/${id}`;
  const attachment: Attachment = {
    id,
    ownerId: uid,
    purpose: input.purpose,
    parentId: input.parentId,
    scope: 'user',
    localUri,
    thumbnailLocalUri,
    remotePath: `${basePath}/original.${extension}`,
    thumbnailRemotePath: thumbnailLocalUri ? `${basePath}/thumbnail.jpg` : undefined,
    mimeType,
    byteSize,
    width: input.width,
    height: input.height,
    uploadState: 'pending',
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
    version: ATTACHMENT_SCHEMA_VERSION,
  };
  await replaceRecord(uid, attachment);
  void uploadAttachment(uid, id);
  return attachment;
}

export async function migrateLegacyNoteAttachments(
  uid: string,
  notes: Note[],
): Promise<{ notes: Note[]; changedIds: string[] }> {
  const changedIds: string[] = [];
  const migrated: Note[] = [];
  for (const note of notes) {
    if (!note.images?.length || (note.attachmentIds?.length ?? 0) >= note.images.length) {
      migrated.push(note);
      continue;
    }
    const attachmentIds = [...(note.attachmentIds ?? [])];
    for (let index = attachmentIds.length; index < note.images.length; index += 1) {
      const uri = note.images[index];
      if (!uri) continue;
      try {
        const attachment = await importAttachment(uid, {
          id: stableLegacyAttachmentId(note.id, uri, index),
          uri,
          purpose: 'note',
          parentId: note.id,
        });
        if (!attachmentIds.includes(attachment.id)) attachmentIds.push(attachment.id);
      } catch {
        // Keep the legacy URI untouched. A later session can retry migration.
      }
    }
    if (attachmentIds.length !== (note.attachmentIds?.length ?? 0)) {
      changedIds.push(note.id);
      migrated.push({ ...note, attachmentIds, updatedAt: Date.now() });
    } else {
      migrated.push(note);
    }
  }
  return { notes: migrated, changedIds };
}

export async function migrateLegacyCanvasAttachments(
  uid: string,
  notes: InfiniteCanvasNote[],
): Promise<{ notes: InfiniteCanvasNote[]; changedIds: string[] }> {
  const changedIds: string[] = [];
  const migrated: InfiniteCanvasNote[] = [];
  for (const note of notes) {
    let changed = false;
    const objects: InfiniteCanvasNote['objects'] = [];
    for (let index = 0; index < note.objects.length; index += 1) {
      const object = note.objects[index];
      if (object.type !== 'image' || !object.imageUri || object.attachmentId) {
        objects.push(object);
        continue;
      }
      try {
        const attachment = await importAttachment(uid, {
          id: stableLegacyAttachmentId(note.id, object.imageUri, index),
          uri: object.imageUri,
          purpose: 'canvas',
          parentId: note.id,
        });
        objects.push({ ...object, attachmentId: attachment.id, updatedAt: Date.now() });
        changed = true;
      } catch {
        objects.push(object);
      }
    }
    if (changed) {
      changedIds.push(note.id);
      migrated.push({ ...note, objects, updatedAt: Date.now() });
    } else {
      migrated.push(note);
    }
  }
  return { notes: migrated, changedIds };
}

export async function uploadAttachment(uid: string, id: string): Promise<Attachment> {
  await ensureLoaded(uid);
  const attachment = records.find(item => item.id === id);
  if (!attachment) throw new Error('Attachment no longer exists.');
  if (attachment.uploadState === 'uploaded' && attachment.remoteUrl) return attachment;
  if (uploadTasks.has(id)) return attachment;
  if (!await exists(attachment.localUri)) {
    const failed = { ...attachment, uploadState: 'failed' as const, lastError: 'The local image is no longer available.', updatedAt: Date.now() };
    await replaceRecord(uid, failed);
    return failed;
  }
  cancelledIds.delete(id);
  const uploading = { ...attachment, uploadState: 'uploading' as const, lastError: undefined, updatedAt: Date.now() };
  await replaceRecord(uid, uploading);
  try {
    const remoteUrl = await uploadBlob(uploading.remotePath, uploading.localUri!, uploading.mimeType, id);
    if (cancelledIds.has(id)) throw Object.assign(new Error('Upload cancelled.'), { code: 'storage/canceled' });
    const thumbnailRemoteUrl = uploading.thumbnailLocalUri && uploading.thumbnailRemotePath
      ? await uploadBlob(uploading.thumbnailRemotePath, uploading.thumbnailLocalUri, 'image/jpeg', `${id}:thumbnail`)
      : undefined;
    const completed: Attachment = {
      ...uploading,
      remoteUrl,
      thumbnailRemoteUrl,
      uploadState: 'uploaded',
      retryCount: uploading.retryCount,
      uploadedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await replaceRecord(uid, completed);
    return completed;
  } catch (error) {
    const cancelled = cancelledIds.has(id) || (error as { code?: string }).code?.includes('canceled');
    const failed: Attachment = {
      ...uploading,
      uploadState: cancelled ? 'cancelled' : 'failed',
      retryCount: uploading.retryCount + (cancelled ? 0 : 1),
      lastError: friendlyUploadError(error),
      updatedAt: Date.now(),
    };
    await replaceRecord(uid, failed);
    return failed;
  } finally {
    uploadTasks.delete(id);
    uploadTasks.delete(`${id}:thumbnail`);
  }
}

export async function retryPendingAttachments(uid: string): Promise<void> {
  await ensureLoaded(uid);
  const pending = records.filter(item => ['pending', 'failed'].includes(item.uploadState) && item.retryCount < 5);
  for (const attachment of pending) await uploadAttachment(uid, attachment.id);
  const deletes = records.filter(item => item.uploadState === 'delete-pending');
  for (const attachment of deletes) await deleteAttachment(uid, attachment.id);
}

export async function cancelAttachmentUpload(uid: string, id: string): Promise<void> {
  await ensureLoaded(uid);
  cancelledIds.add(id);
  uploadTasks.get(id)?.cancel();
  uploadTasks.get(`${id}:thumbnail`)?.cancel();
  const attachment = records.find(item => item.id === id);
  if (attachment) await replaceRecord(uid, { ...attachment, uploadState: 'cancelled', updatedAt: Date.now() });
}

async function deleteLocalFiles(attachment: Attachment) {
  await Promise.all([attachment.localUri, attachment.thumbnailLocalUri]
    .filter((uri): uri is string => Boolean(uri) && !/^https?:/i.test(uri!))
    .map(uri => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)));
}

export async function deleteAttachment(uid: string, id: string): Promise<void> {
  await ensureLoaded(uid);
  const attachment = records.find(item => item.id === id);
  if (!attachment) return;
  await cancelAttachmentUpload(uid, id);
  try {
    await Promise.all([
      attachment.remoteUrl
        ? deleteObject(ref(firebaseStorage, attachment.remotePath)).catch(error => {
            if ((error as { code?: string }).code !== 'storage/object-not-found') throw error;
          })
        : Promise.resolve(),
      attachment.thumbnailRemoteUrl && attachment.thumbnailRemotePath
        ? deleteObject(ref(firebaseStorage, attachment.thumbnailRemotePath)).catch(error => {
            if ((error as { code?: string }).code !== 'storage/object-not-found') throw error;
          })
        : Promise.resolve(),
    ]);
    await deleteLocalFiles(attachment);
    records = records.filter(item => item.id !== id);
    await Storage.setForUser(KEYS.ATTACHMENTS, uid, records);
    emit();
    await queueCloudDelete(uid, attachmentPath(uid, id));
  } catch (error) {
    await replaceRecord(uid, {
      ...attachment,
      uploadState: 'delete-pending',
      lastError: friendlyUploadError(error),
      updatedAt: Date.now(),
    });
  }
}

export async function cleanupOrphanedAttachments(
  uid: string,
  purpose: Attachment['purpose'],
  parentId: string,
  referencedIds: string[],
): Promise<void> {
  await ensureLoaded(uid);
  const referenced = new Set(referencedIds);
  const orphaned = records.filter(item => (
    item.purpose === purpose
    && item.parentId === parentId
    && !referenced.has(item.id)
  ));
  for (const attachment of orphaned) await deleteAttachment(uid, attachment.id);
}

export async function mirrorAttachmentToCollaboration(uid: string, id: string, boardId: string): Promise<{ remoteUrl: string; thumbnailRemoteUrl?: string }> {
  const cacheKey = `${boardId}:${id}`;
  const cached = collaborationUrls.get(cacheKey);
  if (cached) return cached;
  await ensureLoaded(uid);
  let attachment = records.find(item => item.id === id);
  if (!attachment) throw new Error('Canvas attachment is unavailable.');
  if (!attachment.remoteUrl && attachment.localUri) attachment = await uploadAttachment(uid, id);
  const source = attachment.localUri ?? attachment.remoteUrl;
  if (!source) throw new Error('Canvas attachment has no readable copy.');
  const extension = extensionForMime(attachment.mimeType);
  const base = `sharedCanvasBoards/${safeSegment(boardId)}/attachments/${safeSegment(id)}`;
  const remoteUrl = await uploadBlob(`${base}/original.${extension}`, source, attachment.mimeType, `shared:${boardId}:${id}`);
  const thumbSource = attachment.thumbnailLocalUri ?? attachment.thumbnailRemoteUrl;
  const thumbnailRemoteUrl = thumbSource
    ? await uploadBlob(`${base}/thumbnail.jpg`, thumbSource, 'image/jpeg', `shared:${boardId}:${id}:thumbnail`)
    : undefined;
  const result = { remoteUrl, thumbnailRemoteUrl };
  collaborationUrls.set(cacheKey, result);
  return result;
}

export async function deleteCollaborationAttachment(boardId: string, id: string): Promise<void> {
  const prefix = ref(firebaseStorage, `sharedCanvasBoards/${safeSegment(boardId)}/attachments/${safeSegment(id)}`);
  const result = await listAll(prefix);
  await Promise.all(result.items.map(item => deleteObject(item)));
  collaborationUrls.delete(`${boardId}:${id}`);
}

export async function deleteCollaborationAttachments(boardId: string): Promise<void> {
  const result = await listAll(ref(firebaseStorage, `sharedCanvasBoards/${safeSegment(boardId)}/attachments`));
  await Promise.all(result.items.map(item => deleteObject(item)));
  for (const prefix of result.prefixes) {
    const nested = await listAll(prefix);
    await Promise.all(nested.items.map(item => deleteObject(item)));
  }
}
