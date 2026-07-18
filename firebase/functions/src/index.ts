import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth, type ActionCodeSettings } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

import { passwordResetTemplate, verificationTemplate, welcomeTemplate } from './emailTemplates';
import { EmailDeliveryError, sendEmailWithRetry } from './sendgrid';

initializeApp();

const REGION = 'asia-southeast1';
const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const SENDGRID_FROM_EMAIL = defineString('SENDGRID_FROM_EMAIL');
const SENDGRID_FROM_NAME = defineString('SENDGRID_FROM_NAME', { default: 'OmniTask' });
const APP_CONTINUE_URL = defineString('APP_CONTINUE_URL', { default: 'https://omnitask-d5b47.firebaseapp.com' });
const APP_LOGO_URL = defineString('APP_LOGO_URL');

const db = getFirestore();
const auth = getAuth();
const brand = () => ({ logoUrl: APP_LOGO_URL.value(), productName: 'OmniTask' });
const from = () => ({ email: SENDGRID_FROM_EMAIL.value(), name: SENDGRID_FROM_NAME.value() });
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

const actionSettings = (): ActionCodeSettings => ({
  url: APP_CONTINUE_URL.value(),
  handleCodeInApp: false,
  android: { packageName: 'com.vincentements_007.omnitask', installApp: false },
});

async function enforceCooldown(key: string, seconds: number): Promise<void> {
  const ref = db.collection('_emailRateLimits').doc(key);
  const now = Timestamp.now();
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const nextAllowedAt = snapshot.get('nextAllowedAt') as Timestamp | undefined;
    if (nextAllowedAt && nextAllowedAt.toMillis() > now.toMillis()) {
      throw new HttpsError('resource-exhausted', 'Please wait before requesting another email.');
    }
    transaction.set(ref, {
      nextAllowedAt: Timestamp.fromMillis(now.toMillis() + seconds * 1000),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function enforceWindowLimit(key: string, maximum: number, windowSeconds: number): Promise<void> {
  const ref = db.collection('_emailRateLimits').doc(key);
  const now = Date.now();
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const windowStartedAt = snapshot.get('windowStartedAt') as Timestamp | undefined;
    const count = (snapshot.get('count') as number | undefined) ?? 0;
    const activeWindow = windowStartedAt && now - windowStartedAt.toMillis() < windowSeconds * 1000;
    if (activeWindow && count >= maximum) throw new HttpsError('resource-exhausted', 'Too many requests. Try again later.');
    transaction.set(ref, {
      windowStartedAt: activeWindow ? windowStartedAt : Timestamp.fromMillis(now),
      count: activeWindow ? count + 1 : 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

export const sendVerificationEmail = onCall(
  { region: REGION, secrets: [SENDGRID_API_KEY], timeoutSeconds: 30 },
  async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before requesting verification.');
    const user = await auth.getUser(request.auth.uid);
    if (!user.email || !validEmail(user.email)) throw new HttpsError('failed-precondition', 'This account has no valid email address.');
    if (user.emailVerified) return { ok: true as const, message: 'Email is already verified.', cooldownSeconds: 0 };

    await enforceCooldown(`verify_${user.uid}`, 60);
    const link = await auth.generateEmailVerificationLink(user.email, actionSettings());
    const template = verificationTemplate(brand(), user.displayName || 'there', link);
    try {
      await sendEmailWithRetry(SENDGRID_API_KEY.value(), {
        to: user.email,
        from: from(),
        ...template,
        customArgs: { template: 'verification', uid: user.uid },
      });
      logger.info('Verification email sent', { uid: user.uid });
      return { ok: true as const, message: 'Verification email sent.', cooldownSeconds: 60 };
    } catch (error) {
      logger.error('Verification email delivery failed', { uid: user.uid, error });
      throw new HttpsError('unavailable', 'Verification email could not be delivered. Try again shortly.');
    }
  },
);

export const sendPasswordResetEmail = onCall(
  { region: REGION, secrets: [SENDGRID_API_KEY], timeoutSeconds: 30 },
  async request => {
    const rawEmail = typeof request.data?.email === 'string' ? request.data.email : '';
    const email = normalizeEmail(rawEmail);
    if (!validEmail(email) || email.length > 254) throw new HttpsError('invalid-argument', 'Enter a valid email address.');

    const requestIp = request.rawRequest.ip || 'unknown';
    await enforceWindowLimit(`reset_ip_${hash(requestIp)}`, 10, 60 * 60);
    await enforceCooldown(`reset_${hash(email)}`, 60);
    try {
      const user = await auth.getUserByEmail(email);
      const hasPassword = user.providerData.some(provider => provider.providerId === 'password');
      if (!hasPassword) {
        logger.info('Reset request ignored for non-password account', { emailHash: hash(email) });
        return { ok: true as const, message: 'If a password account exists, a reset email has been sent.' };
      }
      const link = await auth.generatePasswordResetLink(email, actionSettings());
      const template = passwordResetTemplate(brand(), user.displayName || 'there', link);
      await sendEmailWithRetry(SENDGRID_API_KEY.value(), {
        to: email,
        from: from(),
        ...template,
        customArgs: { template: 'password-reset', uid: user.uid },
      });
      logger.info('Password reset email sent', { uid: user.uid });
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      if (code === 'auth/user-not-found') {
        logger.info('Reset request ignored for unknown account', { emailHash: hash(email) });
      } else if (error instanceof EmailDeliveryError) {
        logger.error('Password reset email delivery failed', { emailHash: hash(email), statusCode: error.statusCode });
        throw new HttpsError('unavailable', 'Reset email could not be delivered. Try again shortly.');
      } else {
        logger.error('Password reset link generation failed', { emailHash: hash(email), error });
        throw new HttpsError('internal', 'Unable to process the reset request.');
      }
    }
    return { ok: true as const, message: 'If a password account exists, a reset email has been sent.' };
  },
);

export const sendWelcomeEmail = onDocumentCreated(
  { document: 'users/{userId}', region: REGION, secrets: [SENDGRID_API_KEY], retry: true },
  async event => {
    const uid = event.params.userId;
    const deliveryRef = db.collection('_emailDeliveries').doc(`welcome_${event.id}`);
    const claimed = await db.runTransaction(async transaction => {
      const existing = await transaction.get(deliveryRef);
      const status = existing.get('status') as string | undefined;
      const leaseUntil = existing.get('leaseUntil') as Timestamp | undefined;
      if (status === 'sent' || (status === 'sending' && leaseUntil && leaseUntil.toMillis() > Date.now())) return false;
      transaction.set(deliveryRef, {
        type: 'welcome', uid, status: 'sending',
        leaseUntil: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return true;
    });
    if (!claimed) return;

    try {
      const user = await auth.getUser(uid);
      if (!user.email || !validEmail(user.email)) {
        await deliveryRef.set({ status: 'skipped', reason: 'missing-email', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return;
      }
      const template = welcomeTemplate(brand(), user.displayName || 'there');
      await sendEmailWithRetry(SENDGRID_API_KEY.value(), {
        to: user.email,
        from: from(),
        ...template,
        customArgs: { template: 'welcome', uid },
      });
      await deliveryRef.set({ status: 'sent', sentAt: FieldValue.serverTimestamp(), leaseUntil: FieldValue.delete() }, { merge: true });
      logger.info('Welcome email sent', { uid });
    } catch (error) {
      const retryable = error instanceof EmailDeliveryError ? error.retryable : true;
      await deliveryRef.set({ status: retryable ? 'retryable' : 'failed', updatedAt: FieldValue.serverTimestamp(), leaseUntil: FieldValue.delete() }, { merge: true });
      logger.error('Welcome email failed', { uid, retryable, error });
      if (retryable) throw error;
    }
  },
);
