import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  reload,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import {
  flushCloudMutations,
  getPendingMutationPaths,
  queueCloudSet,
  recordCloudSnapshot,
  reportSyncDiagnostic,
  syncRevision,
  withoutSyncMetadata,
} from '../services/OfflineSyncService';
import { KEYS, Storage } from '../services/StorageService';
import { ensureAuthEndpointReachable, withAuthTimeout } from '../services/AuthNetworkService';
import { authErrorMessage } from '@/utils/authError';
import {
  clearGoogleSession,
  isGoogleAuthCancelled,
  requestGoogleIdentity,
} from '@/services/GoogleAuthService';
import { requestVerificationEmail } from '@/services/EmailService';
import {
  markOnboardingCompleted,
  resolveOnboardingCompleted,
} from '@/services/AccountStateService';
import {
  attachmentDisplayUri,
  deleteAttachment,
  importAttachment,
  subscribeAttachmentRecords,
} from '@/services/AttachmentService';

export interface User {
  id: string;
  name: string;
  email: string;
  profileAttachmentId?: string;
  profilePhotoUrl?: string;
  profilePhotoUpdatedAt?: number;
}

interface AuthContextType {
  user: User | null;
  profilePhoto: string | null;
  profilePhotoAttachmentId: string | null;
  isLoading: boolean;
  emailVerified: boolean;
  verificationEmailStatus: 'unknown' | 'sent' | 'failed';
  hasSeenOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshEmailVerification: () => Promise<boolean>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updateProfilePhoto: (uri: string) => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profilePhoto: null,
  profilePhotoAttachmentId: null,
  isLoading: true,
  emailVerified: false,
  verificationEmailStatus: 'unknown',
  hasSeenOnboarding: false,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshEmailVerification: async () => false,
  updateUser: async () => {},
  updateProfilePhoto: async () => {},
  markOnboardingSeen: async () => {},
});

const userDocRef = (uid: string) => doc(db, 'users', uid);

const firestoreErrorMessage = (error: unknown): string => {
  return authErrorMessage(error);
};

export { firestoreErrorMessage };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoAttachmentId, setProfilePhotoAttachmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationEmailStatus, setVerificationEmailStatus] = useState<'unknown' | 'sent' | 'failed'>('unknown');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const googleAuthInProgressRef = useRef(false);
  const confirmedReturningUidRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);
  const pendingOldProfileAttachmentRef = useRef<string | null>(null);
  userRef.current = user;

  useEffect(() => subscribeAttachmentRecords(attachments => {
    const current = userRef.current;
    if (!current?.profileAttachmentId) return;
    const attachment = attachments.find(item => item.id === current.profileAttachmentId);
    const uri = attachmentDisplayUri(attachment);
    if (uri) setProfilePhoto(uri);
    if (attachment?.uploadState === 'uploaded' && attachment.remoteUrl && current.profilePhotoUrl !== attachment.remoteUrl) {
      const updated = { ...current, profilePhotoUrl: attachment.remoteUrl };
      userRef.current = updated;
      setUser(updated);
      void Storage.setForUser(KEYS.USER, current.id, updated);
      void queueCloudSet(current.id, ['users', current.id], updated as unknown as Record<string, unknown>);
      const oldId = pendingOldProfileAttachmentRef.current;
      pendingOldProfileAttachmentRef.current = null;
      if (oldId && oldId !== attachment.id) void deleteAttachment(current.id, oldId);
    }
  }), []);

  useEffect(() => {
    return onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        setUser(null);
        setProfilePhoto(null);
        setProfilePhotoAttachmentId(null);
        setEmailVerified(false);
        setVerificationEmailStatus('unknown');
        setHasSeenOnboarding(false);
        confirmedReturningUidRef.current = null;
        setIsLoading(false);
        return;
      }

      const fallback: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
        email: firebaseUser.email ?? '',
      };
      setEmailVerified(firebaseUser.emailVerified);
      let cached = await Storage.getForUser<User>(KEYS.USER, firebaseUser.uid);
      if (!cached) {
        const legacy = await Storage.get<User>(KEYS.USER);
        if (legacy?.id === firebaseUser.uid) {
          cached = legacy;
          await Storage.setForUser(KEYS.USER, firebaseUser.uid, legacy);
          const userDataKeys = [
            KEYS.EVENTS,
            KEYS.TASKS,
            KEYS.TASK_CATEGORIES,
            KEYS.ALARMS,
            KEYS.SESSIONS,
            KEYS.FOCUS_STATS,
            KEYS.PROFILE_PHOTO,
            KEYS.LINKED_NOTE,
          ];
          await Promise.all(userDataKeys.map(async key => {
            const existing = await Storage.getForUser<unknown>(key, firebaseUser.uid);
            const value = await Storage.get<unknown>(key);
            if (existing === null && value !== null) {
              await Storage.setForUser(key, firebaseUser.uid, value);
            }
          }));
          await Storage.remove(KEYS.USER);
        }
      }

      const [onboardingCompleted, storedProfilePhoto] = await Promise.all([
        resolveOnboardingCompleted(firebaseUser.uid, { allowLegacyMigration: Boolean(cached) }),
        Storage.getForUser<string>(KEYS.PROFILE_PHOTO, firebaseUser.uid),
      ]);
      if (auth.currentUser?.uid !== firebaseUser.uid) return;
      setProfilePhoto(storedProfilePhoto ?? cached?.profilePhotoUrl ?? null);
      setProfilePhotoAttachmentId(cached?.profileAttachmentId ?? null);
      setHasSeenOnboarding(
        confirmedReturningUidRef.current === firebaseUser.uid || onboardingCompleted,
      );
      const restoredUser = cached ?? fallback;
      userRef.current = restoredUser;
      setUser(restoredUser);
      if (storedProfilePhoto && !restoredUser.profileAttachmentId) {
        void importAttachment(firebaseUser.uid, {
          id: `legacy_profile_${firebaseUser.uid}`,
          uri: storedProfilePhoto,
          purpose: 'profile',
          parentId: firebaseUser.uid,
        }).then(async attachment => {
          if (auth.currentUser?.uid !== firebaseUser.uid) return;
          const migratedUser = {
            ...restoredUser,
            profileAttachmentId: attachment.id,
            profilePhotoUpdatedAt: Date.now(),
          };
          userRef.current = migratedUser;
          setUser(migratedUser);
          setProfilePhotoAttachmentId(attachment.id);
          await Storage.setForUser(KEYS.USER, firebaseUser.uid, migratedUser);
          await queueCloudSet(firebaseUser.uid, ['users', firebaseUser.uid], migratedUser as unknown as Record<string, unknown>);
        }).catch(() => undefined);
      }
      if (!googleAuthInProgressRef.current) setIsLoading(false);

      // Restore immediately from disk, then refresh and drain offline writes in
      // the background. Network latency must never expose the auth screens.
      void flushCloudMutations(firebaseUser.uid);
      void getDoc(userDocRef(firebaseUser.uid)).then(async snapshot => {
        if (auth.currentUser?.uid !== firebaseUser.uid) return;
        const path = ['users', firebaseUser.uid];
        const pathString = path.join('/');
        const rawProfile = snapshot.data();
        if (!rawProfile) {
          await queueCloudSet(
            firebaseUser.uid,
            path,
            restoredUser as unknown as Record<string, unknown>,
          );
          return;
        }
        await recordCloudSnapshot(firebaseUser.uid, path, rawProfile);
        const pendingPaths = await getPendingMutationPaths(firebaseUser.uid);
        const profile = withoutSyncMetadata<User>(rawProfile);
        const current = userRef.current?.id === firebaseUser.uid
          ? userRef.current
          : restoredUser;
        const localPhotoUpdatedAt = current.profilePhotoUpdatedAt ?? 0;
        const cloudPhotoUpdatedAt = profile.profilePhotoUpdatedAt ?? 0;
        const keepPendingProfile = pendingPaths.has(pathString);
        const keepLegacyLocalPhoto = syncRevision(rawProfile) === 0 && Boolean(
          current.profileAttachmentId
          && (
            localPhotoUpdatedAt > cloudPhotoUpdatedAt
            || (!profile.profileAttachmentId && localPhotoUpdatedAt >= cloudPhotoUpdatedAt)
          )
        );
        const resolved = {
          ...fallback,
          ...profile,
          ...(keepPendingProfile ? current : {}),
          ...(keepLegacyLocalPhoto ? {
            profileAttachmentId: current.profileAttachmentId,
            profilePhotoUrl: current.profilePhotoUrl,
            profilePhotoUpdatedAt: current.profilePhotoUpdatedAt,
          } : {}),
          id: firebaseUser.uid,
        };
        userRef.current = resolved;
        setUser(resolved);
        setProfilePhotoAttachmentId(resolved.profileAttachmentId ?? null);
        if (resolved.profilePhotoUrl) setProfilePhoto(resolved.profilePhotoUrl);
        await Storage.setForUser(KEYS.USER, firebaseUser.uid, resolved);
        if (keepLegacyLocalPhoto && !keepPendingProfile) {
          await queueCloudSet(
            firebaseUser.uid,
            path,
            resolved as unknown as Record<string, unknown>,
          );
        }
      }).catch(error => {
        void reportSyncDiagnostic(firebaseUser.uid, {
          path: `users/${firebaseUser.uid}`,
          severity: 'warning',
          code: 'firestore/profile-read-failed',
          message: error instanceof Error
            ? error.message
            : 'Your profile could not refresh from the cloud.',
        });
      });
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      const uid = auth.currentUser?.uid;
      if (state === 'active' && uid) void flushCloudMutations(uid);
    });
    return () => subscription.remove();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await ensureAuthEndpointReachable();
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      throw new Error(firestoreErrorMessage(error));
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      await ensureAuthEndpointReachable();
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() }).catch(() => undefined);
      const created: User = {
        id: credential.user.uid,
        name: name.trim(),
        email: email.trim(),
      };
      setEmailVerified(credential.user.emailVerified);
      setUser(created);
      void Storage.setForUser(KEYS.USER, credential.user.uid, created).catch(() => undefined);
      void queueCloudSet(
        credential.user.uid,
        ['users', credential.user.uid],
        created as unknown as Record<string, unknown>,
      ).catch(() => undefined);
      // Account creation is complete even if the transactional email provider
      // is temporarily unavailable. The verification screen exposes a safe retry.
      try {
        await requestVerificationEmail();
        setVerificationEmailStatus('sent');
      } catch {
        setVerificationEmailStatus('failed');
      }
    } catch (error) {
      throw new Error(firestoreErrorMessage(error));
    }
  };

  const signInWithGoogle = async () => {
    try {
      const googleIdentity = await requestGoogleIdentity();
      googleAuthInProgressRef.current = true;
      setIsLoading(true);
      await ensureAuthEndpointReachable();
      const googleCredential = GoogleAuthProvider.credential(googleIdentity.idToken);
      const credential = await withAuthTimeout(
        signInWithCredential(auth, googleCredential),
      );
      const isReturningAccount = getAdditionalUserInfo(credential)?.isNewUser === false;
      const resolved: User = {
        id: credential.user.uid,
        name: credential.user.displayName
          ?? googleIdentity.user.name
          ?? credential.user.email?.split('@')[0]
          ?? 'User',
        email: credential.user.email ?? googleIdentity.user.email ?? '',
      };

      // Firebase authentication is already complete at this point. Make local
      // profile persistence best-effort so a cache/sync issue cannot report a
      // successful Google login as failed and force the user to tap twice.
      if (isReturningAccount) {
        // Selecting an existing account from either auth screen is a login, not
        // a registration. Keep its workspace and never replay onboarding.
        confirmedReturningUidRef.current = credential.user.uid;
        setHasSeenOnboarding(true);
        void markOnboardingCompleted(credential.user.uid).catch(() => undefined);
      } else {
        confirmedReturningUidRef.current = null;
        const onboardingCompleted = await resolveOnboardingCompleted(credential.user.uid);
        setHasSeenOnboarding(onboardingCompleted);
      }
      setUser(resolved);
      setEmailVerified(credential.user.emailVerified);
      googleAuthInProgressRef.current = false;
      setIsLoading(false);
      void Storage.setForUser(KEYS.USER, credential.user.uid, resolved).catch(() => undefined);
      void queueCloudSet(
        credential.user.uid,
        ['users', credential.user.uid],
        resolved as unknown as Record<string, unknown>,
      ).catch(() => undefined);
    } catch (error) {
      googleAuthInProgressRef.current = false;
      setIsLoading(false);
      if (isGoogleAuthCancelled(error)) throw error;
      throw new Error(firestoreErrorMessage(error));
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    await clearGoogleSession();
    setUser(null);
    setProfilePhoto(null);
    setProfilePhotoAttachmentId(null);
    setEmailVerified(false);
    setVerificationEmailStatus('unknown');
  };

  const refreshEmailVerification = async (): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return false;
    await reload(firebaseUser);
    await firebaseUser.getIdToken(true);
    setEmailVerified(firebaseUser.emailVerified);
    return firebaseUser.emailVerified;
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await Storage.setForUser(KEYS.USER, user.id, updated);
    await queueCloudSet(
      user.id,
      ['users', user.id],
      updated as unknown as Record<string, unknown>,
    );
    if (updates.name && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: updates.name }).catch(() => undefined);
    }
    setUser(updated);
  };

  const updateProfilePhoto = async (uri: string) => {
    if (!user) return;
    const oldId = user.profileAttachmentId;
    const attachment = await importAttachment(user.id, {
      uri,
      purpose: 'profile',
      parentId: user.id,
    });
    pendingOldProfileAttachmentRef.current = oldId ?? null;
    const { profilePhotoUrl: _previousRemoteUrl, ...userWithoutRemotePhoto } = user;
    const updated = {
      ...userWithoutRemotePhoto,
      profileAttachmentId: attachment.id,
      profilePhotoUpdatedAt: Date.now(),
    };
    userRef.current = updated;
    setUser(updated);
    setProfilePhotoAttachmentId(attachment.id);
    setProfilePhoto(attachment.localUri ?? uri);
    await Promise.all([
      Storage.setForUser(KEYS.PROFILE_PHOTO, user.id, attachment.localUri ?? uri),
      Storage.setForUser(KEYS.USER, user.id, updated),
      queueCloudSet(user.id, ['users', user.id], updated as unknown as Record<string, unknown>),
    ]);
  };

  const markOnboardingSeen = async () => {
    if (!user) return;
    await markOnboardingCompleted(user.id);
    setHasSeenOnboarding(true);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profilePhoto,
      profilePhotoAttachmentId,
      isLoading,
      emailVerified,
      verificationEmailStatus,
      hasSeenOnboarding,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshEmailVerification,
      updateUser,
      updateProfilePhoto,
      markOnboardingSeen,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
