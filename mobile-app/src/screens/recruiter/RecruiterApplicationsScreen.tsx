import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../../api/client';
const STATUSES = ['SHORTLISTED', 'SELECTED_FOR_AUDITION', 'SELECTED', 'REJECTED'];
const statusColor: Record<string, string> = { APPLIED: '#374151', SHORTLISTED: '#1d4ed8', SELECTED_FOR_AUDITION: '#7c3aed', SELECTED: '#15803d', REJECTED: '#b91c1c', CONTRACTED: '#15803d', COMPLETED: '#374151' };
export default function RecruiterApplicationsScreen() {
  const route = useRoute<any>();
  const { auditionId } = route.params;
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { api.get(`/auditions/${auditionId}/applications`).then((res) => setApplications(res.data)).catch(() => {}).finally(() => setLoading(false)); }, [auditionId]);
  useEffect(() => { load(); }, [load]);
  async function updateStatus(applicationId: string, status: string) { try { await api.patch(`/auditions/applications/${applicationId}/status`, { status }); load(); } catch {} }
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return (
    <FlatList contentContainerStyle={{ padding: 16 }} data={applications} keyExtractor={(item) => item.id} ListEmptyComponent={<Text style={styles.empty}>No applications yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}><Text style={styles.name}>{item.user?.name || item.user?.mobile}</Text><View style={[styles.badge, { backgroundColor: (statusColor[item.status] || '#374151') + '22' }]}><Text style={[styles.badgeText, { color: statusColor[item.status] || '#374151' }]}>{item.status}</Text></View></View>
          <View style={styles.actions}>{STATUSES.map((s) => (<TouchableOpacity key={s} style={styles.actionButton} onPress={() => updateStatus(item.id, s)}><Text style={styles.actionButtonText}>{s.replace(/_/g, ' ')}</Text></TouchableOpacity>))}</View>
        </View>
      )}
    />
  );
}
const styles = StyleSheet.create({
  empty: { color: '#374151', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#d1d5db' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, name: { fontSize: 15, color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }, badgeText: { fontSize: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  actionButton: { backgroundColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }, actionButtonText: { fontSize: 11, color: '#111827' },
});
