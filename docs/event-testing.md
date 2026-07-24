# Event location and verification

The event location picker stores a place label plus latitude/longitude. Android
development builds use package `com.vincentements_007.omnitask.dev`. The Maps
key must allow that exact package and the signing SHA-1 used by the installed
build.

For a local development build, provide the key before prebuilding:

```powershell
$env:OMNITASK_ENV='development'
$env:GOOGLE_MAPS_API_KEY='your-android-maps-sdk-key'
npx.cmd expo run:android
```

Keep the key out of source control. Restrict a development key to:

```text
Application restriction: Android apps
Package name: com.vincentements_007.omnitask.dev
SHA-1: the fingerprint from the local debug keystore or EAS development keystore
API restriction: Maps SDK for Android
```

Local debug and EAS development builds can use different signing certificates.
If both are installed during development, add both package/SHA-1 pairs to the
development Maps key.

`expo-location` and `react-native-maps` contain native Android code. Installing their npm packages is not enough: uninstall the old development app and rebuild it whenever either package is first added or upgraded:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb uninstall com.vincentements_007.omnitask.dev
$env:OMNITASK_ENV='development'
npx.cmd expo prebuild --platform android
npm.cmd run android
```

The red `Cannot find native module 'ExpoLocation'` screen means Metro is sending the new JavaScript bundle to an older native development build. Reloading Metro cannot fix that binary mismatch.

EAS development builds require both `GOOGLE_MAPS_API_KEY` and the
`GOOGLE_SERVICES_FILE` file variable in the EAS `development` environment.
`app.config.js` now fails an Android EAS build early when either input is
missing instead of producing a client with a broken Event map or authentication.

Run the event unit and screen tests:

```powershell
npm run test:events
```

To verify the Android OS permission-denied state and actual local-notification delivery, install and start a development build on an authorized device or emulator, then run:

```powershell
npm run test:device:notifications
```

The device test temporarily revokes and restores the app's notification permission and does not work in Expo Go. It automatically checks `PATH`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and the default Windows Android SDK directory for `adb.exe`. You can also pass an explicit path directly to the PowerShell script with `-AdbPath`.
