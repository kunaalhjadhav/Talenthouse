import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { errMsg, inr } from '../api/pay';

export default function BookingScreen() {
  const route = useRoute<any>(); const navigation = useNavigation<any>();
  const { talent } = route.params; // a talent profile row
  const [eventType, setEventType] = useState(''); const [date, setDate] = useState(''); const [start, setStart] = useState(''); const [venue, setVenue] = useState('');
  const [advancePct, setAdvancePct] = useState(30); const [blocked, setBlocked] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/settings/public').then((r) => setAdvancePct(r.data.advancePct)).catch(() => {});
    const from = new Date().toISOString().slice(0, 10); const to = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    api.get(`/talents/${talent.id}/calendar`, { params: { from, to } }).then((r) => setBlocked((r.data || []).filter((s: any) => ['BOOKED', 'UNAVAILABLE', 'BLOCKED'].includes(s.status)).map((s: any) => String(s.date).slice(0, 10)))).catch(() => {}).finally(() => setLoading(false));
  }, [talent.id]);
  const price = Number(talent.basePrice); const advance = Math.round(price * advancePct) / 100;
  const dateTaken = blocked.includes(date);
  async function submit() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Enter the date as YYYY-MM-DD');
    setBusy(true);
    try { await api.post('/bookings', { talentId: talent.id, eventType, eventDate: date, startTime: start || undefined, venueAddress: venue || undefined }); Alert.alert('Request sent', 'The talent will review your request. You will pay the advance once they accept.'); navigation.replace('MyBookings'); }
    catch (e: any) { Alert.alert('Could not book', errMsg(e, 'Try again')); } finally { setBusy(false); }
  }
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.title}>{talent.stageName || talent.user?.name}</Text>
      <Text style={s.meta}>{talent.category}</Text>
      <View style={s.priceBox}><Text style={s.priceLine}>Booking price: {inr(price)}</Text><Text style={s.priceLine}>Advance after acceptance ({advancePct}%): {inr(advance)}</Text><Text style={s.priceLine}>Balance after the event: {inr(price - advance)}</Text></View>
      <Text style={s.label}>Event type</Text><TextInput style={s.input} placeholder="Wedding, corporate, birthday" placeholderTextColor="#6b7280" value={eventType} onChangeText={setEventType} />
      <Text style={s.label}>Date (YYYY-MM-DD)</Text><TextInput style={[s.input, dateTaken && { borderColor: '#dc2626' }]} placeholder="2026-12-14" placeholderTextColor="#6b7280" value={date} onChangeText={setDate} autoCapitalize="none" />
      {dateTaken && <Text style={s.warn}>This talent is not available on that date.</Text>}
      {blocked.length > 0 && <Text style={s.hint}>Unavailable: {blocked.slice(0, 8).join(', ')}{blocked.length > 8 ? '…' : ''}</Text>}
      <Text style={s.label}>Start time</Text><TextInput style={s.input} placeholder="18:00" placeholderTextColor="#6b7280" value={start} onChangeText={setStart} />
      <Text style={s.label}>Venue</Text><TextInput style={s.input} placeholder="Address" placeholderTextColor="#6b7280" value={venue} onChangeText={setVenue} />
      <TouchableOpacity style={[s.btn, (busy || dateTaken) && { backgroundColor: '#9ca3af' }]} disabled={busy || dateTaken} onPress={submit}><Text style={s.btnText}>{busy ? 'Sending...' : 'Request booking'}</Text></TouchableOpacity>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  title: { fontSize: 20, color: '#111827' }, meta: { fontSize: 13, color: '#374151', marginBottom: 12 },
  priceBox: { backgroundColor: '#eef2ff', borderRadius: 12, padding: 14, marginBottom: 12 }, priceLine: { fontSize: 13, color: '#3730a3', marginVertical: 2 },
  label: { fontSize: 12, color: '#374151', marginTop: 12, marginBottom: 4 }, input: { borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827' },
  warn: { color: '#dc2626', fontSize: 12, marginTop: 4 }, hint: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  btn: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24 }, btnText: { color: '#fff', fontSize: 15 },
});
