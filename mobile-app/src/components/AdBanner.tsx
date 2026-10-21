import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native';
import { api } from '../api/client';

/**
 * Fetches any active ad for a given placement and renders it. Records an
 * impression on mount and a click when tapped. Renders nothing if there's
 * no active ad for this placement — never shows a placeholder "ad slot".
 */
export default function AdBanner({ placement }: { placement: string }) {
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    api.get('/subscriptions/me').then((sub) => {
      if (sub.data?.plan && sub.data.plan !== 'FREE' && sub.data.status === 'ACTIVE') return; // paid plans see no ads
      return api.get('/ads', { params: { placement } }).then((res) => {
        const active = res.data?.[0];
        if (alive && active) { setAd(active); api.post(`/ads/${active.id}/impression`).catch(() => {}); }
      });
    }).catch(() => {});
    return () => { alive = false; };
  }, [placement]);

  if (!ad) return null;

  async function handlePress() {
    api.post(`/ads/${ad.id}/click`).catch(() => {});
    if (ad.targetUrl) Linking.openURL(ad.targetUrl).catch(() => {});
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      {ad.mediaUrl ? <Image source={{ uri: ad.mediaUrl }} style={styles.image} /> : <View style={styles.placeholderImage} />}
      <View style={styles.overlay}><Text style={styles.sponsoredLabel}>Sponsored</Text><Text style={styles.title} numberOfLines={1}>{ad.title}</Text></View>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  container: { height: 90, borderRadius: 12, overflow: 'hidden', marginHorizontal: 12, marginBottom: 14, backgroundColor: '#e5e7eb' },
  image: { width: '100%', height: '100%', position: 'absolute' },
  placeholderImage: { width: '100%', height: '100%', backgroundColor: '#c7d2fe' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', padding: 8 },
  sponsoredLabel: { color: '#e5e7eb', fontSize: 9 }, title: { color: '#fff', fontSize: 13, marginTop: 2 },
});
