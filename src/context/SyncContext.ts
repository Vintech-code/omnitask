import { createContext, useContext } from 'react';

import type { SyncSnapshot } from '@/services/OfflineSyncService';

export interface SyncContextValue extends SyncSnapshot {
  retry: () => Promise<void>;
  clearDiagnostics: () => Promise<void>;
}

export const EMPTY_SYNC_SNAPSHOT: SyncSnapshot = {
  uid: null,
  status: 'saved',
  isConnected: null,
  mutations: [],
  diagnostics: [],
  pendingCount: 0,
  failedCount: 0,
};

export const SyncContext = createContext<SyncContextValue>({
  ...EMPTY_SYNC_SNAPSHOT,
  retry: async () => undefined,
  clearDiagnostics: async () => undefined,
});

export const useSync = () => useContext(SyncContext);
