import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { api } from '../api/client';

export default function AuditionsScreen() {
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auditions').then((res) => setAuditions(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function apply(id: string) {
    try {
      await api.post(`/auditions/${id}/apply`, {});
      Alert.alert('Applied', 'Your application has been submitted.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not apply');
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={auditions}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>No live auditions right now.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.companyName || 'Independent'} · {item.category}
          </Text>
          <Text style={styles.meta}>Apply by {new Date(item.applicationDeadline).toLocaleDateString()}</Text>
          <TouchableOpacity style={styles.button} onPress={() => apply(item.id)}>
            <Text style={styles.buttonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { color: '#6b7280', marginTop: 20, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  button: { marginTop: 10, backgroundColor: '#4f46e5', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
