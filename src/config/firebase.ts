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
  browserLocalPersistence,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireFirebaseConfig } from './environment';

const firebaseConfig = requireFirebaseConfig();

// Prevent duplicate initialization in hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Keep the Firebase refresh token on-device so authenticated users can reopen
// OmniTask offline without being sent through sign-in again.
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: Platform.OS === 'web'
        ? browserLocalPersistence
        : getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialized (dev hot reload)
    return getAuth(app);
  }
})();

export const db = (() => {
  try {
    return initializeFirestore(app, Platform.OS === 'web'
      ? {
          experimentalAutoDetectLongPolling: true,
          ignoreUndefinedProperties: true,
        }
      : {
          // React Native does not provide a browser-grade streaming transport.
          // Force WebChannel long polling to avoid stalled Listen streams on
          // Android vendor networks, proxies and development-client bridges.
          experimentalForceLongPolling: true,
          experimentalLongPollingOptions: { timeoutSeconds: 15 },
          ignoreUndefinedProperties: true,
        });
  } catch {
    // Fast Refresh can evaluate this module after Firestore is initialized.
    return getFirestore(app);
  }
})();
export const firebaseStorage = getStorage(app);
export default app;
