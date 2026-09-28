import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../../api/client';

export default function JudgeDashboardScreen() {
  const navigation = useNavigation<any>();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.get('/judges/me/contests')
      .then((res) => setContests(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={contests}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>No contests to judge right now.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('JudgeScoring', { contestId: item.id })}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>{item.category} · {item.status}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
});
