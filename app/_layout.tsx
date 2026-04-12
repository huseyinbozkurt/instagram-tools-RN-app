import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WebViewBridgeProvider } from '../src/bridge/WebViewBridge';

export default function RootLayout() {
  return (
    <WebViewBridgeProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </WebViewBridgeProvider>
  );
}
