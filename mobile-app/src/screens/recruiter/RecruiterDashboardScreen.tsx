import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../../api/client';
const statusColor: Record<string, string> = { SUBMITTED: '#b45309', LIVE: '#15803d', CLOSED: '#374151', REJECTED: '#b91c1c' };
export default function RecruiterDashboardScreen() {
  const navigation = useNavigation<any>();
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { api.get('/auditions/me/posted').then((res) => setAuditions(res.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>My Auditions</Text><TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreateAudition')}><Text style={styles.createButtonText}>+ New Audition</Text></TouchableOpacity></View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
        <FlatList contentContainerStyle={{ padding: 16 }} data={auditions} keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>You haven't posted any auditions yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RecruiterApplications', { auditionId: item.id })}>
              <View style={styles.cardTop}><Text style={styles.cardTitle}>{item.title}</Text><View style={[styles.badge, { backgroundColor: (statusColor[item.status] || '#374151') + '22' }]}><Text style={[styles.badgeText, { color: statusColor[item.status] || '#374151' }]}>{item.status}</Text></View></View>
              <Text style={styles.cardMeta}>{item.category}{item.designation ? ` · ${item.designation}` : ''} · Deadline {new Date(item.applicationDeadline).toLocaleDateString()}</Text>
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
