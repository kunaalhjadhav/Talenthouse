import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../../api/client';
import { errMsg } from '../../api/pay';

const DEFAULT_CRITERIA = ['Performance', 'Creativity', 'Skill', 'Presentation'];

export default function JudgeScoringScreen() {
  const route = useRoute<any>();
  const { contestId } = route.params;
  const [registrations, setRegistrations] = useState<any[]>([]); const [criteria, setCriteria] = useState<string[]>(DEFAULT_CRITERIA);
  const [state, setState] = useState<any>({ buzzUsed: false, buzzRegistrationId: null, myScores: {} });
  const [loading, setLoading] = useState(true); const [scores, setScores] = useState<Record<string, string>>({}); const [notes, setNotes] = useState<Record<string, string>>({}); const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get(`/voting/contests/${contestId}/leaderboard`).then((r) => setRegistrations(r.data)).catch(() => {}).finally(() => setLoading(false));
    api.get(`/contests/${contestId}`).then((r) => { const names = (r.data.scoringCriteria || []).map((c: any) => c.name); if (names.length) setCriteria(names); }).catch(() => {});
    api.get(`/contests/${contestId}/judge-state`).then((r) => setState(r.data)).catch(() => {});
  }, [contestId]);
  useEffect(() => { load(); }, [load]);

  async function run(key: string, fn: () => Promise<any>, ok: string) { setBusy(key); try { await fn(); Alert.alert('Saved', ok); load(); } catch (e: any) { Alert.alert('Error', errMsg(e, 'Could not save')); } finally { setBusy(null); } }
  const saveScore = (rid: string, criterion: string) => { const key = `${rid}:${criterion}`; const v = Number(scores[key]); if (scores[key] === undefined || scores[key] === '' || isNaN(v)) return Alert.alert('Enter a score from 0 to 100'); run(key, () => api.post(`/contests/registrations/${rid}/score`, { criterion, score: v }), `${criterion} score submitted.`); };
  const saveNote = (rid: string) => run(`${rid}:fb`, () => api.post(`/contests/registrations/${rid}/feedback`, { feedback: notes[rid] || '' }), 'Feedback sent to the participant.');
  const buzz = (rid: string, name: string) => Alert.alert('Golden Buzzer', `Send ${name} straight to the finals? You get one buzzer per contest.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Press buzzer', onPress: () => run(`${rid}:bz`, () => api.post(`/contests/registrations/${rid}/golden-buzzer`), 'Golden Buzzer used.') }]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return (
    <FlatList contentContainerStyle={{ padding: 16 }} data={registrations} keyExtractor={(i) => i.id} ListEmptyComponent={<Text style={s.empty}>No participants registered yet.</Text>}
      renderItem={({ item }) => {
        const mine = state.myScores?.[item.id] || {};
        return (
          <View style={s.card}>
            <Text style={s.name}>{item.goldenBuzzer ? '⭐ ' : ''}{item.user?.name || 'Participant'}</Text>
            <Text style={s.meta}>Blended score: {item.finalScore ?? '—'} · {item.voteCount} public votes</Text>
            {criteria.map((c) => { const key = `${item.id}:${c}`; return (
              <View key={c} style={s.row}><Text style={s.label}>{c}{mine[c] != null ? ` (${mine[c]})` : ''}</Text>
                <TextInput style={s.input} keyboardType="numeric" placeholder="0-100" placeholderTextColor="#6b7280" value={scores[key] ?? ''} onChangeText={(v) => setScores((p) => ({ ...p, [key]: v }))} />
                <TouchableOpacity style={s.save} onPress={() => saveScore(item.id, c)} disabled={busy === key}><Text style={s.saveText}>{busy === key ? '...' : 'Save'}</Text></TouchableOpacity></View>); })}
            <TextInput style={[s.input, { marginTop: 6, minHeight: 44 }]} multiline placeholder="Feedback for the participant" placeholderTextColor="#6b7280" value={notes[item.id] ?? item.judgeFeedback ?? ''} onChangeText={(v) => setNotes((p) => ({ ...p, [item.id]: v }))} />
            <View style={s.row}>
              <TouchableOpacity style={s.save} onPress={() => saveNote(item.id)} disabled={busy === `${item.id}:fb`}><Text style={s.saveText}>Send feedback</Text></TouchableOpacity>
              <TouchableOpacity style={[s.save, { backgroundColor: state.buzzUsed ? '#d1d5db' : '#f59e0b' }]} disabled={state.buzzUsed} onPress={() => buzz(item.id, item.user?.name || 'this participant')}><Text style={s.saveText}>{state.buzzRegistrationId === item.id ? 'Buzzed ✓' : '⭐ Golden Buzzer'}</Text></TouchableOpacity>
            </View>
          </View>);
      }} />
  );
}
const s = StyleSheet.create({
  empty: { color: '#374151', textAlign: 'center', marginTop: 40 }, card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#d1d5db' },
  name: { fontSize: 16, color: '#111827' }, meta: { fontSize: 12, color: '#374151', marginTop: 2, marginBottom: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { width: 110, fontSize: 13, color: '#111827' }, input: { flex: 1, borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: '#111827' },
  save: { backgroundColor: '#4f46e5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }, saveText: { color: '#fff', fontSize: 12 },
});
