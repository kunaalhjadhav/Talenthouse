import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useCategories } from '../hooks/useCategories';

const SAMPLE_TALENTS = [
  { id: 'sample-t1', userId: 'sample-t1', stageName: 'Aria Vocals', category: 'Singer', basePrice: 5000, rating: 4.8, user: { profilePhoto: null } },
  { id: 'sample-t2', userId: 'sample-t2', stageName: 'The Groove Collective', category: 'Dancer', basePrice: 8000, rating: 4.6, user: { profilePhoto: null } },
  { id: 'sample-t3', userId: 'sample-t3', stageName: 'MC Rohan', category: 'MC/Anchor', basePrice: 6000, rating: 4.9, user: { profilePhoto: null } },
];

export default function TalentsScreen() {
  const TALENT_CATEGORIES = useCategories('TALENT');
  const navigation = useNavigation<any>();
  const [category, setCategory] = useState('All');
  const [talents, setTalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingSamples, setUsingSamples] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    api.get('/talents', { params: category === 'All' ? {} : { category } })
      .then((res) => { const data = res.data?.length ? res.data : SAMPLE_TALENTS; setUsingSamples(!res.data?.length); setTalents(data); })
      .catch(() => { setTalents(SAMPLE_TALENTS); setUsingSamples(true); })
      .finally(() => setLoading(false));
  }, [category]);
  useEffect(() => { load(); }, [load]);
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <FlatList horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }} data={TALENT_CATEGORIES} keyExtractor={(c) => c.key}
        renderItem={({ item: c }) => (<TouchableOpacity onPress={() => setCategory(c.key)} style={styles.thumbItem}><View style={[styles.thumbCircle, category === c.key && styles.thumbCircleActive]}><Text style={styles.thumbIcon}>{c.icon}</Text></View><Text style={[styles.thumbLabel, category === c.key && styles.thumbLabelActive]}>{c.label}</Text></TouchableOpacity>)}
      />
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
        <FlatList contentContainerStyle={{ padding: 16 }} data={talents} keyExtractor={(item) => item.id}
          ListHeaderComponent={usingSamples ? (<View style={styles.sampleBanner}><Text style={styles.sampleBannerText}>Showing example talent — verified profiles will appear here once talents sign up.</Text></View>) : null}
          renderItem={({ item }) => {
            const displayName = item.stageName || item.user?.name || 'Talent';
            return (
              <TouchableOpacity style={styles.card} onPress={() => !String(item.id).startsWith('sample-') && navigation.navigate('UserProfile', { userId: item.userId })}>
                {item.user?.profilePhoto ? (<Image source={{ uri: item.user.profilePhoto }} style={styles.avatar} />) : (<View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarInitial}>{displayName[0].toUpperCase()}</Text></View>)}
                <View style={{ flex: 1 }}><Text style={styles.name}>{displayName}</Text><Text style={styles.meta}>{item.category} · Starting ₹{item.basePrice}</Text>{item.rating ? <Text style={styles.rating}>★ {Number(item.rating).toFixed(1)}</Text> : null}{item.plan && item.plan !== 'FREE' ? <Text style={styles.plan}>{item.plan === 'PRO' ? '💎 Pro' : '⭐ Premium'}</Text> : null}</View>{!String(item.id).startsWith('sample-') && <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('Booking', { talent: item })}><Text style={styles.bookText}>Book</Text></TouchableOpacity>}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  thumbRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#d1d5db' },
  thumbItem: { alignItems: 'center', marginRight: 16, width: 64 },
  thumbCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  thumbCircleActive: { backgroundColor: '#4f46e5' }, thumbIcon: { fontSize: 22 },
  thumbLabel: { fontSize: 11, color: '#374151', textAlign: 'center' }, thumbLabelActive: { color: '#4f46e5' },
  sampleBanner: { backgroundColor: '#e0e7ff', borderRadius: 10, padding: 10, marginBottom: 12 }, sampleBannerText: { fontSize: 12, color: '#3730a3' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#d1d5db' },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }, avatarInitial: { fontSize: 20, color: '#374151' },
  plan: { fontSize: 11, color: '#4338ca', marginTop: 2 }, bookBtn: { backgroundColor: '#4f46e5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }, bookText: { color: '#fff', fontSize: 13 },
  name: { fontSize: 16, color: '#111827' }, meta: { fontSize: 13, color: '#374151', marginTop: 4 }, rating: { fontSize: 12, color: '#b45309', marginTop: 4 },
});
