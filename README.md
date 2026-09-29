# Recess

Recess is an Android-first React Native app that helps users limit app usage, track foreground app time, and block apps with a cooldown overlay when limits are reached.

## Stack

- React Native 0.73
- TypeScript
- React Navigation
- AsyncStorage
- `react-native-background-actions`

## Getting Started

1. Install dependencies with `npm install`.
2. Install JDK 17 and the Android SDK (platform 35, build-tools 35, NDK 25.1), then set
   `export ANDROID_HOME=$HOME/Library/Android/sdk`.
3. Connect a device with USB debugging enabled and follow "Building for a device" below.

## Building for a device

The app loads its bundled JavaScript (`getUseDeveloperSupport()` is `false`), so Metro is not
used at runtime. Always build the **release** variant: its Gradle build regenerates the JS
bundle from `src/` on every build and it is signed with the debug keystore, so it installs
over an existing debug install and keeps app data.

```bash
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

`npx react-native run-android --mode release --no-packager` does the same in one step.

Do not use a debug build to check JavaScript changes: it loads the checked-in
`android/app/src/main/assets/index.android.bundle`, which is not regenerated.

## Scripts

- `npm start` - start the Metro bundler (not used by release builds)
- `npm run android` - RN CLI build and launch (see "Building for a device" for the variant to use)
- `npm run lint` - run ESLint
- `npm run test` - run Jest
- `npm run typecheck` - run the TypeScript compiler without emitting files
- `(cd android && ./gradlew testDebugUnitTest)` - run the Kotlin unit tests

## Project Structure

- `src/app` - app bootstrap, DI, and navigation
- `src/core` - shared constants, hooks, errors, utilities, and types
- `src/data` - storage and native adapters plus repositories
- `src/domain` - use cases
- `src/features` - screen-level view models and UI
- `src/services` - background tracking and permissions services
