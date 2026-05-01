import { AdEventType, AppOpenAd, TestIds } from 'react-native-google-mobile-ads';
import { adsEnabled } from './adsConfig';

// TODO (production): Replace TestIds.APP_OPEN with your real app open ad unit ID:
//   ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
const AD_UNIT_ID = TestIds.APP_OPEN;

let shownThisLaunch = false;

/**
 * Loads and shows an App Open ad once per cold start.
 * Safe to call multiple times — only the first call schedules a show.
 */
export function showAppOpenAdOnce() {
  if (!adsEnabled || shownThisLaunch) return;
  shownThisLaunch = true;

  const ad = AppOpenAd.createForAdRequest(AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });

  const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
    console.log('[AdMob] App open ad loaded');
    try {
      ad.show();
    } catch (err) {
      console.error('[AdMob] App open show failed:', err);
    }
  });

  const cleanup = () => {
    unsubLoaded();
    unsubError();
    unsubClosed();
  };

  const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error: Error) => {
    console.error('[AdMob] App open error:', error.message);
    cleanup();
  });

  const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    console.log('[AdMob] App open closed');
    cleanup();
  });

  ad.load();
}
