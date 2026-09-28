import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { api } from '../../api/client';

export default function CreateAuditionScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [compensation, setCompensation] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title || !category || !description) return Alert.alert('Fill in title, category, and description');
    setBusy(true);
    const deadline = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    try {
      await api.post('/auditions', {
        title, companyName, category, description, compensation,
        applicationDeadline: deadline.toISOString(),
        numOpenings: 1,
      });
      Alert.alert('Submitted', 'Your audition has been submitted for admin approval.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not create audition');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>New Audition</Text>
      <Text style={styles.subtitle}>Goes to admin review before it appears publicly.</Text>

      <TextInput style={styles.input} placeholder="Audition title" value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Company / production house" value={companyName} onChangeText={setCompanyName} />
      <TextInput style={styles.input} placeholder="Category (e.g. Web Series, Modelling)" value={category} onChangeText={setCategory} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Description & requirements" value={description} onChangeText={setDescription} multiline />
      <TextInput style={styles.input} placeholder="Compensation (e.g. ₹5,000/day)" value={compensation} onChangeText={setCompensation} />

      <Text style={styles.note}>Default application deadline: 3 weeks from today.</Text>

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
  note: { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
