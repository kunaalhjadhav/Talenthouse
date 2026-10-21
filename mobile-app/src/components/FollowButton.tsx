import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api/client';
export default function FollowButton({ userId }: { userId: string }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get(`/users/${userId}/is-following`).then((res) => setFollowing(res.data.following)).catch(() => setFollowing(false)); }, [userId]);
  async function toggle() { setBusy(true); try { if (following) { await api.delete(`/users/${userId}/follow`); setFollowing(false); } else { await api.post(`/users/${userId}/follow`); setFollowing(true); } } catch {} finally { setBusy(false); } }
  if (following === null) return <ActivityIndicator size="small" />;
  return (<TouchableOpacity onPress={toggle} disabled={busy} style={[styles.button, following ? styles.following : styles.notFollowing]}><Text style={following ? styles.followingText : styles.notFollowingText}>{busy ? '...' : following ? 'Following' : 'Follow'}</Text></TouchableOpacity>);
}
const styles = StyleSheet.create({
  button: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  notFollowing: { backgroundColor: '#4f46e5' }, following: { backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: '#9ca3af' },
  notFollowingText: { color: '#fff' }, followingText: { color: '#111827' },
});
