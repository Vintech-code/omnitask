# Firebase Google authentication setup

OmniTask now uses Android Credential Manager to obtain a Google ID token, then signs into the existing Firebase Auth instance with that token. Email/password and Google users therefore share the same app session, Firestore profile, offline storage, onboarding, and sign-out flow.

## Firebase Console

1. Open Firebase project `omnitask-d5b47`.
2. Go to **Authentication > Sign-in method > Google**, enable it, choose a support email, and save.
3. Go to **Project settings > Your apps** and add or open the Android app with package name:

   `com.vincentements_007.omnitask`

4. Add this SHA-1 for the checked-in Android debug keystore:

   `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

5. Download the updated `google-services.json` and place it at the project root, beside `package.json`. Do not rename it or commit it to a public repository.

Release builds must also register the SHA-1 of the release/EAS signing certificate. Get the Expo-managed certificate fingerprint with `eas credentials -p android`, add it in the same Firebase Android app, and download the JSON again.

## Verify and rebuild

Run these commands from the project root:

```powershell
npm run auth:google:check
npx expo prebuild --platform android
npx expo run:android
```

This is a native dependency, so Metro reload alone is not enough. Rebuild whenever the native Google authentication package or config plugin changes. A new `google-services.json` that only changes OAuth clients normally requires another native build because Android resources are generated from it.

## Common failures

- `DEVELOPER_ERROR`: package name, SHA-1, or Web OAuth client does not match the installed build.
- “This sign-in method is not enabled”: enable Google under Firebase Authentication providers.
- No accounts or Google Play services error: update Google Play services and test on a Google-enabled emulator/device.
- Debug works but release fails: add the release/EAS certificate SHA-1 to Firebase and rebuild the release app.
