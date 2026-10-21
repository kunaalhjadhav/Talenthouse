import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { api } from '../api/client';

/**
 * Replaces the old "paste an image URL" text field. Lets the user pick a
 * photo from their device, uploads it to the backend's /uploads/image
 * endpoint, and reports the resulting hosted URL back to the parent form.
 *
 * NOTE: the backend stores these on local disk (see backend's
 * uploads.controller.ts) — fine for local dev or a VPS, but files are wiped
 * on redeploy on Render's free tier. Swap the backend storage for S3/
 * Cloudinary before relying on this in a production deploy on Render.
 */
export default function ImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  async function pickAndUpload() {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, type: asset.type || 'image/jpeg', name: asset.fileName || 'photo.jpg' } as any);
      const { data } = await api.post('/uploads/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(data.url);
    } catch (e: any) {
      Alert.alert('Upload failed', e.response?.data?.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.picker} onPress={pickAndUpload} disabled={uploading}>
        {uploading ? <ActivityIndicator /> : value ? (
          <Image source={{ uri: value }} style={styles.preview} />
        ) : (
          <Text style={styles.pickerText}>Tap to choose a photo</Text>
        )}
      </TouchableOpacity>
      {!!value && !uploading && <TouchableOpacity onPress={() => onChange('')}><Text style={styles.removeText}>Remove photo</Text></TouchableOpacity>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 13, color: '#374151', marginBottom: 6 },
  picker: { height: 120, borderRadius: 10, borderWidth: 1, borderColor: '#9ca3af', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: '#f9fafb' },
  pickerText: { color: '#6b7280', fontSize: 13 },
  preview: { width: '100%', height: '100%' },
  removeText: { color: '#b91c1c', fontSize: 12, marginTop: 6, textAlign: 'right' },
});
