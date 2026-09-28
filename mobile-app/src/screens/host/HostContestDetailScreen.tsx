import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../../api/client';

export default function HostContestDetailScreen() {
  const route = useRoute<any>();
  const { contestId } = route.params;
  const [contest, setContest] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      api.get(`/contests/${contestId}`),
      api.get(`/contests/${contestId}/registrations`),
    ])
      .then(([c, r]) => { setContest(c.data); setRegistrations(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contestId]);

  useEffect(() => { load(); }, [load]);

  async function settle() {
    Alert.alert('Settle contest', 'This ranks participants, pays platform commission, and distributes prizes. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Settle', style: 'destructive', onPress: async () => {
        try {
          await api.post(`/contests/${contestId}/settle`);
          Alert.alert('Settled', 'Contest has been settled and payouts processed.');
          load();
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.message || 'Could not settle contest');
        }
      }},
    ]);
  }

  if (loading || !contest) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{contest.title}</Text>
        <Text style={styles.meta}>{contest.status} · {registrations.length} registered</Text>
        {(contest.status === 'ONGOING' || contest.status === 'REGISTRATION_CLOSED') && (
          <TouchableOpacity style={styles.settleButton} onPress={settle}>
            <Text style={styles.settleButtonText}>Settle Contest & Pay Winners</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={registrations}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No participants yet.</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{item.rank || index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.user?.name || item.user?.mobile}</Text>
              <Text style={styles.scoreText}>
                Judge {item.judgeScore ?? '—'} · Votes {item.publicVoteScore?.toFixed?.(0) ?? '—'} · Final {item.finalScore?.toFixed?.(1) ?? '—'}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  settleButton: { marginTop: 12, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  settleButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  rank: { fontSize: 16, fontWeight: '700', width: 40, color: '#4f46e5' },
  name: { fontSize: 15, fontWeight: '600' },
  scoreText: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
