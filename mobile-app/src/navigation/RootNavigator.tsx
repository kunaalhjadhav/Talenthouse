import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ReelsScreen from '../screens/ReelsScreen';
import AuditionsScreen from '../screens/AuditionsScreen';
import TalentsScreen from '../screens/TalentsScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import KycScreen from '../screens/KycScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatThreadScreen from '../screens/ChatThreadScreen';
import ReferralsScreen from '../screens/ReferralsScreen';
import MyDisputesScreen from '../screens/MyDisputesScreen';
import UploadReelScreen from '../screens/UploadReelScreen';

import HostDashboardScreen from '../screens/host/HostDashboardScreen';
import CreateContestScreen from '../screens/host/CreateContestScreen';
import HostContestDetailScreen from '../screens/host/HostContestDetailScreen';

import JudgeDashboardScreen from '../screens/judge/JudgeDashboardScreen';
import JudgeScoringScreen from '../screens/judge/JudgeScoringScreen';

import RecruiterDashboardScreen from '../screens/recruiter/RecruiterDashboardScreen';
import CreateAuditionScreen from '../screens/recruiter/CreateAuditionScreen';
import RecruiterApplicationsScreen from '../screens/recruiter/RecruiterApplicationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Bottom tabs are role-dependent: a HOST/JUDGE/RECRUITER sees their work
 * dashboard as the primary tab alongside the same participant-facing tabs
 * (everyone can still browse contests, watch reels, etc.) — this mirrors the
 * PRD's "any user can also be a host/judge/talent" model rather than forcing
 * separate app installs per role.
 */
function MainTabs({ role }: { role: string }) {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      {role === 'HOST' && <Tab.Screen name="HostDashboard" component={HostDashboardScreen} options={{ title: 'My Contests' }} />}
      {role === 'JUDGE' && <Tab.Screen name="JudgeDashboard" component={JudgeDashboardScreen} options={{ title: 'Judging' }} />}
      {role === 'RECRUITER' && <Tab.Screen name="RecruiterDashboard" component={RecruiterDashboardScreen} options={{ title: 'My Auditions' }} />}

      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reels" component={ReelsScreen} />
      <Tab.Screen name="Auditions" component={AuditionsScreen} />
      <Tab.Screen name="Talents" component={TalentsScreen} />
      <Tab.Screen name="Chats" component={ChatListScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main">
              {() => <MainTabs role={user.role} />}
            </Stack.Screen>
            <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
            <Stack.Screen name="Kyc" component={KycScreen} options={{ headerShown: true, title: 'KYC' }} />
            <Stack.Screen name="ChatThread" component={ChatThreadScreen} options={{ headerShown: true, title: 'Chat' }} />
            <Stack.Screen name="Referrals" component={ReferralsScreen} options={{ headerShown: true, title: 'Refer & Earn' }} />
            <Stack.Screen name="MyDisputes" component={MyDisputesScreen} options={{ headerShown: true, title: 'Disputes' }} />
            <Stack.Screen name="UploadReel" component={UploadReelScreen} options={{ headerShown: true, title: 'Upload Reel' }} />

            {/* Host flow */}
            <Stack.Screen name="CreateContest" component={CreateContestScreen} options={{ headerShown: true, title: 'New Contest' }} />
            <Stack.Screen name="HostContestDetail" component={HostContestDetailScreen} options={{ headerShown: true, title: 'Contest' }} />

            {/* Judge flow */}
            <Stack.Screen name="JudgeScoring" component={JudgeScoringScreen} options={{ headerShown: true, title: 'Score Participants' }} />

            {/* Recruiter flow */}
            <Stack.Screen name="CreateAudition" component={CreateAuditionScreen} options={{ headerShown: true, title: 'New Audition' }} />
            <Stack.Screen name="RecruiterApplications" component={RecruiterApplicationsScreen} options={{ headerShown: true, title: 'Applicants' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
