# Android Build & Google Play

Dia 96-100's "Android Build & Testing" needs the same class of real external
account this project has hit repeatedly (Stripe, AWS S3, email, and Dia
91-95's own Apple Developer Program requirement) — here it's a **Google Play
Developer account** (US\$25 one-time, cheaper than Apple's annual fee) plus
the same EAS/Expo account IOS_BUILD.md already covers (confirmed "Not logged
in" on this machine, not assumed). Neither exists in this environment.

## What's already done, for real

`app.json`'s `android.package` (`com.techspeaking.app`) and
`android.versionCode` were set alongside iOS's equivalents (Dia 91-95's
"configure iOS build" commit) since `app.json` is one shared config file for
both platforms — there was nothing Android-specific left to add there.
`eas.json`'s `preview` profile already targets `buildType: "apk"` (a direct-
installable file, the right format for Play's **internal testing** track and
for sideloading onto a device without going through Play at all); the
`production` profile has no `buildType` override, which means EAS defaults to
an **AAB** (Android App Bundle) — the format Play Store submission actually
requires.

`src/services/pushNotifications.js` (Dia 91-95) is cross-platform — the same
`registerForPushNotificationsAsync` call handles both iOS and Android, no
Android-specific JS was needed. One genuine platform difference worth noting:
for **basic Expo push notifications** (what this app uses), you likely don't
need your own Firebase project at all — EAS can provision FCM credentials on
Expo's behalf automatically during `eas build`. A real Firebase project +
`google-services.json` would only be needed for direct/advanced FCM features
this app doesn't use, so none is included here (and a fabricated one would be
actively misleading, not a real credential).

## Exact steps once you have both accounts

```bash
npx eas-cli login
cd packages/mobile
npx eas-cli build:configure   # same one-time step IOS_BUILD.md covers - only needs running once for both platforms

npx eas-cli build --platform android --profile preview
# First run offers to generate a new Android keystore for you (the
# recommended path, same reasoning as iOS's managed certificates)
```

For **Google Play internal testing** specifically:

1. Create the app in [Google Play Console](https://play.google.com/console).
2. Testing → Internal testing → Create a release, upload the `.apk`/`.aab`
   EAS just built (or run `npx eas-cli submit --platform android --latest`
   to upload directly from EAS).
3. Add internal testers by email; they install via the Play Store's internal
   testing opt-in link, no separate app needed (unlike TestFlight, no extra
   client app to install first).

## Testing on a real device today - no account needed

Everything above needs a Play Developer account and an EAS build. There's a
genuinely real path that needs **neither**: the free
[Expo Go](https://expo.dev/go) app plus a tunnel connection.

```bash
npm run start:tunnel --workspace=packages/mobile
# Prints a QR code. Scan it with Expo Go (Android) or the Camera app
# (iOS) - --tunnel routes through Expo's relay, so the phone doesn't
# need to be on the same Wi-Fi as this machine.
```

This runs the exact same JS this project has been verifying through the
`mobile-web` preview (Player, Chat, Flashcards, Dashboard, auth) on a real
physical device, with real native modules (`expo-audio`, `expo-notifications`
running for real, not the web-platform no-op) - genuinely the most direct
verification available without any paid account. It does **not** replace an
EAS build for distribution (Expo Go is a development sandbox, not what ships
to end users), but it is real device testing.

## Shipping updates without a new APK (EAS Update)

Every fix in this project's real-device testing so far has meant a brand new
`.apk` download and reinstall - real friction for a tester, and eventually
for actual customers if this app is ever sideloaded/distributed outside Play
(where Play's own store listing would otherwise handle update delivery).
`expo-updates` (installed) + `eas update:configure`'s output in `app.json`
(`runtimeVersion.policy: "appVersion"`, `updates.url`) close most of that
gap: **once a build that includes this config is installed**, the app checks
for a published update on every cold start and applies it on the _next_
launch - no download link, no reinstall, nothing the end user has to do.

To publish a JS-only update to whoever already has a `preview`-channel build
installed:

```bash
npm run update:preview --workspace=packages/mobile -- --message "describe what changed"
```

**The real limit, stated plainly**: this only covers JavaScript/asset
changes. Anything that touches native code or config - a new native
dependency (this project hit exactly that with `react-native-svg`/
`@react-native-community/slider` this session), a permission, an icon, an
`app.json` native field - still needs a real `eas build` + a new install,
the same as before. EAS Update is the fix for "I changed some UI/logic," not
"I added a native module." And since this config only takes effect starting
with the build it first ships in, the very next `.apk` install is a one-time
requirement before any of this works at all - nothing changes retroactively
for a build already on a device today.

## Verified vs. not verified

**Verified for real**: the full Dia 86-90 feature set plus Dia 91-95's push-
notification registration code all run correctly through the `mobile-web`
preview (Chromium via `react-native-web`) — see CLAUDE.md's Dia 86-90/91-95
entries for the exact steps exercised.

**Not verified, cannot be from this environment**: this sandboxed environment
has no phone to scan the Expo Go QR code with, and no Android
SDK/emulator installed locally (`adb`/`emulator` confirmed absent, not
assumed) - so the Expo Go path above is documented and ready, but has not
itself been run end-to-end from here. Same standing category as every
"verified via mobile-web, not a real device" gap since Dia 81-85.
