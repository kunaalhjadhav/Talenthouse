import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';

export default function AssignJudgeScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { contestId } = route.params;
  const [judges, setJudges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feeInputs, setFeeInputs] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => { api.get('/judges').then((res) => setJudges(res.data)).catch(() => {}).finally(() => setLoading(false)); }, []);

  async function assign(judgeProfileId: string) {
    setAssigning(judgeProfileId);
    try {
      const feeAgreed = feeInputs[judgeProfileId] ? Number(feeInputs[judgeProfileId]) : undefined;
      await api.post(`/contests/${contestId}/judges`, { judgeProfileId, feeAgreed });
      Alert.alert('Assigned', 'Judge has been assigned to this contest.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Could not assign judge'); }
    finally { setAssigning(null); }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }} data={judges} keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>No verified judges available yet. Judges need to be verified by an admin before they can be assigned.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            {item.user?.profilePhoto ? (<Image source={{ uri: item.user.profilePhoto }} style={styles.avatar} />) : (<View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{(item.user?.name || '?')[0].toUpperCase()}</Text></View>)}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.user?.name || 'Judge'} {item.isCelebrity ? '⭐' : ''}</Text>
              <Text style={styles.meta}>{item.category || 'All categories'} {item.rating ? `· ★ ${Number(item.rating).toFixed(1)}` : ''}</Text>
            </View>
          </View>
          {item.bio && <Text style={styles.bio}>{item.bio}</Text>}
          <View style={styles.assignRow}>
            <TextInput style={styles.feeInput} placeholder={item.baseFee ? `Suggested ₹${item.baseFee}` : 'Fee (optional)'} keyboardType="numeric" value={feeInputs[item.id] || ''} onChangeText={(v) => setFeeInputs((prev) => ({ ...prev, [item.id]: v }))} />
            <TouchableOpacity style={styles.assignBtn} onPress={() => assign(item.id)} disabled={assigning === item.id}><Text style={styles.assignBtnText}>{assigning === item.id ? '...' : 'Assign'}</Text></TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}
const styles = StyleSheet.create({
  empty: { color: '#374151', textAlign: 'center', marginTop: 40, paddingHorizontal: 24, lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#d1d5db' },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarFallback: { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }, avatarInitial: { color: '#374151' },
  name: { fontSize: 15, color: '#111827' }, meta: { fontSize: 12, color: '#374151', marginTop: 2 },
  bio: { fontSize: 12, color: '#374151', marginTop: 8, lineHeight: 17 },
  assignRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  feeInput: { flex: 1, borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#111827' },
  assignBtn: { backgroundColor: '#4f46e5', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' }, assignBtnText: { color: '#fff', fontSize: 13 },
});
