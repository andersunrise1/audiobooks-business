import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, shouldShowAds } from '../services/ads.js';

// Renders nothing for an anonymous visitor, a Vitalicio account, or on iOS
// (shouldShowAds) - a Vitalicio purchase removing ads is the explicit
// PRICING.md promise, not an incidental side effect.
export default function BannerAdSlot({ user }) {
  if (!shouldShowAds(user)) return null;

  return (
    <View style={styles.wrap}>
      <BannerAd unitId={AD_UNIT_IDS.banner} size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
