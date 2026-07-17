type AuthErrorLike = {
  code?: string;
  message?: string;
};

export function authErrorMessage(error: unknown): string {
  const candidate = error as AuthErrorLike | null;
  const code = candidate?.code;
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'The email or password is incorrect.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support for help.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Wait a few minutes, then try again.';
    case 'auth/network-request-failed':
    case 'auth/timeout':
      return 'Firebase could not be reached. Check your connection, disable any DNS blocker or VPN that blocks Google APIs, then try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled for this Firebase project.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email. Sign in using its original method, then link Google from your profile.';
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized':
      return 'This app is not authorized by its Firebase configuration.';
    case 'auth/internal-error':
      return 'Firebase could not complete the request. Please try again.';
    default:
      return candidate?.message || 'Something went wrong. Please try again.';
  }
}
