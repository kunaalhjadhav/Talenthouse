import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Polling-based for simplicity and to avoid an extra native WebSocket dependency
// in this initial build. To upgrade to real-time: add a NestJS WebSocket gateway
// (@nestjs/websockets, already compatible with this module's ChatService) and
// swap this interval for a socket.io-client subscription — the REST endpoints
// stay as the source of truth / fallback either way.
const POLL_INTERVAL_MS = 4000;

export default function ChatThreadScreen() {
  const route = useRoute<any>();
  const { conversationId, otherUserName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const intervalRef = useRef<any>(null);

  const load = useCallback(() => {
    api.get(`/chat/conversations/${conversationId}/messages`)
      .then((res) => setMessages(res.data.slice().reverse()))
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    load();
    api.post(`/chat/conversations/${conversationId}/read`).catch(() => {});
    intervalRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [load, conversationId]);

  async function send() {
    if (!text.trim()) return;
    const body = text;
    setText('');
    try {
      await api.post(`/chat/conversations/${conversationId}/messages`, { body });
      load();
    } catch {}
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        style={{ flex: 1, backgroundColor: '#f9fafb' }}
        contentContainerStyle={{ padding: 16 }}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          return (
            <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.body}</Text>
              </View>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={`Message ${otherUserName || ''}`}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={send}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: '#4f46e5' },
  bubbleTheirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  bubbleTextMine: { color: '#fff', fontSize: 14 },
  bubbleTextTheirs: { color: '#111827', fontSize: 14 },
  inputRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 100 },
  sendButton: { backgroundColor: '#4f46e5', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontWeight: '600' },
});
