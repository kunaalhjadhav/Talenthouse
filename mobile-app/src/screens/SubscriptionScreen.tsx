import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { payOrder, errMsg } from '../api/pay';
import { useAuth } from '../context/AuthContext';

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<any>(null); const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => {
    api.get('/subscriptions/me').then((r) => setPlan(r.data)).catch(() => {}).finally(() => setLoading(false));
    api.get('/settings/public').then((r) => setPlans(r.data.plans)).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function upgrade(id: string, name: string) {
    setBusy(id);
    try { const { data } = await api.post('/payments/subscription/order', { plan: id }); await payOrder(data, `${name} subscription (1 month)`, user?.mobile); Alert.alert('Plan active', `You are on ${name}. Ads are now hidden and your talent profile gets priority.`); load(); }
    catch (e: any) { if (!e.cancelled) Alert.alert('Error', errMsg(e, 'Could not start upgrade')); } finally { setBusy(null); }
  }
  function cancel() {
    Alert.alert('Cancel subscription', "You'll keep the plan until it expires, then drop to Free. Continue?", [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel subscription', style: 'destructive', onPress: async () => { try { await api.post('/subscriptions/cancel'); load(); } catch {} } },
    ]);
  }
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  const current = plan?.status === 'ACTIVE' || plan?.status === 'CANCELLED' ? plan?.plan : 'FREE';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 20 }}>
      <Text style={s.label}>Current plan</Text>
      <Text style={s.name}>{current === 'PRO' ? 'Pro' : current === 'PREMIUM' ? 'Premium' : 'Free'}</Text>
      {current !== 'FREE' && plan?.expiresAt && <Text style={s.exp}>{plan.status === 'CANCELLED' ? 'Ends' : 'Renews'} {new Date(plan.expiresAt).toLocaleDateString('en-IN')}</Text>}
      {plans.filter((p) => p.id !== 'FREE').map((p) => (
        <View key={p.id} style={[s.card, current === p.id && s.cardOn]}>
          <Text style={s.cardTitle}>{p.name} · ₹{p.price}/month</Text>
          {p.benefits.map((b: string) => <Text key={b} style={s.benefit}>✓ {b}</Text>)}
          {current === p.id ? <Text style={s.active}>Your current plan</Text> : (
            <TouchableOpacity style={s.btn} disabled={!!busy} onPress={() => upgrade(p.id, p.name)}><Text style={s.btnText}>{busy === p.id ? 'Processing...' : `Choose ${p.name}`}</Text></TouchableOpacity>)}
        </View>))}
      {current !== 'FREE' && plan?.status === 'ACTIVE' && <TouchableOpacity style={s.cancel} onPress={cancel}><Text style={s.cancelText}>Cancel subscription</Text></TouchableOpacity>}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  label: { fontSize: 13, color: '#374151' }, name: { fontSize: 28, color: '#111827', marginTop: 4 }, exp: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, marginTop: 16 }, cardOn: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  cardTitle: { fontSize: 16, color: '#111827', marginBottom: 8 }, benefit: { fontSize: 13, color: '#3730a3', marginTop: 4 }, active: { marginTop: 12, color: '#4338ca', fontSize: 13 },
  btn: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 14 }, btnText: { color: '#fff', fontSize: 15 },
  cancel: { marginTop: 24, backgroundColor: '#fee2e2', borderRadius: 10, padding: 14, alignItems: 'center' }, cancelText: { color: '#991b1b' },
});
