import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, View, LogBox } from 'react-native';

// Suppress Expo Go SDK 53 remote push token warning — local notifications still work
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import WelcomeScreen from './src/screens/WelcomeScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import EventAlarmsScreen from './src/screens/EventAlarmsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SearchScreen from './src/screens/SearchScreen';
import StatsScreen from './src/screens/StatsScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { EventProvider } from './src/context/EventStore';
import { TaskProvider } from './src/context/TaskStore';
import { AlarmProvider } from './src/context/AlarmStore';

import { requestNotificationPermission } from './src/services/NotificationService';

const Stack = createStackNavigator();

enableScreens();

function AppNavigator() {
  const { isDark } = useTheme();
  const { user, isLoading } = useAuth();

  // Request notification permission on first launch
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Listen for notification taps
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // navigate to relevant screen on tap — handled via deep link in future
    });
    return () => sub.remove();
  }, []);

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
        <Stack.Screen name="Welcome"    component={WelcomeScreen} />
        <Stack.Screen name="SignIn"     component={SignInScreen} />
        <Stack.Screen name="SignUp"     component={SignUpScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main"       component={MainTabNavigator} />
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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TaskProvider>
          <AlarmProvider>
            <EventProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </EventProvider>
          </AlarmProvider>
        </TaskProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

