import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';

/** One screen for both "Followers" and "Following" — mode decides which endpoint and field to read. */
export default function FollowListScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { userId, mode } = route.params as { userId: string; mode: 'followers' | 'following' };
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${userId}/${mode}`).then((res) => setList(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [userId, mode]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }} data={list} keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>{mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</Text>}
      renderItem={({ item }) => {
        const person = mode === 'followers' ? item.follower : item.followingUser;
        return (
          <TouchableOpacity style={styles.row} onPress={() => navigation.push('UserProfile', { userId: person.id })}>
            {person.profilePhoto ? (<Image source={{ uri: person.profilePhoto }} style={styles.avatar} />) : (<View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{(person.name || '?')[0].toUpperCase()}</Text></View>)}
            <View><Text style={styles.name}>{person.name || 'Unnamed'}</Text><Text style={styles.role}>{person.role}</Text></View>
          </TouchableOpacity>
        );
      }}
    />
  );
}
const styles = StyleSheet.create({
  empty: { color: '#374151', textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarFallback: { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }, avatarInitial: { color: '#374151' },
  name: { fontSize: 15, color: '#111827' }, role: { fontSize: 12, color: '#374151', marginTop: 2 },
});
