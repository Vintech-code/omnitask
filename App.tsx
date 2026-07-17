import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Linking, View } from 'react-native';
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

enableScreens();

export default function App(): React.JSX.Element | null {
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
    <View style={{ flex: 1 }}>
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
    </View>
  );
}
