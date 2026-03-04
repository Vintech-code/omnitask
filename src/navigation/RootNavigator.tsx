/**
 * RootNavigator
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns the auth-guarded root stack and notification listeners.
 * Extracted from App.tsx to keep App.tsx a pure provider wrapper.
 */
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';

import { useTheme }  from '@/context/ThemeContext';
import { useAuth }   from '@/context/AuthContext';
import { requestNotificationPermission } from '@/services/NotificationService';

import WelcomeScreen      from '@/screens/WelcomeScreen';
import SignInScreen       from '@/screens/SignInScreen';
import SignUpScreen       from '@/screens/SignUpScreen';
import OnboardingScreen   from '@/screens/OnboardingScreen';
import CreateEventScreen  from '@/screens/CreateEventScreen';
import EventDetailScreen  from '@/screens/EventDetailScreen';
import EventAlarmsScreen  from '@/screens/EventAlarmsScreen';
import ProfileScreen      from '@/screens/ProfileScreen';
import SearchScreen       from '@/screens/SearchScreen';
import StatsScreen        from '@/screens/StatsScreen';
import MainTabNavigator   from '@/navigation/MainTabNavigator';

import type { RootStackParamList } from '@/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isDark }           = useTheme();
  const { user, isLoading }  = useAuth();
  const isExpoGo = isRunningInExpoGo();

  // Request push-notification permission on first launch
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Handle notification taps (deep-link navigation can be wired here)
  useEffect(() => {
    if (isExpoGo) return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // TODO: navigate to relevant screen on tap
    });
    return () => sub.remove();
  }, [isExpoGo]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName={user ? 'Main' : 'Welcome'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome"      component={WelcomeScreen} />
        <Stack.Screen name="SignIn"       component={SignInScreen} />
        <Stack.Screen name="SignUp"       component={SignUpScreen} />
        <Stack.Screen name="Onboarding"   component={OnboardingScreen} />
        <Stack.Screen name="Main"         component={MainTabNavigator} />
        <Stack.Screen name="CreateEvent"  component={CreateEventScreen} />
        <Stack.Screen name="EventDetail"  component={EventDetailScreen} />
        <Stack.Screen name="EventAlarms"  component={EventAlarmsScreen} />
        <Stack.Screen name="Profile"      component={ProfileScreen} />
        <Stack.Screen name="Search"       component={SearchScreen} />
        <Stack.Screen name="Stats"        component={StatsScreen} />
      </Stack.Navigator>
    </>
  );
}
