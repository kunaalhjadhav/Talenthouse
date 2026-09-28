import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api/client';

export default function FollowButton({ userId }: { userId: string }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/users/${userId}/is-following`)
      .then((res) => setFollowing(res.data.following))
      .catch(() => setFollowing(false)); // e.g. not logged in — treat as "not following", button still tappable to trigger login flow upstream
  }, [userId]);

  async function toggle() {
    setBusy(true);
    try {
      if (following) {
        await api.delete(`/users/${userId}/follow`);
        setFollowing(false);
      } else {
        await api.post(`/users/${userId}/follow`);
        setFollowing(true);
      }
    } catch {
      // Swallow — a failed follow/unfollow shouldn't crash the profile screen;
      // the button simply stays at its last known state for the user to retry.
    } finally {
      setBusy(false);
    }
  }

  if (following === null) return <ActivityIndicator size="small" />;

  return (
    <TouchableOpacity
      onPress={toggle}
      disabled={busy}
      style={[styles.button, following ? styles.following : styles.notFollowing]}
    >
      <Text style={[styles.text, following ? styles.followingText : styles.notFollowingText]}>
        {busy ? '...' : following ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  notFollowing: { backgroundColor: '#4f46e5' },
  following: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db' },
  text: { fontWeight: '600', fontSize: 14 },
  notFollowingText: { color: '#fff' },
  followingText: { color: '#374151' },
});
