# OmniTask authentication email setup

OmniTask currently uses Firebase Authentication's built-in verification and password-reset emails. This is the secure Spark-plan path: it needs neither Cloud Functions nor Secret Manager, and no SendGrid key is exposed to the mobile app.

## Active free architecture

- Email/password signup creates the Firebase account and immediately calls Firebase Auth's `sendEmailVerification`.
- Unverified sessions can only open `EmailVerificationScreen`. Root navigation and Firestore rules enforce the gate.
- The verification screen displays the account email, supports refresh and logout, and limits resend attempts with a 60-second client cooldown. Firebase also applies backend abuse limits.
- Forgot Password uses Firebase Auth's `sendPasswordResetEmail` and always shows a generic success response so the UI does not reveal registered addresses.
- Google accounts are already verified by Google/Firebase and proceed normally.

## Firebase Console setup

1. Open **Firebase Console -> Authentication -> Sign-in method** and ensure **Email/Password** and **Google** are enabled.
2. Open **Authentication -> Templates**.
3. Edit **Email address verification** and **Password reset** with the OmniTask sender name, subject, and message text available in the console.
4. Keep the default Firebase-hosted action URL unless you later build and host a custom email action handler.
5. Open **Authentication -> Settings -> Authorized domains** and keep `omnitask-d5b47.firebaseapp.com` authorized.

Firebase's built-in templates are intentionally less customizable than the responsive SendGrid HTML templates. They provide secure verification/reset links without running your own backend.

## Deploy the verified-user security gate

From the project root:

```bash
npx firebase-tools login
npx firebase-tools use omnitask-d5b47
npx firebase-tools deploy --only firestore:rules
```

Do **not** run `functions:secrets:set SENDGRID_API_KEY` or deploy functions while the project remains on Spark.

## Test

1. Sign up with a new email/password account.
2. Confirm OmniTask opens the verification screen and blocks the main workspace.
3. Confirm the verification email arrives; check spam if necessary.
4. Open its link, return to OmniTask, and press **I've verified my email**.
5. Sign out, press **Forgot password?**, and request a reset.
6. Confirm the reset message arrives and its hosted Firebase link changes the password.
7. Test no network, invalid email, resend cooldown, repeated taps, and an unknown reset address.

The Firebase Spark plan has daily Authentication email limits. Monitor usage and avoid automated tests that repeatedly send real email.

## Optional SendGrid upgrade later

The production-oriented SendGrid implementation remains under `firebase/functions`, including responsive OmniTask templates, validation, rate limits, logging, retries, and secret usage. It is inactive and is not referenced by the mobile app.

When Blaze is affordable:

1. Upgrade the Firebase project.
2. Verify a SendGrid sender/domain and create a key with only **Mail Send** permission.
3. Store the key with `npx firebase-tools functions:secrets:set SENDGRID_API_KEY`.
4. Configure the non-secret values described by `firebase/functions/.env.example`.
5. Switch `src/services/EmailService.ts` back to authenticated callable functions.
6. Deploy with the isolated configuration:

```bash
npm --prefix firebase/functions install
npm --prefix firebase/functions run build
npx firebase-tools --config firebase.sendgrid.json deploy --only functions
```

Do not put a SendGrid key in `.env.local`, Expo config, application code, or the APK. A custom automatic welcome email also needs a trusted backend; it is intentionally disabled on the free client-only path.
