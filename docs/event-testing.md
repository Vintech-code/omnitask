# Event location and verification

The event location picker stores a place label plus latitude/longitude. Android development and production builds should provide a Google Maps SDK key before prebuilding:

```powershell
$env:GOOGLE_MAPS_API_KEY='your-android-maps-sdk-key'
npx expo run:android
```

Keep the key out of source control and restrict it to the OmniTask Android package and signing certificate.

`expo-location` and `react-native-maps` contain native Android code. Installing their npm packages is not enough: uninstall the old development app and rebuild it whenever either package is first added or upgraded:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb uninstall com.vincentements_007.omnitask
npx expo prebuild --platform android
npm run android
```

The red `Cannot find native module 'ExpoLocation'` screen means Metro is sending the new JavaScript bundle to an older native development build. Reloading Metro cannot fix that binary mismatch.

Run the event unit and screen tests:

```powershell
npm run test:events
```

To verify the Android OS permission-denied state and actual local-notification delivery, install and start a development build on an authorized device or emulator, then run:

```powershell
npm run test:device:notifications
```

The device test temporarily revokes and restores the app's notification permission and does not work in Expo Go. It automatically checks `PATH`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and the default Windows Android SDK directory for `adb.exe`. You can also pass an explicit path directly to the PowerShell script with `-AdbPath`.
