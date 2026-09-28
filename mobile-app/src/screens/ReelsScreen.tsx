import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';

const { height } = Dimensions.get('window');

export default function ReelsScreen() {
  const navigation = useNavigation<any>();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');

  const load = useCallback((type: 'FOR_YOU' | 'FOLLOWING') => {
    setLoading(true);
    api.get('/reels/feed', { params: { type } })
      .then((res) => setReels(res.data))
      .catch(() => setReels([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(feedType); }, [feedType, load]);

  async function like(id: string) {
    setReels((prev) => prev.map((r) => (r.id === id ? { ...r, likes: r.likes + 1 } : r)));
    try { await api.post(`/reels/${id}/like`); } catch {}
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      <View style={styles.switcher}>
        <TouchableOpacity onPress={() => setFeedType('FOR_YOU')} style={styles.switcherTab}>
          <Text style={[styles.switcherText, feedType === 'FOR_YOU' && styles.switcherTextActive]}>For You</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFeedType('FOLLOWING')} style={styles.switcherTab}>
          <Text style={[styles.switcherText, feedType === 'FOLLOWING' && styles.switcherTextActive]}>Following</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('UploadReel')} style={styles.uploadTab}>
          <Text style={styles.uploadTabText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />
      ) : reels.length === 0 && feedType === 'FOLLOWING' ? (
        <Text style={styles.emptyFollowing}>
          Follow some creators to see their reels here. Check out For You to discover people.
        </Text>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          pagingEnabled
          snapToInterval={height * 0.8}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Real video playback: wire react-native-video's <Video source={{uri: item.videoUrl}} /> here.
                  Kept as a placeholder frame so this screen renders without native video linking during initial setup. */}
              <View style={styles.videoPlaceholder}>
                <Text style={styles.placeholderText}>▶ {item.category}</Text>
              </View>
              <Text style={styles.creator}>@{item.user?.name || 'creator'}</Text>
              <Text style={styles.caption}>{item.caption}</Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => like(item.id)}>
                  <Text style={styles.actionText}>♥ {item.likes}</Text>
                </TouchableOpacity>
                <Text style={styles.actionText}>👁 {item.views}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 12, backgroundColor: '#111' },
  switcherTab: { paddingVertical: 4, paddingHorizontal: 4 },
  switcherText: { color: '#888', fontSize: 15, fontWeight: '600' },
  switcherTextActive: { color: '#fff' },
  uploadTab: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#4f46e5', borderRadius: 999, marginLeft: 8 },
  uploadTabText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyFollowing: { color: '#888', textAlign: 'center', marginTop: 60, paddingHorizontal: 32, fontSize: 14, lineHeight: 20 },
  card: { height: height * 0.8, backgroundColor: '#111', justifyContent: 'flex-end', padding: 16 },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#666', fontSize: 18 },
  creator: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  caption: { color: '#fff', fontSize: 14, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 20 },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
