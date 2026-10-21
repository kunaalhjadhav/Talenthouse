import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../api/client';
import { errMsg, inr } from '../../api/pay';

export default function TalentBookingsScreen() {
  const [rows, setRows] = useState<any[]>([]); const [slots, setSlots] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [day, setDay] = useState('');
  const load = useCallback(() => {
    api.get('/bookings/talent/me').then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false));
    api.get('/talents/me/calendar').then((r) => setSlots(r.data)).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function act(fn: () => Promise<any>) { try { await fn(); load(); } catch (e: any) { Alert.alert('Error', errMsg(e, 'Something went wrong')); } }
  const respond = (id: string, accept: boolean) => act(() => api.post(`/bookings/${id}/respond`, { accept }));
  const perform = (id: string) => act(() => api.post(`/bookings/${id}/perform`));
  const toggle = (blocked: boolean) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return Alert.alert('Enter the date as YYYY-MM-DD'); act(async () => { await api.post('/talents/me/availability', { date: day, blocked }); setDay(''); }); };
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  const blocked = slots.filter((x) => x.status === 'BLOCKED').map((x) => String(x.date).slice(0, 10));
  return (
    <FlatList contentContainerStyle={{ padding: 16 }} data={rows} keyExtractor={(b) => b.id} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      ListHeaderComponent={
        <View style={s.cal}>
          <Text style={s.h}>Availability calendar</Text>
          <Text style={s.meta}>Blocked days: {blocked.length ? blocked.join(', ') : 'none'}</Text>
          <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor="#6b7280" value={day} onChangeText={setDay} autoCapitalize="none" />
          <View style={s.row}><TouchableOpacity style={s.btn} onPress={() => toggle(true)}><Text style={s.btnText}>Block day</Text></TouchableOpacity><TouchableOpacity style={s.ghost} onPress={() => toggle(false)}><Text style={s.ghostText}>Unblock</Text></TouchableOpacity></View>
          <Text style={[s.h, { marginTop: 16 }]}>Booking requests</Text>
        </View>}
      ListEmptyComponent={<Text style={s.empty}>No booking requests yet.</Text>}
      renderItem={({ item: b }) => (
        <View style={s.card}>
          <Text style={s.name}>{b.customer?.name || 'Customer'}</Text>
          <Text style={s.meta}>{b.eventType || 'Event'} · {new Date(b.eventDate).toLocaleDateString('en-IN')} {b.startTime || ''}</Text>
          <Text style={s.meta}>{inr(b.amount)} · you receive about {inr(Number(b.amount) * (1 - Number(b.commissionPct || 0) / 100))} after {Number(b.commissionPct || 0)}% commission</Text>
          <Text style={s.status}>{b.status.replace('_', ' ')}</Text>
          <View style={s.row}>
            {b.status === 'REQUESTED' && (<><TouchableOpacity style={s.btn} onPress={() => respond(b.id, true)}><Text style={s.btnText}>Accept</Text></TouchableOpacity><TouchableOpacity style={s.ghost} onPress={() => respond(b.id, false)}><Text style={s.ghostText}>Decline</Text></TouchableOpacity></>)}
            {['ADVANCE_PAID', 'CONFIRMED'].includes(b.status) && <TouchableOpacity style={s.btn} onPress={() => perform(b.id)}><Text style={s.btnText}>Mark performed</Text></TouchableOpacity>}
          </View>
        </View>)} />
  );
}
const s = StyleSheet.create({
  cal: { marginBottom: 8 }, h: { fontSize: 16, color: '#111827', marginBottom: 6 }, empty: { textAlign: 'center', color: '#374151', marginTop: 20 },
  input: { borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827', marginVertical: 8 },
  card: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 14, marginBottom: 12, backgroundColor: '#fff' }, name: { fontSize: 16, color: '#111827' }, meta: { fontSize: 12, color: '#374151', marginTop: 3 }, status: { fontSize: 13, color: '#4338ca', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 }, btn: { backgroundColor: '#4f46e5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }, btnText: { color: '#fff', fontSize: 13 },
  ghost: { backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }, ghostText: { color: '#991b1b', fontSize: 13 },
});
