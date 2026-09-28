import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { api } from '../api/client';

export default function UploadReelScreen({ navigation }: any) {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');

  async function pickVideo() {
    const result = await launchImageLibrary({ mediaType: 'video' });
    if (result.assets?.[0]?.uri) setVideoUri(result.assets[0].uri);
  }

  async function submit() {
    if (!videoUri || !category) return Alert.alert('Pick a video and enter a category');
    setBusy(true);
    try {
      setStatusText('Requesting upload slot...');
      const { data: upload } = await api.post('/reels/upload-url');

      setStatusText('Uploading video...');
      // Direct upload to Mux — a plain PUT of the raw file to the signed URL,
      // not routed through our own backend.
      const fileBlob = { uri: videoUri, type: 'video/mp4', name: 'reel.mp4' } as any;
      await fetch(upload.uploadUrl, { method: 'PUT', body: fileBlob });

      setStatusText('Finalizing reel...');
      await api.post('/reels', { muxUploadId: upload.uploadId, category, caption });

      Alert.alert('Uploaded', 'Your reel is processing and will appear in the feed shortly.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Could not upload reel');
    } finally {
      setBusy(false);
      setStatusText('');
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.videoPicker} onPress={pickVideo}>
        <Text style={styles.videoPickerText}>{videoUri ? 'Video selected ✓' : 'Choose a video'}</Text>
      </TouchableOpacity>

      <TextInput style={styles.input} placeholder="Category (e.g. Singing, Dance)" value={category} onChangeText={setCategory} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Caption" value={caption} onChangeText={setCaption} multiline />

      <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Upload Reel</Text>}
      </TouchableOpacity>
      {!!statusText && <Text style={styles.statusText}>{statusText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  videoPicker: { borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 12, padding: 32, alignItems: 'center', marginBottom: 20 },
  videoPickerText: { color: '#6b7280', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  button: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  statusText: { textAlign: 'center', color: '#6b7280', marginTop: 12, fontSize: 13 },
});
