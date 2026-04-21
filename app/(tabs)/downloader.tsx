import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBridge } from '../../src/bridge/WebViewBridge';
import { useMediaDownload } from '../../src/hooks/useMediaDownload';
import { useRewardedAd } from '../../src/hooks/useRewardedAd';
import { MediaSelector } from '../../src/components/MediaSelector';

export default function DownloaderScreen() {
  const bridge = useBridge();
  const {
    stage, items, selected, downloadProgress, error, pastedUrl,
    readClipboard, toggleSelect, download, reset,
  } = useMediaDownload();
  const { requestWithAd } = useRewardedAd();

  if (bridge.isLoggedIn === false) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={styles.title}>Not logged in</Text>
        <Text style={styles.body}>Log in to Instagram to download media.</Text>
        <TouchableOpacity style={styles.btn} onPress={bridge.showLogin}>
          <Text style={styles.btnText}>Log In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (bridge.isLoggedIn === null) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#dc2743" /></SafeAreaView>;
  }

  if (stage === 'done') {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="checkmark-circle" size={64} color="#4cd964" />
        <Text style={[styles.title, { marginTop: 16 }]}>Saved to Library</Text>
        <Text style={styles.body}>
          {selected.size} {selected.size === 1 ? 'item' : 'items'} saved to your photo library.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={reset}>
          <Text style={styles.btnText}>Download Another</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (stage === 'error') {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#e05a5a" />
        <Text style={[styles.body, { color: '#e05a5a', marginTop: 16 }]}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={reset}>
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (stage === 'fetching') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#dc2743" />
        <Text style={{ color: '#f0f0f0', fontSize: 15, marginTop: 16 }}>Fetching media info\u2026</Text>
      </SafeAreaView>
    );
  }

  if (stage === 'selecting' || stage === 'downloading') {
    const isDownloading = stage === 'downloading';
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.urlBox}>
            <Ionicons name="link-outline" size={14} color="#555" />
            <Text style={styles.urlText} numberOfLines={1}>{pastedUrl}</Text>
          </View>
          <View style={styles.selHeader}>
            <Text style={{ color: '#f0f0f0', fontSize: 15, fontWeight: '600' }}>
              {items.length} {items.length === 1 ? 'item' : 'items'} found
            </Text>
            <Text style={{ color: '#555', fontSize: 13 }}>{selected.size} selected</Text>
          </View>
          <MediaSelector
            items={items}
            selected={selected}
            onToggle={toggleSelect}
            downloadProgress={downloadProgress}
            isDownloading={isDownloading}
          />
        </ScrollView>
        {!isDownloading && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, styles.btnFull, selected.size === 0 && { opacity: 0.4 }]}
              onPress={() => requestWithAd(download)}
              disabled={selected.size === 0}
            >
              <Ionicons name="cloud-download-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>
                {' '}Save {selected.size} {selected.size === 1 ? 'Item' : 'Items'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={reset}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Idle
  return (
    <SafeAreaView style={styles.center}>
      <Ionicons name="cloud-download-outline" size={56} color="#333" />
      <Text style={styles.title}>Download Media</Text>
      <Text style={styles.body}>
        Copy an Instagram post, reel, story, or highlight link, then tap the button below.
        For carousels and highlights you can pick which items to save.
      </Text>
      {error ? <Text style={{ color: '#e05a5a', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={readClipboard}>
        <Ionicons name="clipboard-outline" size={18} color="#fff" />
        <Text style={styles.btnText}> Paste from Clipboard</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { color: '#f0f0f0', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  urlBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1a1a1a', borderRadius: 8, marginHorizontal: 16, marginTop: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8 },
  urlText: { color: '#555', fontSize: 12, flex: 1 },
  selHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#0f0f0f', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1e1e1e' },
  btn: { backgroundColor: '#dc2743', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 180 },
  btnFull: { width: '100%', paddingHorizontal: 0 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { color: '#666', fontWeight: '600', fontSize: 14 },
});
