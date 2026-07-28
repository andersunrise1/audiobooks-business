# Android Build & Google Play

Dia 96-100's "Android Build & Testing" needs the same class of real external
account this project has hit repeatedly (Stripe, AWS S3, email, and Dia
91-95's own Apple Developer Program requirement) — here it's a **Google Play
Developer account** (US\$25 one-time, cheaper than Apple's annual fee) plus
the same EAS/Expo account IOS_BUILD.md already covers (confirmed "Not logged
in" on this machine, not assumed). Neither exists in this environment.

## What's already done, for real

`app.json`'s `android.package` (`com.techspeak.mobile`) and
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
