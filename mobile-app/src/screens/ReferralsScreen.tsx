import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Share, FlatList } from 'react-native';
import { api } from '../api/client';

export default function ReferralsScreen() {
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/referrals/me/code'), api.get('/referrals/me')])
      .then(([c, r]) => { setCode(c.data.code); setReferrals(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function share() {
    await Share.share({
      message: `Join me on Talent Platform! Use my referral code ${code} when you sign up.`,
    });
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const earned = referrals.filter((r) => r.bonusPaid).length;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your referral code</Text>
      <Text style={styles.code}>{code}</Text>
      <TouchableOpacity style={styles.shareButton} onPress={share}>
        <Text style={styles.shareButtonText}>Share invite</Text>
      </TouchableOpacity>

      <Text style={styles.summary}>{referrals.length} people referred · {earned} bonus{earned === 1 ? '' : 'es'} earned</Text>

      <FlatList
        contentContainerStyle={{ paddingTop: 16 }}
        data={referrals}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Share your code to start earning referral bonuses.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>Referred {new Date(item.createdAt).toLocaleDateString()}</Text>
            <Text style={[styles.rowStatus, item.bonusPaid ? styles.paid : styles.pending]}>
              {item.bonusPaid ? `+₹${item.bonusAmount}` : 'Pending first transaction'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  label: { color: '#6b7280', fontSize: 13 },
  code: { fontSize: 28, fontWeight: '700', letterSpacing: 2, marginTop: 4, marginBottom: 16 },
  shareButton: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 20 },
  shareButtonText: { color: '#fff', fontWeight: '600' },
  summary: { fontSize: 13, color: '#6b7280' },
  empty: { color: '#6b7280', marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  rowText: { fontSize: 13, color: '#374151' },
  rowStatus: { fontSize: 13, fontWeight: '600' },
  paid: { color: '#16a34a' },
  pending: { color: '#9ca3af' },
});
