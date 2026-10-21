import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { api } from '../../api/client';
import { useCategories } from '../../hooks/useCategories';
import ImageUploadField from '../../components/ImageUploadField';

export default function CreateAuditionScreen({ navigation }: any) {
  const AUDITION_CATEGORIES = useCategories('AUDITION');
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [designation, setDesignation] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [description, setDescription] = useState('');
  const [compensation, setCompensation] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!title || !category || !description || !designation) return Alert.alert('Fill in title, category, designation, and description');
    setBusy(true);
    const deadline = new Date(Date.now() + 21 * 86400000);
    try {
      await api.post('/auditions', { title, companyName, category, designation, posterUrl: posterUrl || undefined, description, compensation, applicationDeadline: deadline.toISOString(), numOpenings: 1 });
      Alert.alert('Submitted', 'Your audition has been submitted for admin approval.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Could not create audition'); }
    finally { setBusy(false); }
  }
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>New Audition</Text>
      <Text style={styles.subtitle}>Goes to admin review before it appears publicly.</Text>
      <TextInput style={styles.input} placeholder="Audition title" value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Company / production house" value={companyName} onChangeText={setCompanyName} />
      <ImageUploadField label="Poster photo (optional)" value={posterUrl} onChange={setPosterUrl} />
      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>{AUDITION_CATEGORIES.filter((c) => c.key !== 'All').map((c) => (<TouchableOpacity key={c.key} onPress={() => setCategory(c.key)} style={[styles.chip, category === c.key && styles.chipActive]}><Text style={styles.chipIcon}>{c.icon}</Text><Text style={[styles.chipLabel, category === c.key && styles.chipLabelActive]}>{c.label}</Text></TouchableOpacity>))}</View>
      <TextInput style={styles.input} placeholder="Designation — e.g. Lead Actor, Background Dancer, Voice Artist" value={designation} onChangeText={setDesignation} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Description & requirements" value={description} onChangeText={setDescription} multiline />
      <TextInput style={styles.input} placeholder="Compensation (e.g. ₹5,000/day)" value={compensation} onChangeText={setCompensation} />
      <Text style={styles.note}>Default application deadline: 3 weeks from today.</Text>
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
  textArea: { height: 90, textAlignVertical: 'top' }, note: { fontSize: 12, color: '#6b7280', marginBottom: 16 },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center' }, buttonText: { color: '#fff', fontSize: 16 },
});
