import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBridge } from '../../src/bridge/WebViewBridge';
import { useUnfollowerCheck } from '../../src/hooks/useUnfollowerCheck';
import { useRewardedAd } from '../../src/hooks/useRewardedAd';
import { UserCard } from '../../src/components/UserCard';
import type { NonFollower } from '../../src/instagram/types';

export default function UnfollowersScreen() {
  const bridge = useBridge();
  const { status, progress, results, stats, checkedAt, error, start, cancel, reset } = useUnfollowerCheck();
  const { requestWithAd } = useRewardedAd();
  const [filter, setFilter] = useState('');

  const filtered = filter.trim()
    ? results.filter((u) =>
        u.username.toLowerCase().includes(filter.toLowerCase()) ||
        u.fullName.toLowerCase().includes(filter.toLowerCase()))
    : results;

  if (bridge.isLoggedIn === false) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>Not logged in</Text>
        <Text style={styles.body}>Log in to Instagram to use this feature.</Text>
        <TouchableOpacity style={styles.btn} onPress={bridge.showLogin}>
          <Text style={styles.btnText}>Log In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (bridge.isLoggedIn === null) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#dc2743" /></SafeAreaView>;
  }

  if (status === 'running') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#dc2743" />
        <Text style={styles.progressText}>{progress || 'Starting\u2026'}</Text>
        <Text style={styles.hint}>Requests are spaced out to stay safe</Text>
        <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={cancel}>
          <Text style={styles.ghostText}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={reset}>
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (status === 'done') {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.statsRow}>
          <Stat label="Following" value={stats.following} />
          <Stat label="Followers" value={stats.followers} />
          <Stat label="Not back" value={results.length} highlight />
        </View>
        {checkedAt && (
          <Text style={styles.checkedAt}>Last checked: {new Date(checkedAt).toLocaleString()}</Text>
        )}
        <TextInput
          style={styles.search}
          value={filter}
          onChangeText={setFilter}
          placeholder="Filter by username\u2026"
          placeholderTextColor="#444"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        <FlatList<NonFollower>
          data={filtered}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => <UserCard user={item} />}
          ListEmptyComponent={
            <Text style={styles.empty}>{filter ? 'No matches' : 'Everyone follows you back! 🎉'}</Text>
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        />
        <TouchableOpacity style={[styles.btn, styles.btnBottom]} onPress={reset}>
          <Text style={styles.btnText}>Run Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.center}>
      <Text style={styles.icon}>👥</Text>
      <Text style={styles.title}>Unfollowers Check</Text>
      <Text style={styles.body}>Find accounts you follow that don't follow you back. Requests are spaced out to avoid detection.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => requestWithAd(start)}>
        <Text style={styles.btnText}>Start Check</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={[styles.stat, highlight && styles.statHl]}>
      <Text style={[styles.statVal, highlight && styles.statValHl]}>{value.toLocaleString()}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { color: '#f0f0f0', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  empty: { color: '#555', textAlign: 'center', paddingTop: 60, fontSize: 14 },
  progressText: { color: '#f0f0f0', fontSize: 15, marginTop: 16, textAlign: 'center' },
  hint: { color: '#555', fontSize: 12, marginTop: 6 },
  errorText: { color: '#e05a5a', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  checkedAt: { color: '#555', fontSize: 11, textAlign: 'center', marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 8, padding: 16 },
  stat: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  statHl: { borderColor: '#dc2743', backgroundColor: '#1f0d10' },
  statVal: { color: '#f0f0f0', fontSize: 22, fontWeight: '700' },
  statValHl: { color: '#ff6b6b' },
  statLbl: { color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  search: { backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a', color: '#f0f0f0', fontSize: 14, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginBottom: 8 },
  btn: { backgroundColor: '#dc2743', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', minWidth: 180 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#2a2a2a', marginTop: 12 },
  ghostText: { color: '#666', fontWeight: '600', fontSize: 14 },
  btnBottom: { margin: 16 },
});
