# Recess

Recess is an Android-first React Native app that helps users limit app usage, track foreground app time, and block apps with a cooldown overlay when limits are reached.

## Stack

- React Native 0.73
- TypeScript
- React Navigation
- AsyncStorage
- `react-native-background-actions`

## Getting Started

1. Install dependencies.
2. Start Metro with `npm start`.
3. Run the Android app with `npm run android`.

## Scripts

- `npm start` - start the Metro bundler
- `npm run android` - build and launch the Android app
- `npm run lint` - run ESLint
- `npm run test` - run Jest
- `npm run typecheck` - run the TypeScript compiler without emitting files

## Project Structure

- `src/app` - app bootstrap, DI, and navigation
- `src/core` - shared constants, hooks, errors, utilities, and types
- `src/data` - storage and native adapters plus repositories
- `src/domain` - use cases
- `src/features` - screen-level view models and UI
- `src/services` - background tracking and permissions services
