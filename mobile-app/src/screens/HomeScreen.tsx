import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api/client';

export default function HomeScreen() {
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/contests')
      .then((res) => setContests(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>Trending Contests</Text>
      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
      {!loading && contests.length === 0 && (
        <Text style={styles.empty}>No live contests right now — check back soon.</Text>
      )}
      {contests.map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.cardTitle}>{c.title}</Text>
          <Text style={styles.cardMeta}>
            {c.category} · Entry ₹{c.entryFee} · Prize ₹{c.prizePool}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  empty: { color: '#6b7280', marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
});
