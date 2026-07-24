# OmniTask environments

OmniTask uses three isolated application identities and Firebase projects. A build must never reuse another environment's Firebase project or native service file.

| Environment | EAS profile | Android package / iOS bundle ID | Firebase alias |
|---|---|---|---|
| Development | `development` | `com.vincentements_007.omnitask.dev` | `development` |
| Staging | `preview` | `com.vincentements_007.omnitask.staging` | `staging` |
| Production | `production` | `com.vincentements_007.omnitask` | `production` |

Only the development project currently exists in `.firebaserc`. Add the staging and production aliases only after creating those separate Firebase projects:

```powershell
npx.cmd firebase use --add
```

Choose the new project, enter `staging` or `production` as the alias, and never point either alias at the development project.

## Firebase setup for each environment

1. Create a separate Firebase project.
2. Enable Email/Password and Google Authentication.
3. Create Firestore in production mode and deploy `firestore.rules`.
4. Enable Storage when available and deploy `storage.rules`.
5. Register an Android app using the exact package ID from the table.
6. Register an iOS app using the exact bundle ID from the table.
7. Add the Android signing SHA-1 and SHA-256 fingerprints used for that environment.
8. Download the native Firebase files into `config/firebase` using the filenames in [the configuration-file guide](../config/firebase/README.md).
9. Add the Firebase web configuration values to that environment in EAS.
10. Configure Maps, notifications, Functions, and any server-side secrets independently.

Set these EAS variables in the matching EAS environment:

```text
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
OMNITASK_EXPECTED_FIREBASE_PROJECT_ID
GOOGLE_MAPS_API_KEY
```

`OMNITASK_EXPECTED_FIREBASE_PROJECT_ID` must equal `EXPO_PUBLIC_FIREBASE_PROJECT_ID`. App configuration fails if they differ. Staging and production also fail if they reference OmniTask's development project or omit required Firebase values.

Native service files are intentionally ignored by Git. Supply them locally before a native build, or set the `GOOGLE_SERVICES_FILE` and `GOOGLE_SERVICE_INFO_FILE` paths in a secure build environment.

Android EAS builds fail configuration when `GOOGLE_MAPS_API_KEY` or
`GOOGLE_SERVICES_FILE` is missing. This prevents an apparently successful
development build whose Event map or Google authentication cannot initialize.

## Key restrictions

- Create a separate Maps key for each environment.
- For Android Maps keys, use the Android application restriction with the environment's package name and signing SHA-1.
- For iOS Maps keys, use the iOS application restriction with the environment's bundle ID.
- Restrict each key's API access to only the APIs OmniTask uses.
- Register every environment's package and signing certificate for Google Sign-In.
- Do not copy a development native service file into staging or production. `app.config.js` verifies Android project ID and package name.

### Development Android Maps identity

The separated development app no longer uses the production package. Its Maps
key must allow these Android identities:

| Build | Package | SHA-1 |
|---|---|---|
| EAS development client | `com.vincentements_007.omnitask.dev` | `C5:B0:AE:F7:18:B1:FA:CC:55:9A:45:2B:94:48:A2:69:7A:89:12:43` |
| Local debug build | `com.vincentements_007.omnitask.dev` | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |

Use a dedicated development key and restrict its API access to **Maps SDK for
Android**. The original `com.vincentements_007.omnitask` restriction applies
only to the production identity and does not authorize the `.dev` app.

## Local and EAS commands

Validate local development configuration:

```powershell
Set-Location C:\MyProjects\omnitask
$env:OMNITASK_ENV = 'development'
npx.cmd expo config --type public
```

Build development, staging, or production:

```powershell
eas.cmd build --profile development --platform android
eas.cmd build --profile preview --platform android
eas.cmd build --profile production --platform android
```

The Dashboard shows `DEV` or `STAGING` in non-production builds. Production has no environment badge.

## Development reset safety

The reset utility now requires all four safeguards:

- the exact `--confirm` argument;
- `OMNITASK_ENV=development`;
- `.firebaserc` default project matching its `development` alias;
- service-account credentials belonging to that same development project.

Run it only from PowerShell:

```powershell
Set-Location C:\MyProjects\omnitask
$env:OMNITASK_ENV = 'development'
$env:GOOGLE_APPLICATION_CREDENTIALS = (Resolve-Path -LiteralPath '.\firebase-reset\service-account.json').Path
node .\firebase-reset\reset-firebase.js --confirm
```

The script exits before initializing Firebase Admin if any project or environment check fails.

## Release verification matrix

Complete this matrix on actual builds before promoting an environment:

| Check | Development | Staging | Production |
|---|---:|---:|---:|
| Correct app name/package and environment badge | Required | Required | Required |
| Email/password sign-in and verification | Required | Required | Required |
| Google account selection and returning-user data | Required | Required | Required |
| Firestore offline create/edit/delete and reconnect | Required | Required | Required |
| Storage upload/download/delete on two devices | Required | Required | Required |
| Functions target the matching project | Required | Required | Required |
| Map loads and location recovery works | Required | Required | Required |
| Notifications work in a development/release build | Required | Required | Required |
| No documents appear in another environment | Required | Required | Required |

Staging and production project provisioning is an external Firebase/EAS setup step. The repository guardrails are implemented, but this initiative is not fully verified until all three real projects pass this matrix.
