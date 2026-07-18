import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGetDoc = jest.fn((
  _reference?: unknown,
): Promise<{ data: () => Record<string, unknown> | undefined }> =>
  Promise.resolve({ data: () => undefined }));
const mockQueueCloudSet = jest.fn(async (
  _uid: unknown,
  _path: unknown,
  _data: unknown,
) => undefined);

jest.mock('@/config/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, path) => ({ path })),
  getDoc: (reference: unknown) => mockGetDoc(reference),
}));
jest.mock('@/services/OfflineSyncService', () => ({
  queueCloudSet: (uid: unknown, path: unknown, data: unknown) =>
    mockQueueCloudSet(uid, path, data),
}));

import {
  markOnboardingCompleted,
  resolveOnboardingCompleted,
} from '@/services/AccountStateService';
import { KEYS, Storage } from '@/services/StorageService';

describe('account-scoped onboarding state', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGetDoc.mockResolvedValue({ data: () => undefined });
  });

  it('does not share onboarding completion with a different account', async () => {
    await markOnboardingCompleted('existing-user');

    await expect(resolveOnboardingCompleted('existing-user')).resolves.toBe(true);
    await expect(resolveOnboardingCompleted('new-user')).resolves.toBe(false);
  });

  it('restores completion from the account cloud marker', async () => {
    mockGetDoc.mockResolvedValueOnce({
      data: () => ({ onboardingCompleted: true }),
    });

    await expect(resolveOnboardingCompleted('returning-user')).resolves.toBe(true);
    await expect(
      Storage.getForUser<boolean>(KEYS.ONBOARDING_DONE, 'returning-user'),
    ).resolves.toBe(true);
  });

  it('migrates the old global flag only for an established cached account', async () => {
    await Storage.set(KEYS.ONBOARDING_DONE, true);

    await expect(resolveOnboardingCompleted('new-user')).resolves.toBe(false);
    await expect(resolveOnboardingCompleted('existing-user', {
      allowLegacyMigration: true,
    })).resolves.toBe(true);
    await expect(Storage.get<boolean>(KEYS.ONBOARDING_DONE)).resolves.toBeNull();
  });
});
