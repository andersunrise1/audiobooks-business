import { Platform } from 'react-native';
import mobileAds, { AdsConsent, TestIds } from 'react-native-google-mobile-ads';

// Google Play Billing is Android-only in this app (no iOS account/build
// yet - see ../GOOGLE_PLAY_BILLING.md) and ads follow the same scoping:
// shipping ads on an iOS build that doesn't exist would just be untested
// code, not real revenue.
const ADS_PLATFORM = Platform.OS === 'android';

// Real ad unit IDs from the AdMob account created 2026-11-24 (see
// ../ADMOB.md). The app registered there is "TECHSPEAKING" (Android).
//
// Flip USE_TEST_ADS to true during development. This matters more than it
// looks: **never click your own real ads**. Google bans AdMob accounts for
// "invalid traffic" even when the click was accidental, and there is no easy
// appeal. Test ads are labelled "Test Ad" on screen and are safe to tap.
const USE_TEST_ADS = false;

export const AD_UNIT_IDS = USE_TEST_ADS
  ? { banner: TestIds.BANNER, interstitial: TestIds.INTERSTITIAL }
  : {
      banner: 'ca-app-pub-1938532240303090/2989395809',
      interstitial: 'ca-app-pub-1938532240303090/3605754731',
    };

// Vitalicio (plan === 'pro') removes ads entirely - the same check the
// paywall itself already uses (AudiobookListScreen's `isPro`), just read
// here for a rendering decision instead of a 403.
export function shouldShowAds(user) {
  return ADS_PLATFORM && user?.plan !== 'pro';
}

let initPromise = null;

// Called once per app session (AppNavigator, on startup - not gated on
// login, since consent/SDK init isn't about having an account). Consent
// must be gathered before mobileAds().initialize() - Google's own UMP
// requirement, since ads can start preloading on init.
// AdsConsent.gatherConsent() is the one-call helper: it requests consent
// info and only shows the UMP form if the user's region actually requires
// it (EU/UK) - most of this app's Brazilian audience sees nothing, but the
// check still runs since AdMob serves globally and this app doesn't
// geofence the consent logic itself.
export async function initializeAds() {
  if (!ADS_PLATFORM) return { canRequestAds: false };
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const consentInfo = await AdsConsent.gatherConsent();
        if (consentInfo.canRequestAds) {
          await mobileAds().initialize();
        }
        return consentInfo;
      } catch (err) {
        console.error('ad consent/init failed', err);
        return { canRequestAds: false };
      }
    })();
  }
  return initPromise;
}
