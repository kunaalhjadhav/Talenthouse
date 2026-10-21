import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, ImageBackground, Alert, FlatList } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { payOrder, errMsg, inr } from '../api/pay';
import { useAuth } from '../context/AuthContext';

export default function ContestDetailScreen() {
  const route = useRoute<any>();
  const { user } = useAuth();
  const { contestId } = route.params;
  const [contest, setContest] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [votingBusy, setVotingBusy] = useState<string | null>(null);
  const [pub, setPub] = useState<any>(null);
  const [freeLeft, setFreeLeft] = useState<number | null>(null);

  const load = useCallback(() => {
    api.get(`/contests/${contestId}`).then((res) => setContest(res.data)).catch(() => {}).finally(() => setLoading(false));
    api.get(`/voting/contests/${contestId}/leaderboard`).then((res) => setLeaderboard(res.data)).catch(() => {});
    api.get('/settings/public').then((res) => setPub(res.data)).catch(() => {});
    api.get(`/voting/contests/${contestId}/my-votes`).then((res) => setFreeLeft(res.data.left)).catch(() => {});
  }, [contestId]);
  useEffect(() => { load(); }, [load]);

  if (loading || !contest) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const registeredCount = contest.registrations?.length ?? 0;
  const closesAt = new Date(contest.registrationClosesAt);
  const full = contest.maxParticipants && registeredCount >= contest.maxParticipants;
  const closed = closesAt < new Date();
  const canRegister = !full && !closed && !registered;

  async function register() {
    setBusy(true);
    try {
      if (Number(contest.entryFee) === 0) {
        await api.post(`/contests/${contestId}/register`);
        setRegistered(true);
        Alert.alert('Registered', "You're registered for this contest. Good luck!");
        return;
      }
      const { data } = await api.post(`/payments/contest/${contestId}/order`);
      await payOrder(data, contest.title, user?.mobile);
      setRegistered(true);
      Alert.alert('Registered', data.devMode ? 'Test payment confirmed. You are registered.' : 'Payment received. Your registration is confirmed shortly.');
      load();
    } catch (e: any) {
      if (e.cancelled) return;
      Alert.alert('Error', errMsg(e, 'Could not register for this contest'));
    } finally { setBusy(false); }
  }

  async function vote(registrationId: string) {
    setVotingBusy(registrationId);
    try { await api.post(`/voting/contests/${contestId}/registrations/${registrationId}/vote`, {}); Alert.alert('Vote cast!', 'Thanks for supporting this participant.'); load(); }
    catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Could not cast vote'); }
    finally { setVotingBusy(null); }
  }

  function buyVotes(registrationId: string, name: string) {
    const price = Number(pub?.votePrice ?? 0);
    const packs = [10, 50, 100];
    Alert.alert(`Boost ${name}`, `Paid votes cost ${inr(price)} each.`, [
      ...packs.map((n) => ({ text: `${n} votes · ${inr(n * price)}`, onPress: async () => {
        setVotingBusy(registrationId);
        try { const { data } = await api.post('/payments/votes/order', { contestId, registrationId, count: n }); await payOrder(data, `${n} votes`, user?.mobile); Alert.alert('Votes added', `${n} votes sent to ${name}.`); load(); }
        catch (e: any) { if (!e.cancelled) Alert.alert('Error', errMsg(e, 'Could not buy votes')); } finally { setVotingBusy(null); }
      } })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <ImageBackground source={contest.bannerUrl ? { uri: contest.bannerUrl } : undefined} style={styles.banner} imageStyle={{ borderRadius: 12 }}><View style={styles.playOverlay}><Text style={styles.playIcon}>▶</Text></View></ImageBackground>
      <Text style={styles.title}>{contest.title}</Text>
      <Text style={styles.meta}>{contest.category} · {contest.mode}</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}><Text style={styles.statLabel}>Entry Fee</Text><Text style={styles.statValue}>₹{contest.entryFee}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLabel}>Prize Pool</Text><Text style={styles.statValue}>{inr(contest.prizePool)}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLabel}>Winners</Text><Text style={styles.statValue}>{contest.numWinners}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLabel}>Registered</Text><Text style={styles.statValue}>{registeredCount}{contest.maxParticipants ? ` / ${contest.maxParticipants}` : ''}</Text></View>
      </View>
      <Text style={styles.closeDate}>{closed ? 'Registration closed' : `Registration closes ${closesAt.toLocaleDateString()}`}</Text>
      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.body}>{contest.description}</Text>
      {contest.rules && (<><Text style={styles.sectionTitle}>Rules</Text><Text style={styles.body}>{contest.rules}</Text></>)}
      <TouchableOpacity style={[styles.registerBtn, !canRegister && styles.registerBtnDisabled]} onPress={register} disabled={!canRegister || busy}>
        <Text style={styles.registerBtnText}>{registered ? 'Registered ✓' : full ? 'Contest Full' : closed ? 'Registration Closed' : busy ? 'Processing...' : Number(contest.entryFee) === 0 ? 'Register (Free)' : `Register — Pay ₹${contest.entryFee}`}</Text>
      </TouchableOpacity>

      {contest.publicVotingEnabled && leaderboard.length > 0 && (
        <View style={styles.votingSection}>
          <Text style={styles.sectionTitle}>🗳 Vote for your favorite</Text>
          <Text style={styles.body}>Free votes left today: {freeLeft ?? '-'}. Buy vote packs to boost a participant. The final score blends judge scores ({pub?.judgeWeight ?? 70}%) and public votes ({pub?.publicWeight ?? 30}%).</Text>
          <FlatList
            data={leaderboard} keyExtractor={(item) => item.id} scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.voteRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.voteName}>{item.goldenBuzzer ? '⭐ ' : ''}{item.user?.name || 'Participant'}</Text>
                  <Text style={styles.voteMeta}>{item.voteCount} votes{item.finalScore != null ? ` · score ${item.finalScore}` : ''}</Text>
                  {item.judgeFeedback ? <Text style={styles.voteMeta}>Judge: “{item.judgeFeedback}”</Text> : null}
                </View>
                <TouchableOpacity style={styles.voteBtn} onPress={() => vote(item.id)} disabled={votingBusy === item.id}><Text style={styles.voteBtnText}>{votingBusy === item.id ? '...' : '👍 Free'}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.voteBtn, { marginLeft: 6, backgroundColor: '#fef3c7' }]} onPress={() => buyVotes(item.id, item.user?.name || 'Participant')} disabled={votingBusy === item.id}><Text style={[styles.voteBtnText, { color: '#92400e' }]}>Boost</Text></TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  banner: { height: 180, borderRadius: 12, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  playOverlay: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' }, playIcon: { color: '#fff', fontSize: 22 },
  title: { fontSize: 20, color: '#111827' }, meta: { fontSize: 13, color: '#374151', marginTop: 4, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statBox: { width: '47%', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 12 },
  statLabel: { fontSize: 11, color: '#374151' }, statValue: { fontSize: 16, color: '#111827', marginTop: 4 },
  closeDate: { fontSize: 12, color: '#6b7280', marginBottom: 20 },
  sectionTitle: { fontSize: 15, color: '#111827', marginTop: 12, marginBottom: 6 }, body: { fontSize: 13, color: '#374151', lineHeight: 19 },
  registerBtn: { marginTop: 24, backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center' },
  registerBtnDisabled: { backgroundColor: '#9ca3af' }, registerBtnText: { color: '#fff', fontSize: 15 },
  votingSection: { marginTop: 28, borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 20 },
  voteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  voteName: { fontSize: 14, color: '#111827' }, voteMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  voteBtn: { backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }, voteBtnText: { fontSize: 12, color: '#4338ca' },
});
