import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
export default function ChatListScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { api.get('/chat/conversations').then((res) => setConversations(res.data)).catch(() => {}).finally(() => setLoading(false)); }, []));
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return (
    <FlatList contentContainerStyle={{ padding: 16 }} data={conversations} keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>No conversations yet. Message a talent or host from their profile to start one.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ChatThread', { conversationId: item.id, otherUserName: item.otherUser?.name })}>
          {item.otherUser?.profilePhoto ? (<Image source={{ uri: item.otherUser.profilePhoto }} style={styles.avatar} />) : (<View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{(item.otherUser?.name || '?')[0].toUpperCase()}</Text></View>)}
          <View style={{ flex: 1 }}><Text style={styles.name}>{item.otherUser?.name || 'User'}</Text><Text style={styles.preview} numberOfLines={1}>{item.lastMessage ? `${item.lastMessage.senderId === user?.id ? 'You: ' : ''}${item.lastMessage.body}` : 'No messages yet'}</Text></View>
        </TouchableOpacity>
      )}
    />
  );
}
const styles = StyleSheet.create({
  empty: { color: '#374151', textAlign: 'center', marginTop: 40, paddingHorizontal: 24, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarFallback: { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }, avatarInitial: { color: '#374151' },
  name: { fontSize: 15, color: '#111827' }, preview: { fontSize: 13, color: '#374151', marginTop: 2 },
});
