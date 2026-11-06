// Metro resolves this instead of BannerAdSlot.jsx for web builds (the
// mobile-web preview) - react-native-google-mobile-ads has no web
// implementation, same reasoning as PricingScreen.web.jsx and
// ../hooks/useChapterInterstitialAd.web.js. No ads on web yet (honest gap,
// MONETIZATION.md) - this renders nothing rather than a broken import.
export default function BannerAdSlot() {
  return null;
}
