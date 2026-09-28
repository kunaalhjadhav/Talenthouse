import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { api } from '../api/client';

export default function WalletScreen({ navigation }: any) {
  const [wallet, setWallet] = useState<any>(null);
  const [kyc, setKyc] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get('/wallet/me').then((res) => setWallet(res.data)).catch(() => {});
    api.get('/wallet/kyc/me').then((res) => setKyc(res.data)).catch(() => setKyc(null));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function requestWithdrawal() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return Alert.alert('Enter a valid amount');
    setBusy(true);
    try {
      await api.post('/wallet/withdrawals', { amount: amt });
      Alert.alert('Requested', 'Your withdrawal request has been submitted for processing.');
      setAmount('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not submit withdrawal request');
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const kycApproved = kyc?.status === 'APPROVED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.label}>Withdrawable balance</Text>
      <Text style={styles.balance}>₹{Number(wallet.withdrawableBalance).toLocaleString('en-IN')}</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={styles.statValue}>₹{Number(wallet.pendingBalance).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Total balance</Text>
          <Text style={styles.statValue}>₹{Number(wallet.balance).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {!kycApproved ? (
        <View style={styles.kycBanner}>
          <Text style={styles.kycBannerTitle}>
            {kyc?.status === 'PENDING' ? 'KYC under review' : kyc?.status === 'REJECTED' ? 'KYC rejected' : 'Complete your KYC to withdraw'}
          </Text>
          <Text style={styles.kycBannerText}>
            {kyc?.status === 'REJECTED'
              ? kyc.rejectionNote || 'Please resubmit your KYC details.'
              : 'PAN and bank details are required once, before your first withdrawal.'}
          </Text>
          {kyc?.status !== 'PENDING' && (
            <TouchableOpacity style={styles.kycButton} onPress={() => navigation.navigate('Kyc')}>
              <Text style={styles.kycButtonText}>{kyc?.status === 'REJECTED' ? 'Resubmit KYC' : 'Complete KYC'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.withdrawSection}>
          <Text style={styles.sectionTitle}>Withdraw funds</Text>
          <TextInput
            style={styles.input}
            placeholder="Amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TouchableOpacity style={styles.button} onPress={requestWithdrawal} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? 'Submitting...' : 'Request Withdrawal'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  label: { color: '#6b7280', fontSize: 13 },
  balance: { fontSize: 34, fontWeight: '700', marginTop: 4, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 14 },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  kycBanner: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a' },
  kycBannerTitle: { fontWeight: '600', color: '#92400e' },
  kycBannerText: { fontSize: 13, color: '#92400e', marginTop: 4 },
  kycButton: { marginTop: 10, backgroundColor: '#92400e', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  kycButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  withdrawSection: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
