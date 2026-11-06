# Google AdMob setup

Ad-supported free tier (2026-11-06 decision, alongside expanding the free
catalog from 2 to 8 audiobooks — see `../PRICING.md`'s "Free" section and
`packages/backend/MONETIZATION.md` for the reasoning). This covers the real
AdMob account setup this dev machine doesn't have yet; the code itself
(`src/services/ads.js`, `src/components/BannerAdSlot.jsx`,
`src/hooks/useChapterInterstitialAd.js`) is already built and ships with
Google's own published **test** IDs as placeholders, so nothing breaks
before a real account exists — it just shows test ads during development.

## 1. Create an AdMob account

1. Go to [admob.google.com](https://admob.google.com) and sign in with the
   same Google account used for Play Console (not required to be the same
   account, but simpler).
2. Accept the AdMob Terms of Service, set your payment/country details
   (needed before any ad unit can actually earn money, not before testing).

## 2. Add the app and create ad units

1. Apps → Add app. If the app is already live on Play Store, AdMob can
   link it directly by searching the package name
   (`com.techspeaking.app`); if not published yet, choose "No" and add it
   manually (you can link it to the real Play Store listing later once
   published).
2. Note the **App ID** AdMob gives you (`ca-app-pub-XXXXXXXX~XXXXXXXX`
   format) — this replaces `app.json`'s `androidAppId` placeholder (see
   step 3 below).
3. Ad units → Add ad unit, create two:
   - **Banner** (format: Banner) — used on `AudiobookListScreen`.
   - **Interstitial** (format: Interstitial) — used after a chapter
     completes.
4. Note each ad unit's **Ad unit ID** (`ca-app-pub-XXXXXXXX/XXXXXXXX`
   format, different suffix shape from the App ID above).

## 3. Wire the real IDs into the code

Two places, both currently holding Google's test values:

1. `app.json`'s `react-native-google-mobile-ads` plugin entry —
   `androidAppId` (the real App ID from step 2.2; `iosAppId` can stay the
   test value until there's a real iOS app/account, same standing gap as
   `GOOGLE_PLAY_BILLING.md`'s Android-only scope).
2. `src/services/ads.js`'s `AD_UNIT_IDS` — `banner`/`interstitial`, the
   two real ad unit IDs from step 2.4.

Both changes need a **new EAS build** (`eas build --platform android
--profile preview`), not `eas update` — this is native config, not a JS/
asset-only change (same rule every other native dependency this project
has added follows, see `ANDROID_BUILD.md`).

## 4. Test before going live

Never click your own real ads — Google can ban an AdMob account for
"invalid traffic" from the account owner's own clicks, even accidental
ones. Two safe ways to verify a real integration:

- Keep using `TestIds.BANNER`/`TestIds.INTERSTITIAL` (the current default)
  until the whole flow is confirmed working, then swap to real IDs only
  for the final verification pass.
- Register your test device: run the app once with real ad unit IDs, find
  the "Use RequestConfiguration.Builder.setTestDeviceIds" hashed device id
  logged to logcat/Metro, and add it to AdMob's device list (Testing menu)
  — ads served to a registered test device are clearly marked "Test Ad" on
  screen and never count as real impressions/clicks.

## What's already built

- `src/services/ads.js` — `initializeAds()` gathers UMP/GDPR consent
  (`AdsConsent.gatherConsent()`) before `mobileAds().initialize()`, called
  once on app startup (`AppNavigator.jsx`, gated on `isReady` not login).
  `shouldShowAds(user)` is the single source of truth for whether ads show
  at all — `false` on iOS (no account/build yet), `false` for a
  `plan === 'pro'` account (Vitalicio removes ads, per `PRICING.md`).
- `src/components/BannerAdSlot.jsx` — a banner shown as
  `AudiobookListScreen`'s list header.
- `src/hooks/useChapterInterstitialAd.js` — one interstitial per chapter
  completion (`PlayerScreen.jsx`'s `handleEnded`), using the v17
  options-form `useInterstitialAd` hook (auto-loads, auto-reloads after
  close, press-safe `show()`).
- **Web has no ads** (`ads.web.js`/`BannerAdSlot.web.jsx`/
  `useChapterInterstitialAd.web.js`, resolved by Metro instead of the real
  files for web builds) — `react-native-google-mobile-ads` documents no
  web support, and the real files were split preemptively on that basis
  (same failure mode `GOOGLE_PLAY_BILLING.md` already hit and documents
  for `expo-iap`'s `useIAP`, which does throw `Cannot find native module`
  from its own listener setup on web) rather than deliberately reproducing
  the crash first. What was verified live via the `mobile-web` preview is
  that the `.web` variants render cleanly with zero console errors:
  register → browse the (now 8) free audiobooks with no lock icon → play
  "Daily Standup" to completion (`handleEnded` fires, chapter marked
  "concluído") with no crash from the interstitial no-op call.

## Not done, honestly

No real AdMob account/ad units exist on this dev machine yet — the app
ships with Google's test IDs until that changes (see steps 1-3 above). No
real device has shown a real ad (same standing gap as `GOOGLE_PLAY_BILLING.md`'s
"no real Play Billing purchase exercised" — both need a real EAS build on
a physical Android device). Ads are mobile-only; the website and desktop
app have no ad surface (an honest, deliberate scope decision — see
`MONETIZATION.md`'s gap list for why).
