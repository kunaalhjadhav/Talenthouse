import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useCategories } from '../hooks/useCategories';
import AdBanner from '../components/AdBanner';

const SAMPLE_LIVE = [{ id: 'sample-live-1', title: 'Friday Night Dance Battle', viewerCount: 128, isPaid: false, thumbnailUrl: null }];
const SAMPLE_CONTESTS = [
  { id: 'sample-contest-1', title: 'Voice of the City — Singing Contest', category: 'Singing', entryFee: 199, prizePool: 25000, status: 'LIVE', registeredCount: 84, maxParticipants: 200, registrationClosesAt: new Date(Date.now() + 6 * 86400000).toISOString(), bannerUrl: null },
  { id: 'sample-contest-2', title: 'Stand-Up Showdown', category: 'Comedy', entryFee: 99, prizePool: 10000, status: 'LIVE', registeredCount: 41, maxParticipants: 50, registrationClosesAt: new Date(Date.now() + 2 * 86400000).toISOString(), bannerUrl: null },
  { id: 'sample-contest-3', title: 'Hip-Hop Dance Challenge', category: 'Dance', entryFee: 0, prizePool: 15000, status: 'ONGOING', registeredCount: 120, maxParticipants: 120, registrationClosesAt: new Date(Date.now() - 86400000).toISOString(), bannerUrl: null },
];

function contestStatusLabel(c: any) {
  const closesAt = new Date(c.registrationClosesAt);
  const full = c.maxParticipants && c.registeredCount >= c.maxParticipants;
  if (full) return { label: 'FULL', color: '#b91c1c', bg: '#fee2e2' };
  if (closesAt < new Date()) return { label: 'CLOSED', color: '#374151', bg: '#e5e7eb' };
  const hoursLeft = (closesAt.getTime() - Date.now()) / 3600000;
  if (hoursLeft < 48) return { label: 'CLOSING SOON', color: '#92400e', bg: '#fef3c7' };
  return { label: 'OPEN', color: '#166534', bg: '#dcfce7' };
}

export default function HomeScreen() {
  const CONTENT_CATEGORIES = useCategories('CONTEST');
  const navigation = useNavigation<any>();
  const [category, setCategory] = useState('All');
  const [live, setLive] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingSamples, setUsingSamples] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/live').catch(() => ({ data: [] })),
      api.get('/contests', { params: category === 'All' ? {} : { category } }).catch(() => ({ data: [] })),
    ]).then(([liveRes, contestRes]) => {
      const liveData = liveRes.data?.length ? liveRes.data : SAMPLE_LIVE;
      const contestData = contestRes.data?.length ? contestRes.data : SAMPLE_CONTESTS;
      setUsingSamples(!liveRes.data?.length && !contestRes.data?.length);
      setLive(liveData); setContests(contestData);
    }).finally(() => setLoading(false));
  }, [category]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const rows: any[] = [{ type: 'header-live' }, ...live.map((l) => ({ type: 'live', item: l })), { type: 'header-contest' }, ...contests.map((c) => ({ type: 'contest', item: c }))];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {CONTENT_CATEGORIES.map((c) => (<TouchableOpacity key={c.key} onPress={() => setCategory(c.key)} style={[styles.chip, category === c.key && styles.chipActive]}><Text style={styles.chipIcon}>{c.icon}</Text><Text style={[styles.chipLabel, category === c.key && styles.chipLabelActive]}>{c.label}</Text></TouchableOpacity>))}
      </ScrollView>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
        <FlatList
          contentContainerStyle={{ paddingVertical: 16 }} data={rows} keyExtractor={(row, i) => row.type + i + (row.item?.id || '')}
          ListHeaderComponent={
            <>
              <AdBanner placement="HOME_BANNER" />
              {usingSamples ? (<View style={[styles.sampleBanner, { marginHorizontal: 12 }]}><Text style={styles.sampleBannerText}>Showing example content — real contests and live sessions will appear here.</Text></View>) : null}
            </>
          }
          renderItem={({ item: row }) => {
            if (row.type === 'header-live') return <Text style={[styles.sectionTitle, { marginHorizontal: 12 }]}>🔴 Live Now</Text>;
            if (row.type === 'header-contest') return <Text style={[styles.sectionTitle, { marginHorizontal: 12 }]}>🏆 Contests & Challenges</Text>;
            if (row.type === 'live') {
              const l = row.item;
              return (
                <View style={[styles.liveCard, { marginHorizontal: 12 }]}>
                  <ImageBackground source={l.thumbnailUrl ? { uri: l.thumbnailUrl } : undefined} style={styles.liveThumb} imageStyle={{ borderRadius: 8 }}><View style={styles.liveDot} /></ImageBackground>
                  <View style={{ flex: 1 }}><Text style={styles.liveTitle}>{l.title}</Text><Text style={styles.liveMeta}>{l.viewerCount ?? 0} watching{l.isPaid ? ' · Paid' : ''}</Text></View>
                </View>
              );
            }
            const c = row.item;
            const status = contestStatusLabel(c);
            const canParticipate = status.label === 'OPEN' || status.label === 'CLOSING SOON';
            return (
              <View style={[styles.card, { marginHorizontal: 12 }]}>
                <TouchableOpacity onPress={() => navigation.navigate('ContestDetail', { contestId: c.id })}>
                  <ImageBackground source={c.bannerUrl ? { uri: c.bannerUrl } : undefined} style={styles.videoThumb} imageStyle={{ borderRadius: 10 }}><View style={styles.playOverlay}><Text style={styles.playIcon}>▶</Text></View></ImageBackground>
                </TouchableOpacity>
                <View style={styles.cardTop}><Text style={styles.cardTitle}>{c.title}</Text><View style={[styles.badge, { backgroundColor: status.bg }]}><Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text></View></View>
                <Text style={styles.cardMeta}>{c.category} · Entry ₹{c.entryFee} · Prize ₹{Number(c.prizePool).toLocaleString('en-IN')}</Text>
                <Text style={styles.cardMeta}>{c.registeredCount ?? 0}{c.maxParticipants ? ` / ${c.maxParticipants}` : ''} registered · Closes {new Date(c.registrationClosesAt).toLocaleDateString()}</Text>
                <TouchableOpacity style={[styles.participateBtn, !canParticipate && styles.participateBtnDisabled]} disabled={!canParticipate} onPress={() => navigation.navigate('ContestDetail', { contestId: c.id })}>
                  <Text style={styles.participateBtnText}>{canParticipate ? 'Participate' : status.label === 'FULL' ? 'Contest Full' : 'Registration Closed'}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  chipRow: { maxHeight: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#d1d5db' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, marginVertical: 8, marginRight: 8, borderRadius: 999, backgroundColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#4f46e5' }, chipIcon: { fontSize: 14 }, chipLabel: { fontSize: 13, color: '#111827' }, chipLabelActive: { color: '#fff' },
  sampleBanner: { backgroundColor: '#e0e7ff', borderRadius: 10, padding: 10, marginBottom: 12 }, sampleBannerText: { fontSize: 12, color: '#3730a3' },
  sectionTitle: { fontSize: 15, marginTop: 12, marginBottom: 8, color: '#111827' },
  liveCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10 },
  liveThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#1f2937', justifyContent: 'flex-end', alignItems: 'flex-end', marginRight: 10, overflow: 'hidden' },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', margin: 4 },
  liveTitle: { color: '#fff', fontSize: 14 }, liveMeta: { color: '#e5e7eb', fontSize: 12, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#d1d5db' },
  videoThumb: { height: 140, borderRadius: 10, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' },
  playOverlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' }, playIcon: { color: '#fff', fontSize: 18 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, color: '#111827', flex: 1, marginRight: 8 }, cardMeta: { fontSize: 13, color: '#374151', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }, badgeText: { fontSize: 10 },
  participateBtn: { marginTop: 10, backgroundColor: '#4f46e5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  participateBtnDisabled: { backgroundColor: '#9ca3af' }, participateBtnText: { color: '#fff', fontSize: 13 },
});
