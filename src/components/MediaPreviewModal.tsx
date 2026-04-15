import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { DownloadableItem } from '../instagram/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  items: DownloadableItem[];
  selected: Set<number>;
  onToggle: (index: number) => void;
  visible: boolean;
  initialIndex: number;
  onClose: () => void;
}

function VideoSlide({ item, isActive }: { item: DownloadableItem; isActive: boolean }) {
  const [muted, setMuted] = useState(true);
  const source = React.useMemo(
    () => ({
      uri: item.downloadUrl,
      headers: { Referer: 'https://www.instagram.com/' },
    }),
    [item.downloadUrl],
  );
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
  });

  React.useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [isActive, player]);

  React.useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  return (
    <View style={styles.slide}>
      <VideoView
        player={player}
        style={styles.media}
        contentFit="contain"
        nativeControls={false}
      />
      <TouchableOpacity
        style={styles.muteBtn}
        onPress={() => setMuted((m) => !m)}
        hitSlop={12}
      >
        <Ionicons
          name={muted ? 'volume-mute' : 'volume-high'}
          size={20}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}

function ImageSlide({ item }: { item: DownloadableItem }) {
  return (
    <View style={styles.slide}>
      <Image
        source={{
          uri: item.downloadUrl || item.thumbnailUrl,
          headers: { Referer: 'https://www.instagram.com/' },
        }}
        style={styles.media}
        resizeMode="contain"
      />
    </View>
  );
}

export function MediaPreviewModal({
  items,
  selected,
  onToggle,
  visible,
  initialIndex,
  onClose,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const current = items[activeIndex];
  const isSelected = current ? selected.has(current.index) : false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {activeIndex + 1} / {items.length}
          </Text>
          {current && (
            <TouchableOpacity
              onPress={() => onToggle(current.index)}
              hitSlop={12}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={26}
                color={isSelected ? '#dc2743' : '#888'}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Swipeable media */}
        <FlatList
          ref={flatListRef}
          style={styles.list}
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item) => `${item.id}-${item.index}`}
          renderItem={({ item, index }) =>
            item.type === 'video' ? (
              <VideoSlide item={item} isActive={index === activeIndex} />
            ) : (
              <ImageSlide item={item} />
            )
          }
        />

        {/* Label */}
        {current && (
          <View style={styles.footer}>
            <Text style={styles.label}>{current.label}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  counter: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  slide: {
    width: SCREEN_W,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: SCREEN_W,
    height: SCREEN_H * 0.7,
  },
  muteBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingBottom: 48,
    alignItems: 'center',
  },
  label: {
    color: '#888',
    fontSize: 13,
  },
});
