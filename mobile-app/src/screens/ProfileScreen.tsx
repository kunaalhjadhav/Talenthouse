import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  return (
    <View style={styles.container}>
      <Text style={styles.mobile}>{user?.mobile}</Text>
      <Text style={styles.role}>{user?.role}</Text>

      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Referrals')}>
        <Text style={styles.menuItemText}>Refer & Earn</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyDisputes')}>
        <Text style={styles.menuItemText}>My Disputes / Support Tickets</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  mobile: { fontSize: 20, fontWeight: '700' },
  role: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 24 },
  menuItem: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  menuItemText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  button: { backgroundColor: '#fee2e2', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#dc2626', fontWeight: '600' },
});
