import { useCallback, useEffect, useRef } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import RewardedAdManager from '../ads/RewardedAdManager';
import { adsEnabled } from '../ads/adsConfig';

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('', message, [{ text: 'OK' }]);
  }
}

/**
 * Hook that gates an action behind a rewarded ad.
 *
 * Usage:
 *   const { requestWithAd } = useRewardedAd();
 *   <Button onPress={() => requestWithAd(startAction)} />
 */
export function useRewardedAd() {
  const manager = useRef(adsEnabled ? RewardedAdManager.getInstance() : null);

  // Trigger preload on mount so the ad is ready when the user taps
  useEffect(() => {
    manager.current?.load();
  }, []);

  /**
   * Shows a rewarded ad then calls onGranted on success.
   * Handles all edge cases: ad not ready, dismissed, failed.
   * When ads are disabled via EXPO_PUBLIC_ADS_ENABLED=false, onGranted runs immediately.
   */
  const requestWithAd = useCallback((onGranted: () => void) => {
    if (!adsEnabled) {
      onGranted();
      return;
    }
    const mgr = manager.current!;

    if (!mgr.isReady) {
      // Ad hasn't loaded yet — give the user a choice
      Alert.alert(
        'Ad Unavailable',
        'The ad could not be loaded. Would you like to continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue Anyway', onPress: onGranted },
        ]
      );
      return;
    }

    // Inform the user before showing the ad
    Alert.alert(
      'Watch a Short Ad',
      'Watch a short ad to unlock this feature.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Watch Ad',
          onPress: () => {
            const shown = mgr.show({
              onRewarded: onGranted,
              onDismissed: () => {
                showToast('You need to watch the ad to use this feature.');
              },
              onFailed: (err) => {
                console.error('[AdMob] Failed to show ad:', err.message);
                Alert.alert(
                  'Ad Failed',
                  'The ad could not be displayed. Would you like to continue anyway?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Continue Anyway', onPress: onGranted },
                  ]
                );
              },
            });

            if (!shown) {
              // Ad became unavailable between the ready check and show call
              Alert.alert(
                'Ad Unavailable',
                'The ad is no longer available. Would you like to continue anyway?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Continue Anyway', onPress: onGranted },
                ]
              );
            }
          },
        },
      ]
    );
  }, []);

  return { requestWithAd };
}
