import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import MobileAds from 'react-native-google-mobile-ads';
import { WebViewBridgeProvider } from '../src/bridge/WebViewBridge';
import { adsEnabled } from '../src/ads/adsConfig';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    if (adsEnabled) {
      MobileAds()
        .initialize()
        .then(() => console.log('[AdMob] SDK initialized'))
        .catch((err: Error) => console.error('[AdMob] Init failed:', err.message));
    } else {
      console.log('[AdMob] Ads disabled via EXPO_PUBLIC_ADS_ENABLED');
    }

    SplashScreen.hideAsync();
  }, []);

  return (
    <WebViewBridgeProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </WebViewBridgeProvider>
  );
}
