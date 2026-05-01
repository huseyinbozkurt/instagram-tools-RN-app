import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { AdBanner } from '../../src/ads/AdBanner';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <View>
          <AdBanner />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerStyle: { backgroundColor: '#0f0f0f' },
        headerTintColor: '#f0f0f0',
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { backgroundColor: '#0f0f0f', borderTopColor: '#1a1a1a' },
        tabBarActiveTintColor: '#dc2743',
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Unfollowers',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="downloader"
        options={{
          title: 'Download',
          tabBarIcon: ({ color, size }) => <Ionicons name="cloud-download-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
