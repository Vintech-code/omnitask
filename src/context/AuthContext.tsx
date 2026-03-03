import React, { createContext, useContext, useState, useEffect } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Storage, KEYS } from '../services/StorageService';

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
  signOut: async () => {},
  updateUser: async () => {},
  markOnboardingSeen: async () => {},
});

// ── Firestore helpers ──────────────────────────────────────────────────────
const userDocRef = (uid: string) => doc(db, 'users', uid);

const firestoreErrorMessage = (e: unknown): string => {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case 'auth/user-not-found':     return 'No account found with that email.';
      case 'auth/wrong-password':     return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/invalid-email':      return 'Please enter a valid email address.';
      case 'auth/weak-password':      return 'Password must be at least 6 characters.';
      case 'auth/too-many-requests':  return 'Too many attempts. Please try again later.';
      case 'auth/network-request-failed': return 'Network error. Check your connection.';
      default: return e.message;
    }
  }
  return 'Something went wrong. Please try again.';
};

export { firestoreErrorMessage };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    // Resolve onboarding status from local storage (doesn't need Firebase)
    Storage.get<boolean>(KEYS.ONBOARDING_DONE).then(done => {
      if (done) setHasSeenOnboarding(true);
    });

    // Listen to Firebase auth state — persists across restarts
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch profile from Firestore
        try {
          const snap = await getDoc(userDocRef(firebaseUser.uid));
          const profile = snap.data() as User | undefined;
          const u: User = {
            id:    firebaseUser.uid,
            name:  profile?.name  ?? firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
            email: firebaseUser.email ?? '',
          };
          setUser(u);
          await Storage.set(KEYS.USER, u);   // cache locally
        } catch {
          // Firestore unavailable — use cached local user
          const cached = await Storage.get<User>(KEYS.USER);
          setUser(cached);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── Sign In ───────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged above handles updating user state
    } catch (e) {
      throw new Error(firestoreErrorMessage(e));
    }
  };

  // ── Sign Up ───────────────────────────────────────────────────────────────
  const signUp = async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Store display name in Firebase Auth
      await updateProfile(cred.user, { displayName: name.trim() });
      // Store full profile in Firestore
      const u: User = { id: cred.user.uid, name: name.trim(), email: email.trim() };
      await setDoc(userDocRef(cred.user.uid), u);
      await Storage.set(KEYS.USER, u);
      setUser(u);
    } catch (e) {
      throw new Error(firestoreErrorMessage(e));
    }
  };

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    await firebaseSignOut(auth);
    await Storage.remove(KEYS.USER);
    setUser(null);
  };

  // ── Update Profile ────────────────────────────────────────────────────────
  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    // Update Firestore
    try {
      await updateDoc(userDocRef(user.id), updates);
    } catch { /* offline — still update locally */ }
    if (updates.name && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: updates.name });
    }
    await Storage.set(KEYS.USER, updated);
    setUser(updated);
  };

  // ── Onboarding ────────────────────────────────────────────────────────────
  const markOnboardingSeen = async () => {
    await Storage.set(KEYS.ONBOARDING_DONE, true);
    setHasSeenOnboarding(true);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, hasSeenOnboarding, signIn, signUp, signOut, updateUser, markOnboardingSeen }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
