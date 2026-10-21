import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ContestDetailScreen from '../screens/ContestDetailScreen';
import ReelsScreen from '../screens/ReelsScreen';
import AuditionsScreen from '../screens/AuditionsScreen';
import TalentsScreen from '../screens/TalentsScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import KycScreen from '../screens/KycScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatThreadScreen from '../screens/ChatThreadScreen';
import ReferralsScreen from '../screens/ReferralsScreen';
import MyDisputesScreen from '../screens/MyDisputesScreen';
import UploadReelScreen from '../screens/UploadReelScreen';
import BookingScreen from '../screens/BookingScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import BattlesScreen from '../screens/BattlesScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import TalentBookingsScreen from '../screens/talent/TalentBookingsScreen';

import HostDashboardScreen from '../screens/host/HostDashboardScreen';
import CreateContestScreen from '../screens/host/CreateContestScreen';
import HostContestDetailScreen from '../screens/host/HostContestDetailScreen';
import AssignJudgeScreen from '../screens/host/AssignJudgeScreen';

import JudgeDashboardScreen from '../screens/judge/JudgeDashboardScreen';
import JudgeScoringScreen from '../screens/judge/JudgeScoringScreen';

import RecruiterDashboardScreen from '../screens/recruiter/RecruiterDashboardScreen';
import CreateAuditionScreen from '../screens/recruiter/CreateAuditionScreen';
import RecruiterApplicationsScreen from '../screens/recruiter/RecruiterApplicationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const BRAND_COLOR = '#4f46e5';
const INACTIVE_COLOR = '#6b7280';
const TAB_ICONS: Record<string, string> = { HostDashboard: '📋', JudgeDashboard: '⚖️', RecruiterDashboard: '🎯', Home: '🏠', Reels: '🎬', Auditions: '🎤', Talents: '⭐', Profile: '👤' };

function ChatHeaderButton({ navigation }: { navigation: any }) {
  return (<View style={{ flexDirection: 'row' }}><TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ paddingHorizontal: 8 }}><Text style={{ fontSize: 20 }}>🔔</Text></TouchableOpacity><TouchableOpacity onPress={() => navigation.navigate('ChatList')} style={{ paddingHorizontal: 8, marginRight: 8 }}><Text style={{ fontSize: 20 }}>💬</Text></TouchableOpacity></View>);
}

function MainTabs({ role }: { role: string }) {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: true, headerLeft: () => <Image source={require('../assets/ojas-emblem.png')} style={{ width: 32, height: 32, borderRadius: 8, marginLeft: 14 }} />, headerRight: () => <ChatHeaderButton navigation={navigation} />,
        headerTitleStyle: { fontFamily: 'serif', fontWeight: 'bold', color: '#111827' },
        tabBarActiveTintColor: BRAND_COLOR, tabBarInactiveTintColor: INACTIVE_COLOR, tabBarLabelStyle: { fontWeight: 'bold' },
        tabBarIcon: ({ color }: { color: string }) => (<Text style={{ fontSize: 20, color }}>{TAB_ICONS[route.name] || '•'}</Text>),
      })}
    >
      {role === 'HOST' && <Tab.Screen name="HostDashboard" component={HostDashboardScreen} options={{ title: 'My Contests', tabBarLabel: 'Contests' }} />}
      {role === 'JUDGE' && <Tab.Screen name="JudgeDashboard" component={JudgeDashboardScreen} options={{ title: 'Judging', tabBarLabel: 'Judging' }} />}
      {role === 'RECRUITER' && <Tab.Screen name="RecruiterDashboard" component={RecruiterDashboardScreen} options={{ title: 'My Auditions', tabBarLabel: 'Auditions' }} />}
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Contests & Live' }} />
      <Tab.Screen name="Reels" component={ReelsScreen} />
      <Tab.Screen name="Auditions" component={AuditionsScreen} />
      <Tab.Screen name="Talents" component={TalentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return (<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main">{() => <MainTabs role={user.role} />}</Stack.Screen>
            <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
            <Stack.Screen name="FollowList" component={FollowListScreen} options={({ route }: any) => ({ headerShown: true, title: route.params?.mode === 'followers' ? 'Followers' : 'Following' })} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ headerShown: true, title: 'Go Premium' }} />
            <Stack.Screen name="Kyc" component={KycScreen} options={{ headerShown: true, title: 'KYC' }} />
            <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: true, title: 'Wallet' }} />
            <Stack.Screen name="ChatList" component={ChatListScreen} options={{ headerShown: true, title: 'Messages' }} />
            <Stack.Screen name="ChatThread" component={ChatThreadScreen} options={{ headerShown: true, title: 'Chat' }} />
            <Stack.Screen name="Referrals" component={ReferralsScreen} options={{ headerShown: true, title: 'Refer & Earn' }} />
            <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ headerShown: true, title: 'Disputes' }} />
            <Stack.Screen name="Booking" component={BookingScreen} options={{ headerShown: true, title: 'Book Talent' }} />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ headerShown: true, title: 'My Bookings' }} />
            <Stack.Screen name="TalentBookings" component={TalentBookingsScreen} options={{ headerShown: true, title: 'Bookings & Calendar' }} />
            <Stack.Screen name="Battles" component={BattlesScreen} options={{ headerShown: true, title: 'Battles' }} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: true, title: 'Leaderboard' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }} />
            <Stack.Screen name="UploadReel" component={UploadReelScreen} options={{ headerShown: true, title: 'Upload Reel' }} />
            <Stack.Screen name="ContestDetail" component={ContestDetailScreen} options={{ headerShown: true, title: 'Contest' }} />
            <Stack.Screen name="CreateContest" component={CreateContestScreen} options={{ headerShown: true, title: 'New Contest' }} />
            <Stack.Screen name="HostContestDetail" component={HostContestDetailScreen} options={{ headerShown: true, title: 'Contest' }} />
            <Stack.Screen name="AssignJudge" component={AssignJudgeScreen} options={{ headerShown: true, title: 'Assign a Judge' }} />
            <Stack.Screen name="JudgeScoring" component={JudgeScoringScreen} options={{ headerShown: true, title: 'Score Participants' }} />
            <Stack.Screen name="CreateAudition" component={CreateAuditionScreen} options={{ headerShown: true, title: 'New Audition' }} />
            <Stack.Screen name="RecruiterApplications" component={RecruiterApplicationsScreen} options={{ headerShown: true, title: 'Applicants' }} />
          </>
        ) : (<Stack.Screen name="Login" component={LoginScreen} />)}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
