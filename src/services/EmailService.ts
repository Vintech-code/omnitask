import { sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';

import { auth } from '@/config/firebase';

type EmailResponse = { ok: true; message: string; cooldownSeconds?: number };

export async function requestVerificationEmail(): Promise<EmailResponse> {
  const user = auth.currentUser;

  if (!user) {
    throw Object.assign(new Error('Sign in before requesting verification.'), {
      code: 'auth/requires-recent-login',
    });
  }

  if (user.emailVerified) {
    return { ok: true, message: 'Email is already verified.', cooldownSeconds: 0 };
  }

  // Firebase Auth sends this securely from its backend. No email provider key is
  // bundled in the app, and the hosted Firebase action handler completes the flow.
  await sendEmailVerification(user);
  return {
    ok: true,
    message: 'Verification email sent.',
    cooldownSeconds: 60,
  };
}

export async function requestPasswordResetEmail(email: string): Promise<EmailResponse> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    // Do not disclose whether an account exists. Firebase may return this code
    // when email-enumeration protection is not enabled for the project.
    if ((error as { code?: string })?.code !== 'auth/user-not-found') throw error;
  }

  return {
    ok: true,
    message: 'If an account exists, a password reset email has been sent.',
  };
}
