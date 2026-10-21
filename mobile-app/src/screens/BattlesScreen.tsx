import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { errMsg } from '../api/pay';

export default function BattlesScreen() {
  const [rows, setRows] = useState<any[]>([]); const [mine, setMine] = useState<Record<string, string>>({}); const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    api.get('/battles').then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false));
    api.get('/battles/me/votes').then((r) => setMine(r.data)).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function vote(id: string, side: 'A' | 'B') {
    try { await api.post(`/battles/${id}/vote`, { side }); load(); } catch (e: any) { Alert.alert('Vote', errMsg(e, 'Could not vote')); }
  }
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return (
    <FlatList contentContainerStyle={{ padding: 16 }} data={rows} keyExtractor={(b) => b.id} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />} ListEmptyComponent={<Text style={s.empty}>No live battles right now.</Text>}
      renderItem={({ item: b }) => {
        const voted = mine[b.id];
        return (
          <View style={s.card}>
            <Text style={s.title}>{b.title}</Text>
            <View style={s.bar}><View style={[s.fillA, { flex: Math.max(b.pctA, 1) }]} /><View style={[s.fillB, { flex: Math.max(100 - b.pctA, 1) }]} /></View>
            <Text style={s.meta}>{b.pctA}% · {b.votesA} votes vs {b.votesB} votes · {100 - b.pctA}%</Text>
            <View style={s.row}>
              {(['A', 'B'] as const).map((side) => { const reel = side === 'A' ? b.reelA : b.reelB; return (
                <TouchableOpacity key={side} style={[s.side, voted === side && s.sideOn, voted && voted !== side && { opacity: 0.5 }]} disabled={!!voted} onPress={() => vote(b.id, side)}>
                  <Text style={s.sideName}>{reel?.user?.name || 'Creator'}</Text><Text style={s.sideCap} numberOfLines={1}>{reel?.caption || ''}</Text><Text style={s.sideBtn}>{voted === side ? 'Your vote ✓' : voted ? '' : 'Vote'}</Text>
                </TouchableOpacity>); })}
            </View>
          </View>);
      }} />
  );
}
const s = StyleSheet.create({
  empty: { textAlign: 'center', color: '#374151', marginTop: 40 }, card: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 14, marginBottom: 12, backgroundColor: '#fff' },
  title: { fontSize: 16, color: '#111827', marginBottom: 10 }, bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' }, fillA: { backgroundColor: '#4f46e5' }, fillB: { backgroundColor: '#f59e0b' },
  meta: { fontSize: 12, color: '#374151', marginTop: 6 }, row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  side: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10 }, sideOn: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  sideName: { fontSize: 14, color: '#111827' }, sideCap: { fontSize: 11, color: '#6b7280', marginTop: 2 }, sideBtn: { fontSize: 12, color: '#4338ca', marginTop: 8 },
});
