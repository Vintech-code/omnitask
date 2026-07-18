import {
  GoogleSignin,
  isCancelledResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { withAuthTimeout } from '@/services/AuthNetworkService';

// OAuth client IDs are public identifiers (not secrets). Keeping a known-good
// fallback prevents older development clients from depending on an Android
// string resource that may not have been generated when the APK was built.
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()
  || '385511004673-tmmhtu95sskkljal7nqat1iihac4br5l.apps.googleusercontent.com';

export class GoogleAuthCancelledError extends Error {
  constructor() {
    super('Google sign-in was cancelled.');
    this.name = 'GoogleAuthCancelledError';
  }
}

export const isGoogleAuthCancelled = (error: unknown): boolean =>
  error instanceof GoogleAuthCancelledError;

export type GoogleIdentity = {
  idToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

const googleSetupError = (error: unknown): Error => {
  const candidate = error as { code?: string; message?: string } | null;
  const nativeMessage = candidate?.message ?? '';

  if (
    nativeMessage.includes('default_web_client_id')
    || nativeMessage.includes('webClientId is "autoDetect"')
    || nativeMessage.includes('Google Services plugin')
  ) {
    return new Error(
      'Google Sign-In is not configured in this app build yet. Reload the app and try again; rebuild the development client if the problem continues.',
    );
  }

  if (candidate?.code === statusCodes.SIGN_IN_CANCELLED) return new GoogleAuthCancelledError();
  if (candidate?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return new Error('Google Play services is unavailable or out of date on this device.');
  }
  if (candidate?.code === statusCodes.IN_PROGRESS) {
    return new Error('A Google sign-in request is already in progress.');
  }
  if (candidate?.code === 'DEVELOPER_ERROR' || nativeMessage.includes('DEVELOPER_ERROR')) {
    return new Error(
      'Google Sign-In is not configured for this app build. Verify the Android package and SHA-1, then rebuild the development client.',
    );
  }

  // Native exceptions can contain a full Java stack. Never render that in the
  // authentication UI because it displaces the remaining actions.
  return new Error('Unable to open Google Sign-In. Please try again.');
};

export async function requestGoogleIdentity(): Promise<GoogleIdentity> {
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });

    await withAuthTimeout(
      GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }),
      10000,
    );

    // Clear only the SDK selection cache so Android displays its account chooser
    // again, including the option to add another account. Firebase remains signed
    // out until the returned ID token is exchanged in AuthContext.
    await withAuthTimeout(GoogleSignin.signOut(), 5000).catch(() => undefined);
    const response = await withAuthTimeout(GoogleSignin.signIn(), 30000);

    if (isCancelledResponse(response)) {
      throw new GoogleAuthCancelledError();
    }
    if (!response.data.idToken) {
      throw new Error('Google did not return a valid identity token. Please try another account.');
    }

    return {
      idToken: response.data.idToken,
      user: {
        id: response.data.user.id,
        email: response.data.user.email,
        name: response.data.user.name,
      },
    };
  } catch (error) {
    if (isGoogleAuthCancelled(error)) throw error;
    throw googleSetupError(error);
  }
}

export async function clearGoogleSession(): Promise<void> {
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
    await withAuthTimeout(GoogleSignin.signOut(), 5000);
  } catch {
    // Firebase remains the source of truth for the app session. A missing native
    // Google configuration must not prevent email users from signing out.
  }
}
