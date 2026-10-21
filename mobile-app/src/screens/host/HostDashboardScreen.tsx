import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../../api/client';
const statusColor: Record<string, string> = { SUBMITTED: '#b45309', UNDER_REVIEW: '#b45309', APPROVED: '#1d4ed8', LIVE: '#15803d', REGISTRATION_CLOSED: '#4338ca', ONGOING: '#4338ca', COMPLETED: '#374151', REJECTED: '#b91c1c', CANCELLED: '#b91c1c' };
export default function HostDashboardScreen() {
  const navigation = useNavigation<any>();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { api.get('/contests/me/hosted').then((res) => setContests(res.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>My Contests</Text><TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreateContest')}><Text style={styles.createButtonText}>+ New Contest</Text></TouchableOpacity></View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
        <FlatList contentContainerStyle={{ padding: 16 }} data={contests} keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>You haven't created any contests yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('HostContestDetail', { contestId: item.id })}>
              <View style={styles.cardTop}><Text style={styles.cardTitle}>{item.title}</Text><View style={[styles.badge, { backgroundColor: (statusColor[item.status] || '#374151') + '22' }]}><Text style={[styles.badgeText, { color: statusColor[item.status] || '#374151' }]}>{item.status}</Text></View></View>
              <Text style={styles.cardMeta}>{item.category} · Entry ₹{item.entryFee} · {item.registrations?.length || 0} registered</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerTitle: { fontSize: 18, color: '#111827' }, createButton: { backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }, createButtonText: { color: '#fff', fontSize: 13 },
  empty: { color: '#374151', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#d1d5db' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, cardTitle: { fontSize: 16, color: '#111827', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }, badgeText: { fontSize: 11 }, cardMeta: { fontSize: 13, color: '#374151', marginTop: 6 },
});
