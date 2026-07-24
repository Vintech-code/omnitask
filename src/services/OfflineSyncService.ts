import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc,
  runTransaction,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';

import { db } from '@/config/firebase';

export const SYNC_SCHEMA_VERSION = 2;
const LEGACY_OUTBOX_KEY = 'omnitask_cloud_outbox';
const OUTBOX_PREFIX = 'omnitask_cloud_outbox_v2';
const CONFIRMED_PREFIX = 'omnitask_cloud_confirmed_v1';
const DIAGNOSTIC_PREFIX = 'omnitask_sync_diagnostics_v1';
const DEVICE_ID_KEY = 'omnitask_sync_device_id_v1';
const BASE_RETRY_MS = 2_000;
const MAX_RETRY_MS = 5 * 60_000;
const MAX_DIAGNOSTICS = 30;
const MAX_CONFIRMED = 300;

export type SyncMutationState = 'pending' | 'sending' | 'failed' | 'confirmed';
export type GlobalSyncStatus = 'saved' | 'syncing' | 'offline' | 'failed';
export type SyncOperation = 'set' | 'delete';

export interface CloudMutation {
  id: string;
  uid: string;
  path: string[];
  operation: SyncOperation;
  data?: Record<string, unknown>;
  baseData?: Record<string, unknown>;
  baseRevision: number;
  state: SyncMutationState;
  retryCount: number;
  lastError?: string;
  errorCode?: string;
  nextRetryAt: number;
  createdAt: number;
  updatedAt: number;
  confirmedAt?: number;
  version: number;
}

export interface SyncDiagnostic {
  id: string;
  uid: string;
  path?: string;
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  createdAt: number;
}

interface ConfirmedRecord {
  revision: number;
  data: Record<string, unknown>;
  confirmedAt: number;
}

type ConfirmedMap = Record<string, ConfirmedRecord>;

export interface SyncSnapshot {
  uid: string | null;
  status: GlobalSyncStatus;
  isConnected: boolean | null;
  mutations: CloudMutation[];
  diagnostics: SyncDiagnostic[];
  pendingCount: number;
  failedCount: number;
  lastSyncedAt?: number;
}

type SyncListener = (snapshot: SyncSnapshot) => void;

const outboxes = new Map<string, CloudMutation[]>();
const confirmedMaps = new Map<string, ConfirmedMap>();
const diagnosticMaps = new Map<string, SyncDiagnostic[]>();
const listeners = new Map<string, Set<SyncListener>>();
const flushing = new Map<string, Promise<void>>();
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const locks = new Map<string, Promise<unknown>>();
let activeUid: string | null = null;
let connectivity: boolean | null = null;
let deviceId: string | null = null;

const outboxKey = (uid: string) => `${OUTBOX_PREFIX}:${uid}`;
const confirmedKey = (uid: string) => `${CONFIRMED_PREFIX}:${uid}`;
const diagnosticKey = (uid: string) => `${DIAGNOSTIC_PREFIX}:${uid}`;
const pathKey = (path: string[]) => path.join('/');

function serialize<T>(uid: string, operation: () => Promise<T>): Promise<T> {
  const current = locks.get(uid) ?? Promise.resolve();
  const result = current.then(operation, operation);
  locks.set(uid, result.catch(() => undefined));
  return result;
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitize(item)]),
    );
  }
  return value;
}

function cleanData(data: Record<string, unknown>): Record<string, unknown> {
  const { _omniSync: _ignored, ...rest } = data;
  return sanitize(rest) as Record<string, unknown>;
}

export function withoutSyncMetadata<T>(data: DocumentData): T {
  const { _omniSync: _ignored, ...rest } = data;
  return rest as T;
}

export function syncRevision(data?: DocumentData): number {
  const revision = data?._omniSync?.revision;
  return typeof revision === 'number' && Number.isFinite(revision) ? revision : 0;
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function changedData(
  desired: Record<string, unknown>,
  base?: Record<string, unknown>,
): Record<string, unknown> {
  if (!base) return desired;
  return Object.fromEntries(
    Object.entries(desired).filter(([key, value]) => !sameValue(value, base[key])),
  );
}

function retryDelay(retryCount: number): number {
  return Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** Math.max(0, retryCount - 1));
}

function errorDetails(error: unknown): { code: string; message: string } {
  const candidate = error as { code?: string; message?: string };
  const code = candidate.code?.replace(/^firestore\//, '') ?? 'sync/unknown';
  const message = candidate.message?.replace(/^Firebase:\s*/i, '')
    ?? 'Cloud sync failed. Your local changes are safe.';
  return { code, message };
}

function currentStatus(uid: string): GlobalSyncStatus {
  const mutations = outboxes.get(uid) ?? [];
  if (connectivity === false) return 'offline';
  if (mutations.some(item => item.state === 'failed')) return 'failed';
  if (mutations.some(item => item.state === 'pending' || item.state === 'sending')) return 'syncing';
  return 'saved';
}

function isOffline(): boolean {
  return connectivity === false;
}

function snapshotFor(uid: string | null): SyncSnapshot {
  if (!uid) {
    return {
      uid: null,
      status: connectivity === false ? 'offline' : 'saved',
      isConnected: connectivity,
      mutations: [],
      diagnostics: [],
      pendingCount: 0,
      failedCount: 0,
    };
  }
  const mutations = [...(outboxes.get(uid) ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const diagnostics = [...(diagnosticMaps.get(uid) ?? [])].sort((a, b) => b.createdAt - a.createdAt);
  const confirmed = Object.values(confirmedMaps.get(uid) ?? {});
  return {
    uid,
    status: currentStatus(uid),
    isConnected: connectivity,
    mutations,
    diagnostics,
    pendingCount: mutations.filter(item => item.state === 'pending' || item.state === 'sending').length,
    failedCount: mutations.filter(item => item.state === 'failed').length,
    lastSyncedAt: confirmed.length
      ? Math.max(...confirmed.map(item => item.confirmedAt))
      : undefined,
  };
}

function emit(uid: string) {
  const snapshot = snapshotFor(uid);
  listeners.get(uid)?.forEach(listener => listener(snapshot));
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) as T : null;
}

async function addDiagnostic(
  uid: string,
  input: Omit<SyncDiagnostic, 'id' | 'uid' | 'createdAt'>,
): Promise<void> {
  const diagnostic: SyncDiagnostic = {
    ...input,
    id: `diagnostic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    uid,
    createdAt: Date.now(),
  };
  const next = [diagnostic, ...(diagnosticMaps.get(uid) ?? [])].slice(0, MAX_DIAGNOSTICS);
  diagnosticMaps.set(uid, next);
  try {
    await writeJson(diagnosticKey(uid), next);
  } catch {
    // The in-memory diagnostic remains visible even if device storage is full.
  }
  emit(uid);
}

async function persistOutbox(uid: string, next: CloudMutation[]): Promise<void> {
  outboxes.set(uid, next);
  try {
    await writeJson(outboxKey(uid), next);
  } catch (error) {
    const details = errorDetails(error);
    await addDiagnostic(uid, {
      severity: 'error',
      code: 'storage/outbox-write-failed',
      message: `Could not persist the sync queue: ${details.message}`,
    });
  }
  emit(uid);
}

async function persistConfirmed(uid: string, next: ConfirmedMap): Promise<void> {
  const entries = Object.entries(next)
    .sort(([, left], [, right]) => right.confirmedAt - left.confirmedAt)
    .slice(0, MAX_CONFIRMED);
  const compact = Object.fromEntries(entries);
  confirmedMaps.set(uid, compact);
  try {
    await writeJson(confirmedKey(uid), compact);
  } catch (error) {
    const details = errorDetails(error);
    await addDiagnostic(uid, {
      severity: 'warning',
      code: 'storage/baseline-write-failed',
      message: `Sync succeeded, but its local conflict baseline could not be saved: ${details.message}`,
    });
  }
}

async function ensureDeviceId(): Promise<string> {
  if (deviceId) return deviceId;
  try {
    deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
  } catch {
    deviceId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  return deviceId;
}

async function migrateLegacyOutbox(uid: string): Promise<void> {
  try {
    const legacy = await readJson<Array<{
      id: string;
      uid: string;
      path: string[];
      operation: SyncOperation;
      data?: Record<string, unknown>;
    }>>(LEGACY_OUTBOX_KEY);
    if (!legacy?.length) return;
    const now = Date.now();
    const matching = legacy.filter(item => item.uid === uid);
    if (matching.length) {
      const existing = outboxes.get(uid) ?? [];
      const converted: CloudMutation[] = matching.map((item, index) => ({
        ...item,
        data: item.data ? cleanData(item.data) : undefined,
        baseRevision: 0,
        state: 'pending',
        retryCount: 0,
        nextRetryAt: 0,
        createdAt: now + index,
        updatedAt: now + index,
        version: SYNC_SCHEMA_VERSION,
      }));
      await persistOutbox(uid, compactMutations([...existing, ...converted]));
    }
    const remaining = legacy.filter(item => item.uid !== uid);
    if (remaining.length) await writeJson(LEGACY_OUTBOX_KEY, remaining);
    else await AsyncStorage.removeItem(LEGACY_OUTBOX_KEY);
  } catch (error) {
    const details = errorDetails(error);
    await addDiagnostic(uid, {
      severity: 'warning',
      code: 'migration/legacy-outbox-failed',
      message: `The previous sync queue could not be migrated: ${details.message}`,
    });
  }
}

function compactMutations(mutations: CloudMutation[]): CloudMutation[] {
  const compacted = new Map<string, CloudMutation>();
  for (const mutation of [...mutations].sort((a, b) => a.createdAt - b.createdAt)) {
    const key = pathKey(mutation.path);
    const existing = compacted.get(key);
    if (!existing) {
      compacted.set(key, mutation);
      continue;
    }
    if (mutation.operation === 'delete') {
      compacted.set(key, {
        ...mutation,
        createdAt: existing.createdAt,
        retryCount: 0,
        state: 'pending',
        nextRetryAt: 0,
      });
      continue;
    }
    compacted.set(key, {
      ...mutation,
      baseData: existing.baseData ?? mutation.baseData,
      baseRevision: existing.baseRevision,
      createdAt: existing.createdAt,
      retryCount: 0,
      state: 'pending',
      nextRetryAt: 0,
      lastError: undefined,
      errorCode: undefined,
    });
  }
  return [...compacted.values()].sort((a, b) => a.createdAt - b.createdAt);
}

async function ensureLoaded(uid: string): Promise<void> {
  if (outboxes.has(uid)) return;
  const [storedOutbox, storedConfirmed, storedDiagnostics] = await Promise.all([
    readJson<CloudMutation[]>(outboxKey(uid)).catch(() => null),
    readJson<ConfirmedMap>(confirmedKey(uid)).catch(() => null),
    readJson<SyncDiagnostic[]>(diagnosticKey(uid)).catch(() => null),
  ]);
  const recovered = (storedOutbox ?? []).map(item => ({
    ...item,
    state: item.state === 'sending' ? 'pending' as const : item.state,
    nextRetryAt: item.state === 'sending' ? 0 : item.nextRetryAt,
  }));
  outboxes.set(uid, compactMutations(recovered));
  confirmedMaps.set(uid, storedConfirmed ?? {});
  diagnosticMaps.set(uid, (storedDiagnostics ?? []).filter(item => item.uid === uid));
  await migrateLegacyOutbox(uid);
  emit(uid);
}

function scheduleRetry(uid: string) {
  const current = retryTimers.get(uid);
  if (current) clearTimeout(current);
  retryTimers.delete(uid);
  if (connectivity === false) return;
  const future = (outboxes.get(uid) ?? [])
    .filter(item => item.state === 'failed' && item.nextRetryAt > Date.now())
    .map(item => item.nextRetryAt);
  if (!future.length) return;
  const delay = Math.max(250, Math.min(...future) - Date.now());
  retryTimers.set(uid, setTimeout(() => {
    retryTimers.delete(uid);
    void flushCloudMutations(uid);
  }, delay));
}

async function applyMutation(uid: string, mutation: CloudMutation): Promise<ConfirmedRecord | null> {
  const reference = doc(db, mutation.path.join('/'));
  const currentDeviceId = await ensureDeviceId();
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference);
    const remote = snapshot.exists() ? snapshot.data() : {};
    const revision = syncRevision(remote);
    if (mutation.operation === 'delete') {
      if (snapshot.exists()) transaction.delete(reference);
      return null;
    }

    const desired = cleanData(mutation.data ?? {});
    const patch = changedData(desired, mutation.baseData);
    const payload = mutation.baseData && revision !== mutation.baseRevision
      ? patch
      : desired;
    const nextRevision = Math.max(revision, mutation.baseRevision) + 1;
    transaction.set(reference, {
      ...payload,
      _omniSync: {
        revision: nextRevision,
        deviceId: currentDeviceId,
        clientUpdatedAt: mutation.updatedAt,
        serverUpdatedAt: serverTimestamp(),
        schemaVersion: SYNC_SCHEMA_VERSION,
      },
    }, { merge: true });
    return {
      revision: nextRevision,
      data: { ...cleanData(remote), ...payload },
      confirmedAt: Date.now(),
    };
  });
}

async function enqueue(
  uid: string,
  path: string[],
  operation: SyncOperation,
  data?: Record<string, unknown>,
): Promise<void> {
  await ensureLoaded(uid);
  await serialize(uid, async () => {
    const key = pathKey(path);
    const existing = (outboxes.get(uid) ?? []).find(item => pathKey(item.path) === key);
    const baseline = existing
      ? { revision: existing.baseRevision, data: existing.baseData }
      : confirmedMaps.get(uid)?.[key];
    const now = Date.now();
    const mutation: CloudMutation = {
      id: existing?.id ?? `mutation_${now}_${Math.random().toString(36).slice(2, 9)}`,
      uid,
      path,
      operation,
      data: data ? cleanData(data) : undefined,
      baseData: existing?.baseData ?? baseline?.data,
      baseRevision: existing?.baseRevision ?? baseline?.revision ?? 0,
      state: 'pending',
      retryCount: 0,
      nextRetryAt: 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      version: SYNC_SCHEMA_VERSION,
    };
    const next = compactMutations([
      ...(outboxes.get(uid) ?? []).filter(item => pathKey(item.path) !== key),
      mutation,
    ]);
    await persistOutbox(uid, next);
  });
  void flushCloudMutations(uid);
}

export async function initializeOfflineSync(uid: string): Promise<void> {
  activeUid = uid;
  await ensureLoaded(uid);
  scheduleRetry(uid);
  if (connectivity !== false) void flushCloudMutations(uid);
}

export function stopOfflineSync(uid: string): void {
  if (activeUid === uid) activeUid = null;
  const timer = retryTimers.get(uid);
  if (timer) clearTimeout(timer);
  retryTimers.delete(uid);
}

export function setSyncConnectivity(isConnected: boolean | null): void {
  const wasConnected = connectivity;
  connectivity = isConnected;
  for (const uid of outboxes.keys()) emit(uid);
  if (isConnected === true && wasConnected !== true) {
    for (const uid of outboxes.keys()) void flushCloudMutations(uid);
  }
}

export function subscribeSyncState(uid: string, listener: SyncListener): () => void {
  const bucket = listeners.get(uid) ?? new Set<SyncListener>();
  bucket.add(listener);
  listeners.set(uid, bucket);
  listener(snapshotFor(uid));
  return () => {
    bucket.delete(listener);
    if (!bucket.size) listeners.delete(uid);
  };
}

export function currentSyncSnapshot(uid: string | null = activeUid): SyncSnapshot {
  return snapshotFor(uid);
}

export async function queueCloudSet(
  uid: string,
  path: string[],
  data: Record<string, unknown>,
): Promise<void> {
  await enqueue(uid, path, 'set', data);
}

export async function queueCloudDelete(uid: string, path: string[]): Promise<void> {
  await enqueue(uid, path, 'delete');
}

export async function getPendingDeletePaths(uid: string): Promise<Set<string>> {
  await ensureLoaded(uid);
  return new Set(
    (outboxes.get(uid) ?? [])
      .filter(item => item.operation === 'delete')
      .map(item => pathKey(item.path)),
  );
}

export async function getPendingMutationPaths(uid: string): Promise<Set<string>> {
  await ensureLoaded(uid);
  return new Set((outboxes.get(uid) ?? []).map(item => pathKey(item.path)));
}

export async function reportSyncDiagnostic(
  uid: string,
  input: Omit<SyncDiagnostic, 'id' | 'uid' | 'createdAt'>,
): Promise<void> {
  await ensureLoaded(uid);
  await addDiagnostic(uid, input);
}

export async function recordCloudSnapshot(
  uid: string,
  path: string[],
  data: DocumentData,
): Promise<void> {
  await ensureLoaded(uid);
  await serialize(uid, async () => {
    const key = pathKey(path);
    const next: ConfirmedMap = {
      ...(confirmedMaps.get(uid) ?? {}),
      [key]: {
        revision: syncRevision(data),
        data: cleanData(data),
        confirmedAt: Date.now(),
      },
    };
    await persistConfirmed(uid, next);
  });
}

export function flushCloudMutations(
  uid: string,
  options: { force?: boolean } = {},
): Promise<void> {
  const existing = flushing.get(uid);
  if (existing) return existing;

  const task = (async () => {
    await ensureLoaded(uid);
    if (connectivity === false) {
      emit(uid);
      return;
    }
    const candidates = [...(outboxes.get(uid) ?? [])]
      .filter(item => (
        item.state === 'pending'
        || item.state === 'sending'
        || item.state === 'failed' && (options.force || item.nextRetryAt <= Date.now())
      ))
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const candidate of candidates) {
      if (isOffline()) break;
      const live = (outboxes.get(uid) ?? []).find(item => item.id === candidate.id);
      if (!live) continue;
      const sending: CloudMutation = {
        ...live,
        state: 'sending',
        lastError: undefined,
        errorCode: undefined,
        updatedAt: Date.now(),
      };
      await persistOutbox(
        uid,
        (outboxes.get(uid) ?? []).map(item => item.id === sending.id ? sending : item),
      );
      try {
        const confirmed = await applyMutation(uid, sending);
        const latest = (outboxes.get(uid) ?? []).find(item => item.id === sending.id);
        if (!latest || latest.updatedAt > sending.updatedAt) continue;
        const completed: CloudMutation = {
          ...sending,
          state: 'confirmed',
          confirmedAt: Date.now(),
          updatedAt: Date.now(),
        };
        await persistOutbox(
          uid,
          (outboxes.get(uid) ?? []).map(item => item.id === completed.id ? completed : item),
        );
        await persistOutbox(uid, (outboxes.get(uid) ?? []).filter(item => item.id !== sending.id));
        const key = pathKey(sending.path);
        if (confirmed) {
          await serialize(uid, async () => {
            await persistConfirmed(uid, {
              ...(confirmedMaps.get(uid) ?? {}),
              [key]: confirmed,
            });
          });
        } else {
          await serialize(uid, async () => {
            const next = { ...(confirmedMaps.get(uid) ?? {}) };
            delete next[key];
            await persistConfirmed(uid, next);
          });
        }
      } catch (error) {
        const details = errorDetails(error);
        const retryCount = sending.retryCount + 1;
        const failed: CloudMutation = {
          ...sending,
          state: 'failed',
          retryCount,
          lastError: details.message,
          errorCode: details.code,
          nextRetryAt: Date.now() + retryDelay(retryCount),
          updatedAt: Date.now(),
        };
        await persistOutbox(
          uid,
          (outboxes.get(uid) ?? []).map(item => item.id === failed.id ? failed : item),
        );
        await addDiagnostic(uid, {
          path: pathKey(failed.path),
          severity: 'error',
          code: details.code,
          message: details.message,
        });
      }
    }
  })().finally(() => {
    flushing.delete(uid);
    scheduleRetry(uid);
    emit(uid);
  });

  flushing.set(uid, task);
  task.catch(() => undefined);
  return task;
}

export async function retryFailedMutations(uid: string): Promise<void> {
  await ensureLoaded(uid);
  await persistOutbox(uid, (outboxes.get(uid) ?? []).map(item => item.state === 'failed'
    ? {
        ...item,
        state: 'pending',
        nextRetryAt: 0,
        lastError: undefined,
        errorCode: undefined,
        updatedAt: Date.now(),
      }
    : item));
  await flushCloudMutations(uid, { force: true });
}

export async function clearSyncDiagnostics(uid: string): Promise<void> {
  diagnosticMaps.set(uid, []);
  try {
    await AsyncStorage.removeItem(diagnosticKey(uid));
  } catch {
    // Clearing diagnostics is best-effort and never affects queued data.
  }
  emit(uid);
}

// Test-only reset keeps production state private while allowing deterministic unit tests.
export function __resetOfflineSyncForTests(): void {
  retryTimers.forEach(timer => clearTimeout(timer));
  retryTimers.clear();
  outboxes.clear();
  confirmedMaps.clear();
  diagnosticMaps.clear();
  listeners.clear();
  flushing.clear();
  locks.clear();
  activeUid = null;
  connectivity = null;
  deviceId = null;
}
