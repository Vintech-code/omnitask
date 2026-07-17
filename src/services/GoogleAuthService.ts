import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isSuccessResponse,
  type OneTapSuccessData,
} from 'react-native-nitro-google-signin';

export class GoogleAuthCancelledError extends Error {
  constructor() {
    super('Google sign-in was cancelled.');
    this.name = 'GoogleAuthCancelledError';
  }
}

export const isGoogleAuthCancelled = (error: unknown): boolean =>
  error instanceof GoogleAuthCancelledError;

const googleSetupError = (error: unknown): Error => {
  const candidate = error as { code?: string; message?: string } | null;

  switch (candidate?.code) {
    case 'SIGN_IN_CANCELLED':
      return new GoogleAuthCancelledError();
    case 'PLAY_SERVICES_NOT_AVAILABLE':
      return new Error('Google Play services is unavailable or out of date on this device.');
    case 'DEVELOPER_ERROR':
      return new Error(
        'Google Sign-In is not configured for this app build. Verify the Android package, SHA-1, and google-services.json, then rebuild the app.',
      );
    case 'IN_PROGRESS':
      return new Error('A Google sign-in request is already in progress.');
    default:
      return new Error(candidate?.message || 'Unable to open Google Sign-In. Please try again.');
  }
};

export async function requestGoogleIdentity(): Promise<OneTapSuccessData> {
  try {
    GoogleOneTapSignIn.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || 'autoDetect',
      offlineAccess: false,
      autoSelectOnSignIn: false,
    });

    await GoogleOneTapSignIn.checkPlayServices(true);
    // The explicit button flow lists all Google accounts on Android and includes
    // "Add another account". The low-friction signIn() flow only shows accounts
    // that Credential Manager has already saved/authorized for this app.
    const response = await GoogleOneTapSignIn.presentExplicitSignIn();

    if (isCancelledResponse(response)) {
      throw new GoogleAuthCancelledError();
    }
    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new Error('Google did not return a valid identity token. Please try another account.');
    }

    return response.data;
  } catch (error) {
    if (isGoogleAuthCancelled(error)) throw error;
    throw googleSetupError(error);
  }
}

export async function clearGoogleSession(): Promise<void> {
  try {
    GoogleOneTapSignIn.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || 'autoDetect',
    });
    await GoogleOneTapSignIn.signOut();
  } catch {
    // Firebase remains the source of truth for the app session. A missing native
    // Google configuration must not prevent email users from signing out.
  }
}
