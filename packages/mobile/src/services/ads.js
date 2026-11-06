import { Platform } from 'react-native';
import mobileAds, { AdsConsent, TestIds } from 'react-native-google-mobile-ads';

// Google Play Billing is Android-only in this app (no iOS account/build
// yet - see ../GOOGLE_PLAY_BILLING.md) and ads follow the same scoping:
// shipping ads on an iOS build that doesn't exist would just be untested
// code, not real revenue.
const ADS_PLATFORM = Platform.OS === 'android';

// TODO: replace with real ad unit IDs from your AdMob account once it
// exists (see ../ADMOB.md) - these are Google's own published TEST ids,
// safe to ship as placeholders during development. A real id without a
// real AdMob account/app linked just fails to fill (no revenue, no risk),
// but clicking your own real ads to "test" them can get the AdMob account
// banned for invalid traffic - always test with TestIds until real IDs
// are wired in and verified on a real device.
export const AD_UNIT_IDS = {
  banner: TestIds.BANNER,
  interstitial: TestIds.INTERSTITIAL,
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
