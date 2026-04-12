import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DownloadableItem } from '../instagram/types';

const COLS = 2;
const GAP = 10;
const CELL = (Dimensions.get('window').width - 32 - GAP) / COLS;

interface Props {
  items: DownloadableItem[];
  selected: Set<number>;
  onToggle: (index: number) => void;
  downloadProgress: Record<number, number>;
  isDownloading: boolean;
}

export function MediaSelector({ items, selected, onToggle, downloadProgress, isDownloading }: Props) {
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const on = selected.has(item.index);
        const prog = downloadProgress[item.index];
        const busy = isDownloading && prog !== undefined;
        return (
          <TouchableOpacity
            key={`${item.id}-${item.index}`}
            style={[styles.cell, on && styles.cellOn]}
            onPress={() => !isDownloading && onToggle(item.index)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
            {item.type === 'video' && (
              <View style={styles.vBadge}><Ionicons name="play" size={12} color="#fff" /></View>
            )}
            <View style={[styles.check, on && styles.checkOn]}>
              {on && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            {busy && (
              <View style={styles.overlay}>
                {prog < 1 ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.progText}>{Math.round(prog * 100)}%</Text>
                  </>
                ) : (
                  <Ionicons name="checkmark-circle" size={28} color="#4cd964" />
                )}
              </View>
            )}
            <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: 16 },
  cell: { width: CELL, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: 'transparent' },
  cellOn: { borderColor: '#dc2743' },
  thumb: { width: '100%', aspectRatio: 1, backgroundColor: '#2a2a2a' },
  vBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 3 },
  check: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#dc2743', borderColor: '#dc2743' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: 6 },
  progText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  label: { color: '#888', fontSize: 11, textAlign: 'center', paddingVertical: 6 },
});
