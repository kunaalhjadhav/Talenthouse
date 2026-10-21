import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
export default function LoginScreen() {
  const { requestOtp, verifyOtp } = useAuth();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [busy, setBusy] = useState(false);
  async function handleRequestOtp() { setBusy(true); try { await requestOtp(mobile); setStep('otp'); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Could not send OTP'); } finally { setBusy(false); } }
  async function handleVerify() { setBusy(true); try { await verifyOtp(mobile, code); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Invalid OTP'); } finally { setBusy(false); } }
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Image source={require('../assets/ojas-logo.jpg')} style={styles.logo} resizeMode="cover" />
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Sign in to perform, compete, and get discovered</Text>
      {step === 'mobile' ? (<><TextInput style={styles.input} placeholder="Mobile number" keyboardType="phone-pad" value={mobile} onChangeText={setMobile} /><TouchableOpacity style={styles.button} onPress={handleRequestOtp} disabled={busy}><Text style={styles.buttonText}>{busy ? 'Sending...' : 'Send OTP'}</Text></TouchableOpacity></>) : (<><TextInput style={styles.input} placeholder="Enter OTP" keyboardType="number-pad" value={code} onChangeText={setCode} /><TouchableOpacity style={styles.button} onPress={handleVerify} disabled={busy}><Text style={styles.buttonText}>{busy ? 'Verifying...' : 'Verify & Continue'}</Text></TouchableOpacity></>)}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  logo: { width: '100%', aspectRatio: 1630 / 1370, borderRadius: 20, marginBottom: 24 },
  title: { fontSize: 26, marginBottom: 6, color: '#111827' }, subtitle: { fontSize: 14, color: '#374151', marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#9ca3af', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, color: '#111827' },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center' }, buttonText: { color: '#fff', fontSize: 16 },
});
