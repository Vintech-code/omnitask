import NetInfo from '@react-native-community/netinfo';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import {
  clearSyncDiagnostics,
  currentSyncSnapshot,
  flushCloudMutations,
  initializeOfflineSync,
  retryFailedMutations,
  reportSyncDiagnostic,
  setSyncConnectivity,
  stopOfflineSync,
  subscribeSyncState,
  type SyncSnapshot,
} from '@/services/OfflineSyncService';
import { subscribeStorageDiagnostics } from '@/services/StorageService';
import {
  EMPTY_SYNC_SNAPSHOT,
  SyncContext,
  type SyncContextValue,
} from '@/context/SyncContext';

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(
    uid ? currentSyncSnapshot(uid) : EMPTY_SYNC_SNAPSHOT,
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setSyncConnectivity(
        state.isConnected === false || state.isInternetReachable === false
          ? false
          : state.isConnected === true
            ? true
            : null,
      );
    });
    void NetInfo.fetch().then(state => {
      setSyncConnectivity(
        state.isConnected === false || state.isInternetReachable === false
          ? false
          : state.isConnected === true
            ? true
            : null,
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!uid) {
      setSnapshot(EMPTY_SYNC_SNAPSHOT);
      return undefined;
    }
    let disposed = false;
    const unsubscribe = subscribeSyncState(uid, value => {
      if (!disposed) setSnapshot(value);
    });
    void initializeOfflineSync(uid);
    return () => {
      disposed = true;
      unsubscribe();
      stopOfflineSync(uid);
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeStorageDiagnostics(diagnostic => {
      void reportSyncDiagnostic(uid, {
        severity: 'error',
        code: `storage/${diagnostic.operation}-failed`,
        message: `Local ${diagnostic.operation} failed for ${diagnostic.key}: ${diagnostic.message}`,
      });
    });
  }, [uid]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && uid) void flushCloudMutations(uid);
    });
    return () => subscription.remove();
  }, [uid]);

  const visibleSnapshot = snapshot.uid === uid
    ? snapshot
    : uid
      ? currentSyncSnapshot(uid)
      : EMPTY_SYNC_SNAPSHOT;

  const value = useMemo<SyncContextValue>(() => ({
    ...visibleSnapshot,
    retry: async () => {
      if (uid) await retryFailedMutations(uid);
    },
    clearDiagnostics: async () => {
      if (uid) await clearSyncDiagnostics(uid);
    },
  }), [visibleSnapshot, uid]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export { useSync } from '@/context/SyncContext';
