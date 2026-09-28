import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { api } from '../../api/client';

export default function CreateContestScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [entryFee, setEntryFee] = useState('0');
  const [prizePool, setPrizePool] = useState('0');
  const [numWinners, setNumWinners] = useState('1');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title || !description || !category) return Alert.alert('Fill in title, description, and category');
    setBusy(true);
    const now = new Date();
    const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const inFourWeeks = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
    try {
      await api.post('/contests', {
        title, description, category,
        mode: 'ONLINE',
        entryFee: Number(entryFee) || 0,
        prizePool: Number(prizePool) || 0,
        numWinners: Number(numWinners) || 1,
        registrationOpensAt: now.toISOString(),
        registrationClosesAt: inTwoWeeks.toISOString(),
        startDate: inTwoWeeks.toISOString(),
        endDate: inFourWeeks.toISOString(),
      });
      Alert.alert('Submitted', 'Your contest has been submitted for admin approval.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not create contest');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>New Contest</Text>
      <Text style={styles.subtitle}>Goes to admin review before it appears publicly.</Text>

      <TextInput style={styles.input} placeholder="Contest title" value={title} onChangeText={setTitle} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Description" value={description} onChangeText={setDescription} multiline />
      <TextInput style={styles.input} placeholder="Category (e.g. Singing, Dance)" value={category} onChangeText={setCategory} />

      <View style={styles.row}>
        <TextInput style={[styles.input, styles.half]} placeholder="Entry fee (₹)" keyboardType="numeric" value={entryFee} onChangeText={setEntryFee} />
        <TextInput style={[styles.input, styles.half]} placeholder="Prize pool (₹)" keyboardType="numeric" value={prizePool} onChangeText={setPrizePool} />
      </View>
      <TextInput style={styles.input} placeholder="Number of winners" keyboardType="numeric" value={numWinners} onChangeText={setNumWinners} />

      <Text style={styles.note}>
        Default schedule: registration open now, closes in 2 weeks, contest runs weeks 2–4.
        Editing exact dates is available from the web admin/host portal.
      </Text>

      <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Submitting...' : 'Submit for Approval'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16 },
  textArea: { height: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  note: { fontSize: 12, color: '#9ca3af', marginBottom: 16, lineHeight: 17 },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
