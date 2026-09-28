import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import FollowButton from '../components/FollowButton';
import StarRatingInput from '../components/StarRatingInput';
import { useAuth } from '../context/AuthContext';

export default function UserProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();
  const { userId } = route.params;
  const [profile, setProfile] = useState<any>(null);
  const [ratingAvg, setRatingAvg] = useState<{ average: number; count: number } | null>(null);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    api.get(`/users/${userId}/public-profile`).then((res) => setProfile(res.data)).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (profile?.role === 'TALENT') {
      api.get(`/ratings/TALENT/${userId}/average`).then((res) => setRatingAvg(res.data)).catch(() => {});
    }
  }, [profile, userId]);

  async function messageUser() {
    setMessaging(true);
    try {
      const { data } = await api.post(`/chat/conversations/with/${userId}`);
      navigation.navigate('ChatThread', { conversationId: data.id, otherUserName: profile?.name });
    } catch {} finally {
      setMessaging(false);
    }
  }

  if (!profile) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const isMe = currentUser?.id === userId;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <View style={styles.header}>
        {profile.profilePhoto ? (
          <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{(profile.name || '?')[0].toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile.name || 'Unnamed'}</Text>
        <Text style={styles.role}>{profile.role} {profile.city ? `· ${profile.city}` : ''}</Text>

        {ratingAvg && ratingAvg.count > 0 && (
          <Text style={styles.ratingSummary}>★ {ratingAvg.average.toFixed(1)} ({ratingAvg.count} rating{ratingAvg.count === 1 ? '' : 's'})</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {!isMe && (
          <View style={styles.actionsRow}>
            <FollowButton userId={userId} />
            <TouchableOpacity style={styles.messageButton} onPress={messageUser} disabled={messaging}>
              <Text style={styles.messageButtonText}>{messaging ? '...' : 'Message'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {profile.profile?.bio && <Text style={styles.bio}>{profile.profile.bio}</Text>}

      {!isMe && profile.role === 'TALENT' && (
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Rate this talent</Text>
          <StarRatingInput targetType="TALENT" targetId={userId} onSubmitted={() => api.get(`/ratings/TALENT/${userId}/average`).then((res) => setRatingAvg(res.data))} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  header: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 32, fontWeight: '700', color: '#6b7280' },
  name: { fontSize: 20, fontWeight: '700' },
  role: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 16 },
  ratingSummary: { fontSize: 14, color: '#f59e0b', fontWeight: '600', marginTop: -8, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 32, marginBottom: 16 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  messageButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db' },
  messageButtonText: { fontWeight: '600', fontSize: 14, color: '#374151' },
  bio: { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 20 },
  ratingSection: { marginTop: 24, borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
});
