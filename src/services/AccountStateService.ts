import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/config/firebase';
import { queueCloudSet, recordCloudSnapshot } from '@/services/OfflineSyncService';
import { KEYS, Storage } from '@/services/StorageService';
import { withAuthTimeout } from '@/services/AuthNetworkService';

const accountMetaPath = (uid: string) => ['users', uid, 'meta', 'account'];

export async function resolveOnboardingCompleted(
  uid: string,
  options: { allowLegacyMigration?: boolean } = {},
): Promise<boolean> {
  const local = await Storage.getForUser<boolean>(KEYS.ONBOARDING_DONE, uid);
  if (local === true) return true;

  try {
    const snapshot = await withAuthTimeout(
      getDoc(doc(db, accountMetaPath(uid).join('/'))),
      3500,
    );
    if (snapshot.exists()) await recordCloudSnapshot(uid, accountMetaPath(uid), snapshot.data());
    if (snapshot.data()?.onboardingCompleted === true) {
      await Storage.setForUser(KEYS.ONBOARDING_DONE, uid, true);
      return true;
    }
  } catch {
    // Offline startup falls back to the UID-scoped local value.
  }

  // Older OmniTask builds used one device-wide key. Migrate it only when this
  // UID already has a cached profile, then remove it so a different/new account
  // cannot incorrectly inherit another user's onboarding state.
  if (options.allowLegacyMigration) {
    const legacy = await Storage.get<boolean>(KEYS.ONBOARDING_DONE);
    if (legacy === true) {
      await Storage.setForUser(KEYS.ONBOARDING_DONE, uid, true);
      await Storage.remove(KEYS.ONBOARDING_DONE);
      return true;
    }
  }

  return false;
}

export async function markOnboardingCompleted(uid: string): Promise<void> {
  await Storage.setForUser(KEYS.ONBOARDING_DONE, uid, true);
  await queueCloudSet(uid, accountMetaPath(uid), {
    onboardingCompleted: true,
    updatedAt: Date.now(),
  });
}
