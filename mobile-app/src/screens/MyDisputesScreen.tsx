import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';

const TYPES = ['BOOKING', 'CONTEST', 'PAYMENT', 'REFUND', 'TALENT_PERFORMANCE', 'HOST_CANCELLATION', 'NO_SHOW', 'AUDITION'];

const statusColor: Record<string, string> = {
  OPEN: '#f59e0b', UNDER_REVIEW: '#3b82f6', RESOLVED_REFUND: '#16a34a',
  RESOLVED_PAYOUT: '#16a34a', RESOLVED_NO_ACTION: '#6b7280', REJECTED: '#dc2626',
};

export default function MyDisputesScreen() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('BOOKING');
  const [referenceId, setReferenceId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get('/disputes/me').then((res) => setDisputes(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit() {
    if (!referenceId || !description) return Alert.alert('Fill in the reference ID and description');
    setBusy(true);
    try {
      await api.post('/disputes', { type, referenceId, description });
      setShowForm(false);
      setReferenceId('');
      setDescription('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not submit dispute');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.newButton} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.newButtonText}>{showForm ? 'Cancel' : '+ Raise a Dispute'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formLabel}>Type</Text>
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.typeChip, type === t && styles.typeChipActive]}>
                <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>{t.replace(/_/g, ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="Booking/Contest/Payment ID this relates to" value={referenceId} onChangeText={setReferenceId} />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Describe what happened" value={description} onChangeText={setDescription} multiline />
          <TouchableOpacity style={styles.submitButton} onPress={submit} disabled={busy}>
            <Text style={styles.submitButtonText}>{busy ? 'Submitting...' : 'Submit Dispute'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={disputes}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No disputes raised.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardType}>{item.type.replace(/_/g, ' ')}</Text>
                <Text style={[styles.status, { color: statusColor[item.status] }]}>{item.status.replace(/_/g, ' ')}</Text>
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              {item.resolutionNote && <Text style={styles.resolution}>Resolution: {item.resolutionNote}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  newButton: { backgroundColor: '#4f46e5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  newButtonText: { color: '#fff', fontWeight: '600' },
  form: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  formLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f3f4f6' },
  typeChipActive: { backgroundColor: '#4f46e5' },
  typeChipText: { fontSize: 11, color: '#374151', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 14 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#16a34a', borderRadius: 10, padding: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: '600' },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardType: { fontSize: 14, fontWeight: '600' },
  status: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  resolution: { fontSize: 12, color: '#374151', marginTop: 8, fontStyle: 'italic' },
});
