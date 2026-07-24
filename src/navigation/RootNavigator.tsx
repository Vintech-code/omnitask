/**
 * RootNavigator
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns the auth-guarded root stack and notification listeners.
 * Extracted from App.tsx to keep App.tsx a pure provider wrapper.
 */
import React, { useEffect, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';

import { useTheme }  from '@/context/ThemeContext';
import { useAuth }   from '@/context/AuthContext';
import {
  ALARM_SNOOZE_ACTION,
  ALARM_STOP_ACTION,
  configureAlarmNotifications,
  dismissAlarmNotification,
  getAlarmPayload,
  snoozeAlarmNotification,
} from '@/services/NotificationService';
import { openEventDetail, openRingingAlarm, openTaskDetail } from '@/navigation/navigationRef';
import { useEvents } from '@/context/EventStore';

import WelcomeScreen      from '@/screens/WelcomeScreen';
import SignInScreen       from '@/screens/SignInScreen';
import SignUpScreen       from '@/screens/SignUpScreen';
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen';
import EmailVerificationScreen from '@/screens/EmailVerificationScreen';
import OnboardingScreen   from '@/screens/OnboardingScreen';
import CreateEventScreen  from '@/screens/CreateEventScreen';
import EventDetailScreen  from '@/screens/EventDetailScreen';
import ProfileScreen      from '@/screens/ProfileScreen';
import StatsScreen        from '@/screens/StatsScreen';
import RingingAlarmScreen from '@/screens/RingingAlarmScreen';
import WeatherScreen      from '@/screens/WeatherScreen';
import MainTabNavigator   from '@/navigation/MainTabNavigator';
import { ScreenSkeleton } from '@/components/ui';

import type { RootStackParamList } from '@/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isDark }           = useTheme();
  const { user, isLoading, emailVerified, hasSeenOnboarding } = useAuth();
  const { events } = useEvents();
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const isExpoGo = isRunningInExpoGo();

  // Register notification actions without consuming the onboarding permission
  // prompt before the user explicitly chooses to enable notifications.
  useEffect(() => {
    void configureAlarmNotifications().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isExpoGo) return;
    const received = Notifications.addNotificationReceivedListener(notification => {
      const payload = getAlarmPayload(notification);
      if (payload) openRingingAlarm(payload);
    });

    const handleResponse = async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'event-weather' && typeof data.eventId === 'string') {
        const event = eventsRef.current.find(item => item.id === data.eventId);
        if (event) openEventDetail(event);
        return;
      }
      if (data?.type === 'task' && typeof data.taskId === 'string') {
        openTaskDetail(data.taskId);
        return;
      }
      const payload = getAlarmPayload(response.notification);
      if (!payload) return;
      if (response.actionIdentifier === ALARM_STOP_ACTION) {
        await dismissAlarmNotification(payload.notificationIdentifier);
        return;
      }
      if (response.actionIdentifier === ALARM_SNOOZE_ACTION) {
        await snoozeAlarmNotification(payload);
        return;
      }
      openRingingAlarm(payload);
    };

    const response = Notifications.addNotificationResponseReceivedListener(value => {
      void handleResponse(value);
    });
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      void handleResponse(lastResponse).finally(() => {
        Notifications.clearLastNotificationResponse();
      });
    }

    return () => {
      received.remove();
      response.remove();
    };
  }, [isExpoGo]);

  if (isLoading) {
    return <ScreenSkeleton variant="profile" />;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        key={!user ? 'guest' : emailVerified ? 'verified' : 'verification-required'}
        initialRouteName={!user ? 'Welcome' : emailVerified ? (hasSeenOnboarding ? 'Main' : 'Onboarding') : 'EmailVerification'}
        screenOptions={{ headerShown: false }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : !emailVerified ? (
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Stats" component={StatsScreen} />
            <Stack.Screen name="Weather" component={WeatherScreen} />
            <Stack.Screen name="RingingAlarm" component={RingingAlarmScreen} options={{ presentation: 'modal', gestureEnabled: false }} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
}
