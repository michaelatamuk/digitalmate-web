# Android build and signing

The native shell is Capacitor 8 with the existing web app in `dist/`. Local mode remains the
default; no login or account is required.

## Requirements

- Node 22+
- JDK 21
- Android SDK with **platform 36** and **build-tools 36.0.0**
- Android Studio or a command-line Gradle setup

## Build

```bash
npm ci
npm run android:sync
cd android
./gradlew assembleDebug
```

Debug APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Open in Android Studio:

```bash
npm run android:open
```

CI also builds a debug APK in `.github/workflows/android.yml` and uploads it as
`digitalmate-debug-apk`.

## Local features

- chats, memory, artifacts, backup and settings: local only
- attachments and PDF extraction: local only
- sharing: native share sheet through `@capacitor/share`
- notifications: local notifications through `@capacitor/local-notifications`
- home-screen widget: static launcher widget in `DigitalMateWidget.java`
- PWA service worker: not needed inside the native WebView

## RSS and Orbit on Android

The bundled WebView has no `/api` server. Set an absolute hosted bridge at build time:

```bash
$env:VITE_API_BASE='https://bridge.example.com'
npm run android:sync
```

Without it, RSS import and Orbit mode fail gracefully; all local features still work.

## Release signing

Provide these environment variables or CI secrets:

```text
ANDROID_KEYSTORE_PATH
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Then:

```bash
cd android
./gradlew assembleRelease
```

The Gradle file only applies the release signing config when `ANDROID_KEYSTORE_PATH` is set.
Never commit a keystore or passwords.

## Widget, shortcuts and Quick Settings

Long-press the Android home screen → Widgets → DigitalMate. The widget is
intentionally static and account-free; tapping it opens the app and the refresh
action updates the widget.

The app also registers:

- App shortcuts for **New chat** and **Discover**
- A Quick Settings tile (`DigitalMateTileService`)
- A share-sheet target for `text/plain`; shared text is placed in the composer
- Notification-tap routing back to the task list

The tile and shortcuts are Android approximations of HarmonyOS atomic services.

## Updates

The web Settings screen checks the latest GitHub release and links to the APK
or release page. The Android manifest requests `REQUEST_INSTALL_PACKAGES` so a
downloaded APK can be installed through the system installer. A store-managed
update flow is still future work.

## Remaining physical verification

APK compilation is automated, but these still need a real phone/tablet:

- notification permission and delivery
- native share sheet
- widget placement and launch
- safe areas and keyboard behavior
- Android back-button behavior
