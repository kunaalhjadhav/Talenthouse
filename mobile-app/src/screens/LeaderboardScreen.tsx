import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
export default function LeaderboardScreen() {
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { api.get('/engagement/leaderboard', { params: { take: 50 } }).then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []));
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return (
    <FlatList contentContainerStyle={{ padding: 16 }} data={rows} keyExtractor={(u) => u.id} ListEmptyComponent={<Text style={s.empty}>Nobody has earned XP yet. Check in daily to start.</Text>}
      renderItem={({ item: u }) => (<View style={s.row}><Text style={s.rank}>{u.rank <= 3 ? ['🥇', '🥈', '🥉'][u.rank - 1] : u.rank}</Text><View style={{ flex: 1 }}><Text style={s.name}>{u.name || 'Creator'}</Text><Text style={s.meta}>{u.level}</Text></View><Text style={s.xp}>{u.xp} XP</Text></View>)} />
  );
}
const s = StyleSheet.create({ empty: { textAlign: 'center', color: '#374151', marginTop: 40 }, row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' }, rank: { width: 36, fontSize: 18, color: '#111827' }, name: { fontSize: 15, color: '#111827' }, meta: { fontSize: 12, color: '#6b7280' }, xp: { fontSize: 14, color: '#4338ca' } });
