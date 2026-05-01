import React from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { adsEnabled } from './adsConfig';

// TODO (production): Replace TestIds.BANNER with your real banner ad unit ID:
//   ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
const BANNER_UNIT_ID = TestIds.BANNER;

export function AdBanner() {
  if (!adsEnabled) return null;
  return (
    <View style={{ alignItems: 'center', backgroundColor: '#0f0f0f' }}>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={(err) => console.error('[AdMob] Banner failed:', err.message)}
      />
    </View>
  );
}
