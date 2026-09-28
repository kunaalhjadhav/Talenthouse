import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../../api/client';

const CRITERIA = ['Performance', 'Creativity', 'Skill', 'Presentation'];

export default function JudgeScoringScreen() {
  const route = useRoute<any>();
  const { contestId } = route.params;
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get(`/voting/contests/${contestId}/leaderboard`)
      .then((res) => setRegistrations(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contestId]);

  useEffect(() => { load(); }, [load]);

  async function submitScore(registrationId: string, criterion: string) {
    const key = `${registrationId}:${criterion}`;
    const value = Number(scores[key]);
    if (!value && value !== 0) return Alert.alert('Enter a score first');
    setSubmitting(key);
    try {
      await api.post(`/contests/registrations/${registrationId}/score`, { criterion, score: value });
      Alert.alert('Saved', `${criterion} score submitted.`);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not submit score');
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={registrations}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>No participants registered yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.user?.name || 'Participant'}</Text>
          <Text style={styles.meta}>Final score so far: {item.finalScore?.toFixed?.(1) ?? '—'}</Text>
          {CRITERIA.map((criterion) => {
            const key = `${item.id}:${criterion}`;
            return (
              <View key={criterion} style={styles.criterionRow}>
                <Text style={styles.criterionLabel}>{criterion}</Text>
                <TextInput
                  style={styles.scoreInput}
                  keyboardType="numeric"
                  placeholder="0-100"
                  value={scores[key] || ''}
                  onChangeText={(v) => setScores((prev) => ({ ...prev, [key]: v }))}
                />
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => submitScore(item.id, criterion)}
                  disabled={submitting === key}
                >
                  <Text style={styles.saveButtonText}>{submitting === key ? '...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 10 },
  criterionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  criterionLabel: { width: 90, fontSize: 13, color: '#374151' },
  scoreInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14 },
  saveButton: { backgroundColor: '#4f46e5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
});
