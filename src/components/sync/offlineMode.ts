import type { GlobalSyncStatus } from '@/services/OfflineSyncService';

export function isOfflineModeVisible(
  isConnected: boolean | null,
  status: GlobalSyncStatus,
): boolean {
  return isConnected === false || status === 'offline';
}
