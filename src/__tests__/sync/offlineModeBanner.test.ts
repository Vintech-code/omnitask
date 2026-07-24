import { isOfflineModeVisible } from '@/components/sync/offlineMode';

describe('offline mode banner visibility', () => {
  it('appears only when the device cannot reach the internet', () => {
    expect(isOfflineModeVisible(false, 'offline')).toBe(true);
    expect(isOfflineModeVisible(false, 'failed')).toBe(true);
    expect(isOfflineModeVisible(true, 'saved')).toBe(false);
    expect(isOfflineModeVisible(true, 'syncing')).toBe(false);
    expect(isOfflineModeVisible(null, 'saved')).toBe(false);
  });

  it('stays visible while the sync state is still explicitly offline', () => {
    expect(isOfflineModeVisible(null, 'offline')).toBe(true);
  });
});
