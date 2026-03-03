/**
 * Firebase Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project → Add app → Web app
 * 3. Copy your config values here
 * 4. In Firebase console: enable Email/Password auth and Firestore database
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  // @ts-ignore – required for React Native AsyncStorage persistence
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'AIzaSyDs7SVepUDkvWPbpBHAa6Gz4UtPTj81QSs',
  authDomain:        'omnitask-d5b47.firebaseapp.com',
  projectId:         'omnitask-d5b47',
  storageBucket:     'omnitask-d5b47.firebasestorage.app',
  messagingSenderId: '385511004673',
  appId:             '1:385511004673:web:90727f4bcd26ab399dbe00',
  measurementId:     'G-1PJG4L44FT',
};

// Prevent duplicate initialization in hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth with AsyncStorage persistence so sessions survive app restarts
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialized (dev hot reload)
    return getAuth(app);
  }
})();

export const db = getFirestore(app);
export default app;
