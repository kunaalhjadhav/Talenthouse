import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { requestOtp, verifyOtp } = useAuth();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [busy, setBusy] = useState(false);

  async function handleRequestOtp() {
    setBusy(true);
    try {
      await requestOtp(mobile);
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setBusy(true);
    try {
      await verifyOtp(mobile, code);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Sign in to perform, compete, and get discovered</Text>

      {step === 'mobile' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Mobile number"
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={setMobile}
          />
          <TouchableOpacity style={styles.button} onPress={handleRequestOtp} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? 'Sending...' : 'Send OTP'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? 'Verifying...' : 'Verify & Continue'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16 },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
