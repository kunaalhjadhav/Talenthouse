import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { errMsg } from '../api/pay';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [eng, setEng] = useState<any>(null);
  const load = useCallback(() => { api.get('/engagement/me').then((r) => setEng(r.data)).catch(() => {}); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function checkIn() { try { const { data } = await api.post('/engagement/check-in'); Alert.alert('Checked in', `You now have ${data.xp} XP and a ${data.streak}-day streak.`); load(); } catch (e: any) { Alert.alert('Check-in', errMsg(e, 'Could not check in')); } }
  const Item = ({ label, to }: { label: string; to: string }) => (<TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate(to)}><Text style={s.menuItemText}>{label}</Text></TouchableOpacity>);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 24 }}>
      <Text style={s.mobile}>{user?.mobile}</Text><Text style={s.role}>{user?.role}</Text>
      {eng && (
        <View style={s.xpBox}>
          <Text style={s.level}>{eng.level} · {eng.xp} XP</Text>
          {eng.nextLevel ? <Text style={s.xpMeta}>{Math.max(0, eng.nextLevelXp - eng.xp)} XP to {eng.nextLevel}</Text> : <Text style={s.xpMeta}>Top level reached</Text>}
          <Text style={s.xpMeta}>🔥 {eng.streak}-day streak</Text>
          <TouchableOpacity style={[s.checkBtn, eng.checkedInToday && { backgroundColor: '#9ca3af' }]} disabled={eng.checkedInToday} onPress={checkIn}><Text style={s.checkText}>{eng.checkedInToday ? 'Checked in today ✓' : 'Daily check-in'}</Text></TouchableOpacity>
          <View style={s.badges}>{eng.badges.map((b: any) => (<Text key={b.key} style={[s.badge, !b.earned && s.badgeOff]}>{b.label}</Text>))}</View>
        </View>)}
      {user?.role === 'TALENT' && <Item label="📅 Bookings & calendar" to="TalentBookings" />}
      <Item label="🧾 My bookings" to="MyBookings" />
      <Item label="⚔️ Battles" to="Battles" />
      <Item label="🏅 Leaderboard" to="Leaderboard" />
      <Item label="🔔 Notifications" to="Notifications" />
      <Item label="💰 Wallet" to="Wallet" />
      <Item label="⭐ Plans" to="Subscription" />
      <Item label="🎁 Refer & Earn" to="Referrals" />
      <Item label="🛟 My Disputes / Support Tickets" to="MyDisputes" />
      <TouchableOpacity style={s.button} onPress={logout}><Text style={s.buttonText}>Sign out</Text></TouchableOpacity>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  mobile: { fontSize: 20, color: '#111827' }, role: { fontSize: 14, color: '#374151', marginTop: 4, marginBottom: 16 },
  xpBox: { backgroundColor: '#eef2ff', borderRadius: 12, padding: 14, marginBottom: 12 }, level: { fontSize: 17, color: '#3730a3' }, xpMeta: { fontSize: 12, color: '#4338ca', marginTop: 3 },
  checkBtn: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 }, checkText: { color: '#fff', fontSize: 14 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }, badge: { fontSize: 11, color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }, badgeOff: { color: '#6b7280', backgroundColor: '#e5e7eb' },
  menuItem: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#e5e7eb' }, menuItemText: { fontSize: 15, color: '#111827' },
  button: { backgroundColor: '#fecaca', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24 }, buttonText: { color: '#991b1b' },
});
