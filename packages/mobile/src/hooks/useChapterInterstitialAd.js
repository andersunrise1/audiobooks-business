import { useCallback, useEffect } from 'react';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, shouldShowAds } from '../services/ads.js';

// One interstitial per chapter-completion event (PlayerScreen's
// handleEnded) - the natural break point this project settled on instead
// of showing ads mid-playback (see PRICING.md's "Free" section). A null
// adUnitId when ads shouldn't show at all (anonymous/pro/iOS,
// shouldShowAds) keeps the hook from ever loading an ad it would never
// show.
export function useChapterInterstitialAd(user) {
  const enabled = shouldShowAds(user);
  const { status, show, load } = useInterstitialAd({
    adUnitId: enabled ? AD_UNIT_IDS.interstitial : null,
    autoLoad: enabled,
  });

  // autoLoad only covers the very first load - reload after the shown ad
  // closes so the next chapter completion has a fresh one ready.
  useEffect(() => {
    if (status === 'closed') load();
  }, [status, load]);

  const showIfReady = useCallback(() => {
    if (status === 'loaded') show();
  }, [status, show]);

  return { showIfReady };
}
