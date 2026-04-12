import React, { memo } from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NonFollower } from '../instagram/types';

export const UserCard = memo(function UserCard({ user }: { user: NonFollower }) {
  const openProfile = () => Linking.openURL(`https://www.instagram.com/${user.username}/`);

  return (
    <TouchableOpacity style={styles.card} onPress={openProfile} activeOpacity={0.7}>
      <Image source={{ uri: user.avatar }} style={styles.avatar} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.username} numberOfLines={1}>@{user.username}</Text>
          {user.isVerified && <Ionicons name="checkmark-circle" size={14} color="#5ba3d9" />}
          {user.isPrivate && <Ionicons name="lock-closed" size={12} color="#555" />}
        </View>
        {user.fullName ? <Text style={styles.fullName} numberOfLines={1}>{user.fullName}</Text> : null}
      </View>
      <Ionicons name="open-outline" size={18} color="#444" />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1e1e1e',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2a2a2a', marginRight: 12 },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  username: { color: '#f0f0f0', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  fullName: { color: '#666', fontSize: 12, marginTop: 2 },
});
