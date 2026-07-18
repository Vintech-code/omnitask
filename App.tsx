import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';

import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { EventProvider } from './src/context/EventStore';
import { TaskProvider } from './src/context/TaskStore';
import { AlarmProvider } from './src/context/AlarmStore';
import RootNavigator from './src/navigation/RootNavigator';
import { flushPendingAlarmNavigation, navigationRef } from './src/navigation/navigationRef';
import { handleNotificationProbeUrl } from './src/testing/NotificationDeviceProbe';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';

enableScreens();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App(): React.JSX.Element | null {
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  const revealAnimatedSplash = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    const handleUrl = ({ url }: { url: string }) => {
      void handleNotificationProbeUrl(url);
    };
    void Linking.getInitialURL().then(url => {
      if (url) void handleNotificationProbeUrl(url);
    });
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F8F5' }} onLayout={revealAnimatedSplash}>
      <ThemeProvider>
        <AuthProvider>
          <TaskProvider>
            <AlarmProvider>
              <EventProvider>
                <NavigationContainer ref={navigationRef} onReady={flushPendingAlarmNavigation}>
                  <RootNavigator />
                </NavigationContainer>
              </EventProvider>
            </AlarmProvider>
          </TaskProvider>
        </AuthProvider>
      </ThemeProvider>
      {showAnimatedSplash ? <AnimatedSplashScreen onFinish={() => setShowAnimatedSplash(false)} /> : null}
    </View>
  );
}
