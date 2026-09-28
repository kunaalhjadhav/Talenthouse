import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { api } from '../api/client';

export default function KycScreen({ navigation }: any) {
  const [panNumber, setPanNumber] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api.post('/wallet/kyc', { panNumber, bankAccountNo, ifsc, accountHolder });
      Alert.alert('Submitted', 'Your KYC has been submitted for review.', [
        { text: 'OK', onPress: () => navigation?.goBack?.() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not submit KYC');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Complete your KYC</Text>
      <Text style={styles.subtitle}>Required once before your first withdrawal.</Text>

      <TextInput style={styles.input} placeholder="PAN number" autoCapitalize="characters" value={panNumber} onChangeText={setPanNumber} />
      <TextInput style={styles.input} placeholder="Bank account number" keyboardType="numeric" value={bankAccountNo} onChangeText={setBankAccountNo} />
      <TextInput style={styles.input} placeholder="IFSC code" autoCapitalize="characters" value={ifsc} onChangeText={setIfsc} />
      <TextInput style={styles.input} placeholder="Account holder name" value={accountHolder} onChangeText={setAccountHolder} />

      <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Submitting...' : 'Submit KYC'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16 },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
