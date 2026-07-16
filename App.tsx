import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';

import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { EventProvider } from './src/context/EventStore';
import { TaskProvider } from './src/context/TaskStore';
import { AlarmProvider } from './src/context/AlarmStore';
import RootNavigator from './src/navigation/RootNavigator';
import { flushPendingAlarmNavigation, navigationRef } from './src/navigation/navigationRef';

enableScreens();

export default function App(): React.JSX.Element | null {
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
