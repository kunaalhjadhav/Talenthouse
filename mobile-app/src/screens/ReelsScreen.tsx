import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { api } from '../api/client';
import { payOrder, errMsg } from '../api/pay';
import { useAuth } from '../context/AuthContext';
const { height } = Dimensions.get('window');

export default function ReelsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [presets, setPresets] = useState<number[]>([20, 50, 100]);
  useEffect(() => { api.get('/settings/public').then((x) => setPresets(x.data.tipPresets)).catch(() => {}); }, []);
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');
  const load = useCallback((type: 'FOR_YOU' | 'FOLLOWING') => { setLoading(true); api.get('/reels/feed', { params: { type } }).then((res) => setReels(res.data)).catch(() => setReels([])).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(feedType); }, [feedType, load]);
  async function like(id: string) { setReels((prev) => prev.map((r) => (r.id === id ? { ...r, likes: r.likes + 1 } : r))); try { await api.post(`/reels/${id}/like`); } catch {} }
  function tip(reel: any) {
    if (reel.userId === user?.id) return Alert.alert('You cannot tip yourself');
    Alert.alert(`Tip ${reel.user?.name || 'creator'}`, 'The creator receives the full amount in their wallet.', [
      ...presets.slice(0, 4).map((amt) => ({ text: `₹${amt}`, onPress: async () => {
        try { const { data } = await api.post('/payments/tip/order', { toUserId: reel.userId, amount: amt, reelId: reel.id }); await payOrder(data, 'Tip', user?.mobile); Alert.alert('Tip sent', `₹${amt} sent. Thank you!`); }
        catch (e: any) { if (!e.cancelled) Alert.alert('Error', errMsg(e, 'Could not send tip')); }
      } })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
  function report(reel: any) {
    Alert.alert('Report this reel', 'Why are you reporting it?', ['Spam', 'Inappropriate', 'Copyright'].map((reason) => ({ text: reason, onPress: async () => { try { await api.post(`/reels/${reel.id}/report`, { reason }); Alert.alert('Thanks', 'Our team will review this reel.'); } catch (e: any) { Alert.alert('Error', errMsg(e, 'Could not report')); } } })).concat([{ text: 'Cancel', onPress: async () => {} }]));
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      <View style={styles.switcher}><TouchableOpacity onPress={() => setFeedType('FOR_YOU')}><Text style={[styles.switcherText, feedType === 'FOR_YOU' && styles.switcherTextActive]}>For You</Text></TouchableOpacity><TouchableOpacity onPress={() => setFeedType('FOLLOWING')}><Text style={[styles.switcherText, feedType === 'FOLLOWING' && styles.switcherTextActive]}>Following</Text></TouchableOpacity><TouchableOpacity onPress={() => navigation.navigate('UploadReel')} style={styles.uploadTab}><Text style={styles.uploadTabText}>+ Upload</Text></TouchableOpacity></View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color="#fff" /> : reels.length === 0 && feedType === 'FOLLOWING' ? (<Text style={styles.emptyFollowing}>Follow some creators to see their reels here. Check out For You to discover people.</Text>) : (
        <FlatList data={reels} keyExtractor={(item) => item.id} pagingEnabled snapToInterval={height * 0.8}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <ImageBackground source={item.thumbnailUrl ? { uri: item.thumbnailUrl } : undefined} style={styles.videoPlaceholder} imageStyle={{ resizeMode: 'cover' }}><Text style={styles.placeholderText}>▶ {item.category}</Text></ImageBackground>
              <Text style={styles.creator}>@{item.user?.name || 'creator'}</Text>
              <Text style={styles.caption}>{item.caption}</Text>
              <View style={styles.actions}><TouchableOpacity onPress={() => like(item.id)}><Text style={styles.actionText}>♥ {item.likes}</Text></TouchableOpacity><Text style={styles.actionText}>👁 {item.views}</Text><TouchableOpacity onPress={() => tip(item)}><Text style={styles.actionText}>💸 Tip</Text></TouchableOpacity><TouchableOpacity onPress={() => report(item)}><Text style={styles.actionText}>⚑</Text></TouchableOpacity></View>
            </View>
          )}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  switcher: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingVertical: 12, backgroundColor: '#111' },
  switcherText: { color: '#9ca3af', fontSize: 15 }, switcherTextActive: { color: '#fff' },
  uploadTab: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#4f46e5', borderRadius: 999, marginLeft: 8 }, uploadTabText: { color: '#fff', fontSize: 13 },
  emptyFollowing: { color: '#9ca3af', textAlign: 'center', marginTop: 60, paddingHorizontal: 32, fontSize: 14, lineHeight: 20 },
  card: { height: height * 0.8, backgroundColor: '#111', justifyContent: 'flex-end', padding: 16 },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' }, placeholderText: { color: '#6b7280', fontSize: 18 },
  creator: { color: '#fff', fontSize: 13, marginBottom: 4 }, caption: { color: '#fff', fontSize: 14, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 20 }, actionText: { color: '#fff', fontSize: 14 },
});
