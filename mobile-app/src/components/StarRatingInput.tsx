import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { api } from '../api/client';

export default function StarRatingInput({
  targetType,
  targetId,
  onSubmitted,
}: {
  targetType: 'TALENT' | 'HOST' | 'RECRUITER' | 'JUDGE' | 'BOOKING';
  targetId: string;
  onSubmitted?: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (stars === 0) return Alert.alert('Pick a star rating first');
    setBusy(true);
    try {
      await api.post('/ratings', { targetType, targetId, stars, review });
      Alert.alert('Thanks!', 'Your rating has been submitted.');
      onSubmitted?.();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not submit rating');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setStars(n)}>
            <Text style={[styles.star, n <= stars && styles.starFilled]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Write a review (optional)"
        value={review}
        onChangeText={setReview}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Submitting...' : 'Submit Rating'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  star: { fontSize: 32, color: '#e5e7eb' },
  starFilled: { color: '#f59e0b' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, marginBottom: 10, minHeight: 60, textAlignVertical: 'top' },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
