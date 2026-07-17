import { Platform } from 'react-native';

const FIREBASE_AUTH_HOST = 'https://identitytoolkit.googleapis.com/';

export async function ensureAuthEndpointReachable(timeoutMs = 6000): Promise<void> {
  if (Platform.OS === 'web') return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(FIREBASE_AUTH_HOST, {
      method: 'HEAD',
      signal: controller.signal,
    });
  } catch {
    throw Object.assign(
      new Error('Firebase could not be reached. Check your connection, disable any DNS blocker or VPN that blocks Google APIs, then try again.'),
      { code: 'auth/network-request-failed' },
    );
  } finally {
    clearTimeout(timer);
  }
}
