import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { flushCloudMutations, queueCloudSet } from '../services/OfflineSyncService';
import { KEYS, Storage } from '../services/StorageService';
import { ensureAuthEndpointReachable } from '../services/AuthNetworkService';
import { authErrorMessage } from '@/utils/authError';
import {
  clearGoogleSession,
  isGoogleAuthCancelled,
  requestGoogleIdentity,
} from '@/services/GoogleAuthService';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  hasSeenOnboarding: false,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateUser: async () => {},
  markOnboardingSeen: async () => {},
});

const userDocRef = (uid: string) => doc(db, 'users', uid);

const firestoreErrorMessage = (error: unknown): string => {
  return authErrorMessage(error);
};

export { firestoreErrorMessage };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    void Storage.get<boolean>(KEYS.ONBOARDING_DONE).then(done => {
      if (done) setHasSeenOnboarding(true);
    });

    return onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const fallback: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
        email: firebaseUser.email ?? '',
      };
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

      setUser(cached ?? fallback);
      setIsLoading(false);

      // Restore immediately from disk, then refresh and drain offline writes in
      // the background. Network latency must never expose the auth screens.
      void flushCloudMutations(firebaseUser.uid);
      void getDoc(userDocRef(firebaseUser.uid)).then(async snapshot => {
        const profile = snapshot.data() as User | undefined;
        if (!profile || auth.currentUser?.uid !== firebaseUser.uid) return;
        const resolved = { ...fallback, ...profile, id: firebaseUser.uid };
        setUser(resolved);
        await Storage.setForUser(KEYS.USER, firebaseUser.uid, resolved);
      }).catch(() => undefined);
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
      await updateProfile(credential.user, { displayName: name.trim() });
      const created: User = {
        id: credential.user.uid,
        name: name.trim(),
        email: email.trim(),
      };
      await Storage.setForUser(KEYS.USER, credential.user.uid, created);
      await queueCloudSet(
        credential.user.uid,
        ['users', credential.user.uid],
        created as unknown as Record<string, unknown>,
      );
      setUser(created);
    } catch (error) {
      throw new Error(firestoreErrorMessage(error));
    }
  };

  const signInWithGoogle = async () => {
    try {
      const googleIdentity = await requestGoogleIdentity();
      const googleCredential = GoogleAuthProvider.credential(googleIdentity.idToken);
      const credential = await signInWithCredential(auth, googleCredential);
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
      setUser(resolved);
      void Storage.setForUser(KEYS.USER, credential.user.uid, resolved).catch(() => undefined);
      void queueCloudSet(
        credential.user.uid,
        ['users', credential.user.uid],
        resolved as unknown as Record<string, unknown>,
      ).catch(() => undefined);
    } catch (error) {
      if (isGoogleAuthCancelled(error)) throw error;
      throw new Error(firestoreErrorMessage(error));
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    await clearGoogleSession();
    setUser(null);
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

  const markOnboardingSeen = async () => {
    await Storage.set(KEYS.ONBOARDING_DONE, true);
    setHasSeenOnboarding(true);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      hasSeenOnboarding,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      updateUser,
      markOnboardingSeen,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
