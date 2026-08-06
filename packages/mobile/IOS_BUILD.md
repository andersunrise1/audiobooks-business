# iOS Build & TestFlight

Dia 91-95's "iOS Build & Testing" needs three things this dev environment
genuinely doesn't have, and none of them are things Claude Code can create on
your behalf — they all require you personally:

1. **An Apple Developer Program membership** (US$99/year, real legal
   identity). Required for TestFlight and App Store Connect — there's no way
   around this, it's Apple's own gate for iOS distribution.
2. **An Expo/EAS account** (free tier is enough). `eas-cli` is installed
   (`npx eas-cli --version` works) but `npx eas-cli whoami` returns
   "Not logged in" on this machine — confirmed directly, not assumed.
3. A way to actually run `eas login` / `eas build` interactively, which
   needs a real terminal session, not this sandboxed environment.

Same category of gap as Stripe (Dia 47), AWS S3 (Dia 43), and email (Dia
57-58) elsewhere in this project: the integration code/config is real and
ready, the external account isn't.

## What's already done, for real

- `app.json`: `ios.bundleIdentifier` (`com.techspeaking.app`, the final
  identifier decided 2026-08-06 — bundle IDs are permanent once published, so
  this can't change again after the first real build) and `ios.buildNumber`
  set.
- `eas.json`: `development`/`preview`/`production` build profiles (the
  standard EAS layout — `preview` for internal/TestFlight-style distribution,
  `production` for App Store submission with `autoIncrement` so you don't
  have to bump `buildNumber` by hand every release).
- `expo-notifications` + `expo-constants` installed and configured
  (`app.json`'s `plugins` array) — see the "Push notifications" section
  below.

## Exact steps once you have both accounts

```bash
npx eas-cli login
# Follow the prompts (Expo account credentials)

cd packages/mobile
npx eas-cli build:configure
# Creates a real EAS project and replaces app.json's
# extra.eas.projectId placeholder with a real one

npx eas-cli build --platform ios --profile preview
# First run will prompt for Apple ID + prompts EAS to manage
# certificates/provisioning profiles for you (the recommended path -
# don't hand-manage certificates unless you have a reason to)
```

Once a build finishes, EAS gives you a build URL. From there:

```bash
npx eas-cli submit --platform ios --latest
# Uploads the build to App Store Connect / TestFlight
```

Then in [App Store Connect](https://appstoreconnect.apple.com): create the
app record (if not already done via `build:configure`), add internal/external
testers to TestFlight, and the build becomes installable via the TestFlight
app once Apple finishes its automated processing (usually minutes, sometimes
longer for the first build).

## Push notifications

`src/services/pushNotifications.js`'s `registerForPushNotificationsAsync`
requests permission and fetches an Expo push token — real, working code, but
only reachable past the `projectId` check once `eas build:configure` has run
(see above). It's called once on login (`AppNavigator.jsx`), not on every
app open.

**Not done, honestly**: there's no backend endpoint to save a device's push
token (`POST /api/user/push-token` or equivalent doesn't exist), so even with
real EAS/Apple credentials, no server code would ever _send_ a push yet —
that's a real gap, not wired up because there was nothing to test it against
without the token pipeline above being reachable first. Building the
send-side without ever being able to verify a real push arrives would be the
same mistake this project has deliberately avoided elsewhere (no
half-built features).

## Verified vs. not verified

**Verified for real**: `expo-notifications`/`expo-constants` import and
initialize without crashing on the `mobile-web` preview (the
`Platform.OS === 'web'` guard short-circuits before touching any native-only
API) — confirmed via a live console-error check, not assumed from reading the
library's docs.

**Not verified, cannot be from this environment**: an actual EAS build
completing, a real device receiving a push notification, TestFlight
installation, or App Store Connect's review process. All of this needs your
Apple Developer + Expo accounts and, for a truly native build, is best run
from a real terminal (EAS Build itself runs in Expo's cloud, so a Mac isn't
required — but interactive `eas login`/`eas build` still needs a real TTY
session this sandboxed environment doesn't have).
