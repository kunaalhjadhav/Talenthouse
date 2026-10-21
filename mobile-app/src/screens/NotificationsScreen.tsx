import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
export default function NotificationsScreen() {
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(() => { api.get('/notifications').then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function readAll() { try { await api.patch('/notifications/read-all'); load(); } catch {} }
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return (
    <FlatList contentContainerStyle={{ padding: 16 }} data={rows} keyExtractor={(n) => n.id} ListHeaderComponent={rows.some((n) => !n.read) ? <TouchableOpacity onPress={readAll}><Text style={s.link}>Mark all as read</Text></TouchableOpacity> : null} ListEmptyComponent={<Text style={s.empty}>You are all caught up.</Text>}
      renderItem={({ item: n }) => (<View style={[s.card, !n.read && s.unread]}><Text style={s.title}>{n.title}</Text><Text style={s.body}>{n.body}</Text><Text style={s.time}>{new Date(n.createdAt).toLocaleString('en-IN')}</Text></View>)} />
  );
}
const s = StyleSheet.create({ empty: { textAlign: 'center', color: '#374151', marginTop: 40 }, link: { color: '#4338ca', fontSize: 13, marginBottom: 10 }, card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: '#fff' }, unread: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' }, title: { fontSize: 14, color: '#111827' }, body: { fontSize: 13, color: '#374151', marginTop: 2 }, time: { fontSize: 11, color: '#6b7280', marginTop: 6 } });
