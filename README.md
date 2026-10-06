# Recess

Recess is an Android app that limits your time in the apps that eat it (Instagram and friends),
in the spirit of Opal. Pick the apps, give each a **session limit**, a **cooldown** and an optional
**daily budget**, and turn Recess **ON**. It stays on until you turn it off.

When a limit is reached, Recess:

1. posts **one** notification: the quote is on its first line, and expanding it shows your
   unfinished goals and when the app opens again,
2. covers the screen at once with a full-screen **cover** (quote, goals, when the app is back), and
3. opens the **Break screen** on top of it: a full-screen React Native screen with a live countdown,
   the quote, and your goals as big rows you can **tick off right there** (each tick pops, vibrates
   and throws a little confetti). **Okay, I'm out** takes you to the real home screen.

The paused app stays unusable for the whole cooldown: every time you open it again (from Recents, a
notification, anywhere) the same cover and Break screen come back within about a second. The cover
lifts as soon as you are in Recess or on the home screen, when the cooldown ends, or when you turn
Recess off.

## How it works

```
React Native (JS)                       Android (Kotlin)
─────────────────                       ───────────────────────────────────────────
Home / Add app / Goals / Break   ──▶    RecessPrefs (SharedPreferences)
   settings only, no timers              intent (ON/OFF), rules, goals, engine state,
                                         heartbeat, stop reason, extra quotes
                                                    ▲
                                                    │ read every second
                                         MonitorService  (foreground service, START_STICKY)
                                           ├─ ForegroundAppDetector  (UsageStatsManager events)
                                           ├─ EnforcementEngine      (pure: session + daily rules)
                                           └─ ActionSink             (HOME intent, notification, Break)
                                         BootReceiver · RestartScheduler · WatchdogWorker
                                           bring the service back after boot / kill / update
```

The JavaScript side is only a **configuration UI**. All enforcement lives in a native foreground
service, so it keeps working when the React Native runtime is gone (app swiped away, process
reclaimed). The toggle shows the user's *stored intent*, read from native storage, never a guess
held in JS memory.

Rules, per app:

| Setting | Meaning |
|---|---|
| Session limit | Minutes of use before you are sent home |
| Cooldown | How long the app stays blocked afterwards; the session then starts again at 0 |
| Daily budget (optional, default 60) | Total minutes per local day. When it runs out the app is blocked until local midnight, whatever the cooldown says. "No cap" turns it off |

The daily budget must be at least one session. If both trip on the same tick the daily block wins.

## What it cannot do (please read)

Being honest about the limits is part of the design:

- **It cannot kill another app, and many phones will not even let it open the home screen.** Since
  Android 14 only the system can kill apps, and some phones (a OnePlus on Android 16 was the test
  device) refuse every attempt by a background service to start the home screen. Recess still
  tries, backs off when it is refused, and relies on the cover window instead. The app stays
  running underneath, so its sound may keep playing until you leave it.
- **"Force stop" in system settings stops Recess for good** until you open it again. Android
  guarantees this. Recess notices on the next open (and says so), and restarts itself after a
  reboot or an app update, but it cannot prevent a force stop.
- **Some phone makers (ColorOS/OxygenOS, MIUI, One UI, ...) kill background apps aggressively.**
  Recess keeps a heartbeat, shows an "interrupted" note on Home with the reason when it was
  stopped unexpectedly, and shows maker-specific battery guidance. Allowing Recess to ignore
  battery optimisation and locking it in the recents list helps.
- Time is measured from the system's usage events. **Time while the screen is off or locked is
  not counted.** The system clock is trusted (changing it can shift a cooldown).
- **Parallel apps / work-profile copies** of an app have a different package name and are not
  covered unless you add them separately.
- The app is sideloaded and personal: it uses a foreground service of type `specialUse`, which
  the Play Store would require a declaration for.

## Permissions

| Permission | Why |
|---|---|
| Usage access (`PACKAGE_USAGE_STATS`, granted in Settings) | See which app is in the foreground |
| Display over other apps (`SYSTEM_ALERT_WINDOW`) | Lets the service send you home and draw the full-screen time's-up window from the background |
| `POST_NOTIFICATIONS` | The limit notification and the "Recess is active" notification |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE` | Keep the monitor alive; `specialUse` has no time limit and may start after boot |
| `RECEIVE_BOOT_COMPLETED` | Start the monitor again after a reboot or an update |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Ask (not force) to be excluded from battery optimisation |
| `USE_FULL_SCREEN_INTENT` | Show the notification full screen where Android allows it |
| `VIBRATE` | A short tap when you flip a switch or tick a goal off |
| `INTERNET` | **Only** for the optional online quotes (below). Nothing else uses the network |

## Quotes and goals

- **Goals & to-dos** is one combined list (up to 20 items). Unfinished ones appear in the
  notification (up to 5, then "+N more") and on the Break screen.
- **115 curated quotes** ship inside the app and are shown in random order without repeats
  until the whole set has been used. This works with no network.
- **Online quotes (optional, off by default)**: turn on *Fresh quotes from the internet* on the
  Goals screen and Recess fetches a batch from [ZenQuotes](https://zenquotes.io/) at most once a
  day and adds it to the pool. Anything from the internet is untrusted: it is filtered by a strict
  **allowlist** (plain Latin letters and ordinary punctuation, no digits, links, symbols or hidden
  characters), checked again natively before it is stored and again before it is used, capped at
  200 and de-duplicated. Turning the switch off deletes them at once, including from the saved
  Break-screen snapshot, and an in-flight fetch cannot bring them back.
  The JS and Kotlin filters are tested against one shared list of cases
  (`__tests__/fixtures/quote-validation-cases.json`), so they cannot drift apart.
- The notification hides the quote and goals on the lock screen (private version shows only the
  headline).

## Getting started

1. `npm install`
2. Install JDK 17 and the Android SDK (platform 35, build-tools 35, NDK 25.1), then set
   `export ANDROID_HOME=$HOME/Library/Android/sdk`.
3. Connect a phone with USB debugging enabled and follow "Building for a device".
4. Open Recess, grant usage access and the overlay permission, add an app and turn **ON**.

### Building for a device

The app loads its bundled JavaScript (`getUseDeveloperSupport()` is `false`), so Metro is not used
at runtime. **Always build the release variant**: its Gradle build regenerates the JS bundle from
`src/` on every build, and it is signed with the debug keystore, so it installs over an existing
debug install and keeps app data.

```bash
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

`npx react-native run-android --mode release --no-packager` does the same in one step.

The JS bundle is a build product and is not committed (`android/app/src/main/assets/index.android.bundle`
is git-ignored). A debug build has no bundle to load, so do not use one to check JavaScript
changes. On upgrading from an older install you need to switch **ON** once: earlier versions never
stored the ON/OFF choice natively.

### Checking that it really stays on

```bash
scripts/verify-persistence.sh
```

With the phone attached and Recess ON, the script checks that the service is running, that it
comes back after you swipe the app out of Recents, that a force stop (which Android does not allow
Recess to survive) takes it down until you open the app again, that it comes back after a reboot,
and that turning it OFF stays OFF for three minutes (the negative test). Steps that need you
(swiping, rebooting) are announced and wait for your confirmation. It never changes settings.

For a live view of what the service is doing: `adb logcat -s Recess`.

### Metro

`npm start` binds Metro to `127.0.0.1` only. The React Native CLI that ships with React Native 0.73
(12.3.x) is affected by an unauthenticated remote-code-execution flaw when Metro listens on all
interfaces (CVE-2025-11953); do not change `--host`. Release builds never contact Metro.

## Scripts

- `npm run lint` - ESLint
- `npm test` - Jest (JS unit tests)
- `npm run typecheck` - TypeScript without emitting files
- `(cd android && ./gradlew testDebugUnitTest)` - Kotlin unit tests (needs `ANDROID_HOME`)
- `npm start` - Metro (not used by release builds)

## Project structure

JavaScript (`src/`), clean architecture, screens → view models → use cases → repositories → data
sources, wired in `src/app/di.ts`:

- `app` - bootstrap, DI, navigation, deep link (`recess://break`)
- `core` - constants, errors, shared types and utilities
- `data` - AsyncStorage, native-module adapters, the quotes API client, repositories
- `domain` - use cases and pure rules (limit validation, quote validation)
- `features` - `home`, `add-app`, `goals`, `break`: view model + screen each
- `services` - thin handles for the tracker and permissions

Native (`android/app/src/main/java/com/appblocker/`):

- `engine` - `EnforcementEngine`: pure, clock-injected decisions (no Android imports)
- `detector` - foreground-app detection from usage events with an incremental cursor
- `service` - `MonitorService`, the tick loop, boot/restart/watchdog revival, health probe
- `store` - `RecessPrefs`: the single owner of everything persisted
- `notify` - the limit notification and the Break deep link
- `quotes` - bundled quotes, the no-repeat shuffle bag, the online-quote filter
- `modules` - the React Native bridge (`MonitorConfigModule`, `UsageStatsModule`, `AppListModule`)

Everything that can be decided without Android (engine, ticker, stores, formatting, revival policy,
validators) is unit-tested with fakes; the Android glue is kept thin.

## Design decisions

**AD1 - Enforcement runs natively, JS is only a configuration UI.** The JS runtime was the fragile
part: the old tracker lived in memory, its "running" flag was lost with the process, and its
restart path did nothing. `react-native-background-actions` and its local patch were removed.

**AD2 - Persist the user's intent, not process state.** The ON/OFF choice is written durably
(synchronously) to native storage and changed only by a tap on the toggle. If it says ON and the
service is not running, the service is started again and the user is told. A storage read failure
never switches enforcement off.

**AD3 - Foreground service type `specialUse`.** The old `dataSync` type is capped at 6 hours per 24
on Android 15+ and cannot start from a boot receiver; `specialUse` has neither restriction.

**AD4 - A pure engine holds every decision.** `tick(now, foreground app, rules)` returns actions.
The "announce once, then only eject" rule, cooldown across restarts, midnight and DST days are
proven by tests rather than eyeballed. Engine state is saved as JSON and restored after a restart,
so killing the process cannot be used to skip a cooldown.

**AD5 - "Kill" is "keep it covered until the cooldown ends".** Android does not allow killing other
apps, and on some phones not even sending them home. The block is announced once; after that,
every tick the blocked app is in front the cover window is (idempotently) put up, and a HOME
intent is tried at most every 1.5 s, or every 30 s once the phone has clearly refused it. (On the
test phone the home-screen launch is accepted only while Recess has a visible window, i.e. while
the cover is up, so the cover doubles as the thing that lets the app be sent home. The cover's
buttons therefore launch first and remove the window afterwards.)

**AD6 - Bundled quotes first; online quotes are an opt-in extra.** The service must work with no
network at the moment a limit is hit. Fetched quotes are treated as hostile input (allowlist,
double validation, kill switch).

**AD7 - One notification per limit event, and a takeover in two layers.** Fixed id, replaced not
stacked; reopening a blocked app during the cooldown never posts again. Since Android 10 a background
service is often refused when it starts an *activity*, but the phone accepts one while a window of
ours is visible. So the first layer is a plain overlay window added by the service (instant, only
needs the overlay permission, full-bleed, with Go home / Open Recess buttons); the second is the
real Break screen, started ~300 ms later while the cover is up, where goals can be ticked. A
`TakeoverCoordinator` plans each episode (one continuous stretch of the paused app in front): cover,
Break launch, one retry, and only then a plain home-screen attempt as a last resort, so a HOME can
never land on top of the Break screen.

**AD8 - JS keeps AsyncStorage, native keeps a mirror.** Every change to rules or goals is pushed to
native, and everything is pushed again on each app start (which also migrates old installs). Native
never reads AsyncStorage. A rules list that cannot be read is never pushed, so a storage glitch
cannot wipe the native copy.

Not built: an AccessibilityService fallback for sending apps home. It is only worth its
permission and Play-policy cost if the overlay-based launch turns out to be blocked on a device.

## Troubleshooting

- **The toggle says ON but nothing is enforced**: open Home; the health card lists what is missing
  (usage access, overlay, notifications, battery optimisation) or that the monitor stopped and why.
- **Nothing shows after building**: you installed a debug build. Use the release recipe above.
- **`adb` says unauthorized**: unlock the phone and accept the USB-debugging prompt again.
