// Metro resolves this instead of ads.js for web builds (the mobile-web
// preview) - react-native-google-mobile-ads has no web implementation.
// No ads on web yet (honest gap, MONETIZATION.md); this keeps
// AppNavigator's startup call to initializeAds() a safe no-op on web
// instead of importing a package that can't run there.
export const AD_UNIT_IDS = { banner: null, interstitial: null };

export function shouldShowAds() {
  return false;
}

export async function initializeAds() {
  return { canRequestAds: false };
}
