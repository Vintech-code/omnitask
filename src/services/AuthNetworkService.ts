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

export async function withAuthTimeout<T>(request: Promise<T>, timeoutMs = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(
      new Error('Firebase authentication timed out.'),
      { code: 'auth/timeout' },
    )), timeoutMs);
  });

  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
