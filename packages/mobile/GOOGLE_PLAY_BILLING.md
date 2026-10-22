# Google Play Billing (mobile purchase flow)

Why this exists, and the backend half of this feature (verifying a purchase
token, granting `plan = 'pro'`): see
[../backend/GOOGLE_PLAY_BILLING.md](../backend/GOOGLE_PLAY_BILLING.md). This
file is the client side: `PricingScreen.jsx` (the Android/native version)
uses [expo-iap](https://github.com/hyochan/expo-iap) to buy the
`techspeak_vitalicio` one-time product through real Google Play Billing,
then POSTs the resulting purchase token to
`POST /api/payment/google-play/verify`.

## Why there are two PricingScreen files

`PricingScreen.jsx` is the real implementation (used on Android, and iOS if
this app is ever built for it). `PricingScreen.web.jsx` is a separate,
simpler screen Metro resolves instead whenever bundling for web (the
`mobile-web` preview this project verifies through) - `expo-iap`'s `useIAP`
hook has no web implementation and throws an uncaught `Cannot find native
module 'ExpoIap'` from its own internal listener setup the moment it mounts,
even before any purchase is attempted. Since Play Billing genuinely can't
work on web anyway (there's no Play Store there), the web variant skips
`expo-iap` entirely instead of trying to suppress that error.

This only works because `AppNavigator.jsx` imports it as
`'../screens/PricingScreen'` with **no extension** - every other import in
this codebase includes `.jsx` explicitly, but Metro's platform-specific file
resolution (`.web.jsx` vs `.jsx`) only kicks in for an extension-less
specifier. If you ever rename or re-import `PricingScreen`, keep that one
import extension-less or the web build will break the same way again.

## Native dependencies added

- `expo-iap` - the purchase library itself (buys/verifies against Google
  Play, confirms OpenIAP).
- `expo-build-properties` - required to pin `android.kotlinVersion` to
  `2.2.0` (expo-iap's own requirement), set via `app.json`'s `plugins`
  array.

Both are real native code - like `expo-audio`/`expo-notifications` before
them, this needs a **new EAS build**, not `eas update` (same rule
`ANDROID_BUILD.md`'s "Shipping updates without a new APK" section already
documents for any native dependency change).

## Testing a real purchase - what Play Billing actually requires

Unlike most of this app's features (verifiable via the `mobile-web` preview
or Expo Go), **Play Billing cannot be tested without all of these**:

1. The app must exist in Play Console (even just as a draft/internal-testing
   entry - see `../backend/GOOGLE_PLAY_BILLING.md` step 4 for creating the
   `techspeak_vitalicio` product once the app exists).
2. Your Google account must be added as a **license tester**: Play Console >
   Setup > License testing > add the Gmail address you'll test with. An
   unlisted tester trying to "buy" a real product either sees a real charge
   or a confusing error, not a safe sandbox purchase.
3. A **real EAS build** installed on a real Android device - Expo Go and the
   `mobile-web` preview both lack the native Play Billing module entirely
   (confirmed directly: `mobile-web`'s console shows `Cannot find native
module 'ExpoIap'` the instant `PricingScreen.jsx`'s real version mounts -
   exactly why the `.web.jsx` split above exists).
4. The build's `applicationId`/signing must match what Play Console expects
   for that app - a build from `eas build --profile preview` (APK, per
   `ANDROID_BUILD.md`) works the same way it already does for every other
   real-device test this project has done.

```bash
cd packages/mobile
npx eas-cli build --platform android --profile preview
# Install the resulting APK on a device signed into a license-tester Google account
```

Once installed: log in, open a paywalled audiobook (or the Upgrade link),
tap "Comprar Vitalício". Google's real purchase sheet should appear showing
the license-tester sandbox price. After confirming, the app calls
`POST /api/payment/google-play/verify` - check the backend logs/DB
(`users.plan`, `users.google_play_purchase_token`) to confirm it actually
granted access, not just that the Play purchase sheet closed successfully.

## Verified vs. not verified

**Verified for real, in this environment**: the `mobile-web` preview loads
`PricingScreen.web.jsx` correctly (no `expo-iap` import, no console error),
shows the right owned/not-owned state for a real logged-in account, and the
web build overall still bundles cleanly with `expo-iap`/`expo-build-
properties` installed (confirmed by a clean `Web Bundled` log after a Metro
cache clear - the module itself doesn't break the web build, only mounting
`useIAP` inside it does, which is exactly what the `.web.jsx` split avoids).

**Not verified, cannot be from this environment**: an actual Play Billing
purchase, since that needs a real Play Console app + product + license
tester + EAS build + physical Android device, none of which exist here yet
(same standing category as `ANDROID_BUILD.md`'s own "no Android SDK/emulator
installed" gap). The backend's own `POST /api/payment/google-play/verify`
logic is covered by integration tests that mock the Android Publisher API
(`packages/backend/tests/integration/payment.test.js`) - a genuine end-to-end
purchase remains the one boundary only a real device/account can close.
