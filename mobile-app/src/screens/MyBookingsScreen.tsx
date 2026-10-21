import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { payOrder, errMsg, inr } from '../api/pay';
import { useAuth } from '../context/AuthContext';

const LABEL: Record<string, string> = { REQUESTED: 'Waiting for talent', ACCEPTED: 'Accepted: pay advance', ADVANCE_PAID: 'Confirmed', CONFIRMED: 'Confirmed', PERFORMED: 'Performed: pay balance', COMPLETED: 'Completed', REJECTED: 'Declined', CANCELLED: 'Cancelled' };

export default function MyBookingsScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState<string | null>(null);
  const load = useCallback(() => { api.get('/bookings/me').then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function pay(b: any, kind: 'advance' | 'balance') {
    setBusyId(b.id);
    try { const { data } = await api.post(`/payments/booking/${b.id}/${kind}-order`); await payOrder(data, `Booking ${kind}`, user?.mobile); Alert.alert('Payment received', kind === 'advance' ? 'Your booking is confirmed.' : 'Thank you. The talent has been paid.'); load(); }
    catch (e: any) { if (!e.cancelled) Alert.alert('Payment failed', errMsg(e, 'Try again')); } finally { setBusyId(null); }
  }
  async function cancel(b: any) { try { await api.post(`/bookings/${b.id}/cancel`); load(); } catch (e: any) { Alert.alert('Error', errMsg(e, 'Could not cancel')); } }
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return (
    <FlatList contentContainerStyle={{ padding: 16 }} data={rows} keyExtractor={(b) => b.id} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />} ListEmptyComponent={<Text style={s.empty}>No bookings yet. Open Talents to book someone.</Text>}
      renderItem={({ item: b }) => (
        <View style={s.card}>
          <Text style={s.name}>{b.talent?.stageName || b.talent?.user?.name || 'Talent'}</Text>
          <Text style={s.meta}>{b.eventType || 'Event'} · {new Date(b.eventDate).toLocaleDateString('en-IN')} {b.startTime || ''}</Text>
          <Text style={s.meta}>Total {inr(b.amount)} · Advance {inr(b.advanceAmount)} · Balance {inr(b.balanceAmount)}</Text>
          <Text style={s.status}>{LABEL[b.status] || b.status}</Text>
          <View style={s.row}>
            {b.status === 'ACCEPTED' && <TouchableOpacity style={s.btn} disabled={busyId === b.id} onPress={() => pay(b, 'advance')}><Text style={s.btnText}>{busyId === b.id ? '...' : `Pay advance ${inr(b.advanceAmount)}`}</Text></TouchableOpacity>}
            {b.status === 'PERFORMED' && <TouchableOpacity style={s.btn} disabled={busyId === b.id} onPress={() => pay(b, 'balance')}><Text style={s.btnText}>{busyId === b.id ? '...' : `Pay balance ${inr(b.balanceAmount)}`}</Text></TouchableOpacity>}
            {['REQUESTED', 'ACCEPTED'].includes(b.status) && <TouchableOpacity style={s.ghost} onPress={() => cancel(b)}><Text style={s.ghostText}>Cancel</Text></TouchableOpacity>}
          </View>
        </View>)} />
  );
}
const s = StyleSheet.create({
  empty: { textAlign: 'center', color: '#374151', marginTop: 40 }, card: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 14, marginBottom: 12, backgroundColor: '#fff' },
  name: { fontSize: 16, color: '#111827' }, meta: { fontSize: 12, color: '#374151', marginTop: 3 }, status: { fontSize: 13, color: '#4338ca', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 }, btn: { backgroundColor: '#4f46e5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }, btnText: { color: '#fff', fontSize: 13 },
  ghost: { backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }, ghostText: { color: '#991b1b', fontSize: 13 },
});
