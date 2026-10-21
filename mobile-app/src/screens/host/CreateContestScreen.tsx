import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { api } from '../../api/client';
import { useCategories } from '../../hooks/useCategories';
import ImageUploadField from '../../components/ImageUploadField';

export default function CreateContestScreen({ navigation }: any) {
  const CONTENT_CATEGORIES = useCategories('CONTEST');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [entryFee, setEntryFee] = useState('0');
  const [prizePool, setPrizePool] = useState('0');
  const [numWinners, setNumWinners] = useState('1');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title || !description || !category) return Alert.alert('Fill in title, description, and category');
    setBusy(true);
    const now = new Date();
    const inTwoWeeks = new Date(now.getTime() + 14 * 86400000);
    const inFourWeeks = new Date(now.getTime() + 28 * 86400000);
    try {
      await api.post('/contests', { title, description, category, bannerUrl: bannerUrl || undefined, mode: 'ONLINE', entryFee: Number(entryFee) || 0, prizePool: Number(prizePool) || 0, numWinners: Number(numWinners) || 1, registrationOpensAt: now.toISOString(), registrationClosesAt: inTwoWeeks.toISOString(), startDate: inTwoWeeks.toISOString(), endDate: inFourWeeks.toISOString() });
      Alert.alert('Submitted', 'Your contest has been submitted for admin approval.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Could not create contest'); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>New Contest</Text>
      <Text style={styles.subtitle}>Goes to admin review before it appears publicly. Admin may also adjust the prize pool, entry fee, or commission after review.</Text>
      <TextInput style={styles.input} placeholder="Contest title" value={title} onChangeText={setTitle} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Description" value={description} onChangeText={setDescription} multiline />
      <ImageUploadField label="Banner photo (optional)" value={bannerUrl} onChange={setBannerUrl} />
      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>{CONTENT_CATEGORIES.filter((c) => c.key !== 'All').map((c) => (<TouchableOpacity key={c.key} onPress={() => setCategory(c.key)} style={[styles.chip, category === c.key && styles.chipActive]}><Text style={styles.chipIcon}>{c.icon}</Text><Text style={[styles.chipLabel, category === c.key && styles.chipLabelActive]}>{c.label}</Text></TouchableOpacity>))}</View>
      <View style={styles.row}><TextInput style={[styles.input, styles.half]} placeholder="Entry fee (₹)" keyboardType="numeric" value={entryFee} onChangeText={setEntryFee} /><TextInput style={[styles.input, styles.half]} placeholder="Prize pool (₹)" keyboardType="numeric" value={prizePool} onChangeText={setPrizePool} /></View>
      <TextInput style={styles.input} placeholder="Number of winners" keyboardType="numeric" value={numWinners} onChangeText={setNumWinners} />
      <Text style={styles.note}>Default schedule: registration open now, closes in 2 weeks, contest runs weeks 2–4.</Text>
      <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}><Text style={styles.buttonText}>{busy ? 'Submitting...' : 'Submit for Approval'}</Text></TouchableOpacity>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' }, title: { fontSize: 22, color: '#111827', marginBottom: 4 }, subtitle: { fontSize: 14, color: '#374151', marginBottom: 24 },
  label: { fontSize: 13, color: '#374151', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#4f46e5' }, chipIcon: { fontSize: 13 }, chipLabel: { fontSize: 12, color: '#111827' }, chipLabelActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#9ca3af', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, color: '#111827' },
  textArea: { height: 90, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: 12 }, half: { flex: 1 },
  note: { fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 17 },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center' }, buttonText: { color: '#fff', fontSize: 16 },
});
