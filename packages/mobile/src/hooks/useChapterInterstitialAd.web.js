// Metro resolves this instead of useChapterInterstitialAd.js when
// bundling for web (the mobile-web preview) - react-native-google-mobile-ads
// has no web implementation, same reasoning as PricingScreen.web.jsx and
// ../services/ads.js. A no-op so PlayerScreen's handleEnded can call
// showIfReady() unconditionally regardless of platform.
export function useChapterInterstitialAd() {
  return { showIfReady: () => {} };
}
