import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, ImageBackground } from 'react-native';
import { api } from '../api/client';
import { useCategories } from '../hooks/useCategories';

const SAMPLE_AUDITIONS = [
  { id: 'sample-aud-1', title: 'Lead Role — Web Series', companyName: 'Studio Nine Productions', category: 'Web Series', designation: 'Lead Actor', posterUrl: null, gender: 'Any', minAge: 20, maxAge: 35, applicationDeadline: new Date(Date.now() + 10 * 86400000).toISOString() },
  { id: 'sample-aud-2', title: 'Background Dancers Needed', companyName: 'Rhythm Events', category: 'Music Videos', designation: 'Background Dancer', posterUrl: null, gender: 'Any', minAge: 18, maxAge: 30, applicationDeadline: new Date(Date.now() + 5 * 86400000).toISOString() },
];

export default function AuditionsScreen() {
  const AUDITION_CATEGORIES = useCategories('AUDITION');
  const [category, setCategory] = useState('All');
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingSamples, setUsingSamples] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    api.get('/auditions', { params: category === 'All' ? {} : { category } })
      .then((res) => { const data = res.data?.length ? res.data : SAMPLE_AUDITIONS; setUsingSamples(!res.data?.length); setAuditions(data); })
      .catch(() => { setAuditions(SAMPLE_AUDITIONS); setUsingSamples(true); })
      .finally(() => setLoading(false));
  }, [category]);
  useEffect(() => { load(); }, [load]);
  async function apply(id: string) {
    if (id.startsWith('sample-')) return Alert.alert('Example listing', 'Real auditions can be applied to once a recruiter posts one.');
    try { await api.post(`/auditions/${id}/apply`, {}); Alert.alert('Applied', 'Your application has been submitted.'); }
    catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Could not apply'); }
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {AUDITION_CATEGORIES.map((c) => (<TouchableOpacity key={c.key} onPress={() => setCategory(c.key)} style={[styles.chip, category === c.key && styles.chipActive]}><Text style={styles.chipIcon}>{c.icon}</Text><Text style={[styles.chipLabel, category === c.key && styles.chipLabelActive]}>{c.label}</Text></TouchableOpacity>))}
      </ScrollView>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
        <FlatList contentContainerStyle={{ padding: 16 }} data={auditions} keyExtractor={(item) => item.id}
          ListHeaderComponent={usingSamples ? (<View style={styles.sampleBanner}><Text style={styles.sampleBannerText}>Showing example listings — real auditions from recruiters will appear here.</Text></View>) : null}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <ImageBackground source={item.posterUrl ? { uri: item.posterUrl } : undefined} style={styles.poster} imageStyle={{ borderRadius: 10 }}>{!item.posterUrl && <Text style={styles.posterIcon}>🎬</Text>}</ImageBackground>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.companyName || 'Independent'} · {item.category}</Text>
              <View style={styles.designationRow}><Text style={styles.designationLabel}>Looking for: </Text><Text style={styles.designationValue}>{item.designation || item.category}{item.gender && item.gender !== 'Any' ? ` (${item.gender})` : ''}</Text></View>
              {(item.minAge || item.maxAge) && <Text style={styles.ageMeta}>Age {item.minAge ?? '–'} to {item.maxAge ?? '–'}</Text>}
              <Text style={styles.deadline}>Apply by {new Date(item.applicationDeadline).toLocaleDateString()}</Text>
              <TouchableOpacity style={styles.button} onPress={() => apply(item.id)}><Text style={styles.buttonText}>Apply</Text></TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  chipRow: { maxHeight: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#d1d5db' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, marginVertical: 8, marginRight: 8, borderRadius: 999, backgroundColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#4f46e5' }, chipIcon: { fontSize: 14 }, chipLabel: { fontSize: 13, color: '#111827' }, chipLabelActive: { color: '#fff' },
  sampleBanner: { backgroundColor: '#e0e7ff', borderRadius: 10, padding: 10, marginBottom: 12 }, sampleBannerText: { fontSize: 12, color: '#3730a3' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: '#d1d5db' },
  poster: { height: 110, borderRadius: 10, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' }, posterIcon: { fontSize: 28, color: '#9ca3af' },
  title: { fontSize: 16, color: '#111827' }, meta: { fontSize: 13, color: '#374151', marginTop: 2 },
  designationRow: { flexDirection: 'row', gap: 4, marginTop: 8 }, designationLabel: { fontSize: 12, color: '#6b7280' }, designationValue: { fontSize: 12, color: '#111827' },
  ageMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 }, deadline: { fontSize: 12, color: '#374151', marginTop: 4 },
  button: { marginTop: 10, backgroundColor: '#4f46e5', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }, buttonText: { color: '#fff', fontSize: 13 },
});
