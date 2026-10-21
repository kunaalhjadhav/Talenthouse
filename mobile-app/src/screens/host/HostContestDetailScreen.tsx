import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../../api/client';
export default function HostContestDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { contestId } = route.params;
  const [contest, setContest] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { Promise.all([api.get(`/contests/${contestId}`), api.get(`/contests/${contestId}/registrations`)]).then(([c, r]) => { setContest(c.data); setRegistrations(r.data); }).catch(() => {}).finally(() => setLoading(false)); }, [contestId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function settle() { Alert.alert('Settle contest', 'This ranks participants, pays platform commission, and distributes prizes. Continue?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Settle', style: 'destructive', onPress: async () => { try { await api.post(`/contests/${contestId}/settle`); Alert.alert('Settled', 'Contest has been settled and payouts processed.'); load(); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Could not settle contest'); } } }]); }
  if (loading || !contest) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{contest.title}</Text>
        <Text style={styles.meta}>{contest.status} · {registrations.length} registered · Prize ₹{contest.prizePool} · Entry ₹{contest.entryFee}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.assignButton} onPress={() => navigation.navigate('AssignJudge', { contestId })}><Text style={styles.assignButtonText}>Assign Judge</Text></TouchableOpacity>
          {(contest.status === 'ONGOING' || contest.status === 'REGISTRATION_CLOSED') && (<TouchableOpacity style={styles.settleButton} onPress={settle}><Text style={styles.settleButtonText}>Settle & Pay Winners</Text></TouchableOpacity>)}
        </View>
      </View>
      <FlatList contentContainerStyle={{ padding: 16 }} data={registrations} keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No participants yet.</Text>}
        renderItem={({ item, index }) => (<View style={styles.row}><Text style={styles.rank}>#{item.rank || index + 1}</Text><View style={{ flex: 1 }}><Text style={styles.name}>{item.user?.name || item.user?.mobile}</Text><Text style={styles.scoreText}>Judge {item.judgeScore ?? '—'} · Votes {item.publicVoteScore?.toFixed?.(0) ?? '—'} · Final {item.finalScore?.toFixed?.(1) ?? '—'}</Text></View></View>)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' }, header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 18, color: '#111827' }, meta: { fontSize: 13, color: '#374151', marginTop: 4 },
  headerButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  assignButton: { flex: 1, backgroundColor: '#eef2ff', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }, assignButtonText: { color: '#4338ca', fontSize: 13 },
  settleButton: { flex: 1, backgroundColor: '#15803d', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }, settleButtonText: { color: '#fff', fontSize: 13 },
  empty: { color: '#374151', textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#d1d5db' },
  rank: { fontSize: 16, width: 40, color: '#4f46e5' }, name: { fontSize: 15, color: '#111827' }, scoreText: { fontSize: 12, color: '#374151', marginTop: 2 },
});
