import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { EventProvider } from './src/context/EventStore';
import { TaskProvider } from './src/context/TaskStore';
import { CanvasNoteProvider } from './src/context/CanvasNoteStore';
import { AlarmProvider } from './src/context/AlarmStore';
import { AttachmentProvider } from './src/context/AttachmentStore';
import { SyncProvider } from './src/context/SyncStore';
import { FocusSessionProvider } from './src/context/FocusSessionStore';
import RootNavigator from './src/navigation/RootNavigator';
import { flushPendingAlarmNavigation, navigationRef } from './src/navigation/navigationRef';
import { handleNotificationProbeUrl } from './src/testing/NotificationDeviceProbe';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { AppDialogProvider } from './src/components/ui/AppDialog';
import { OMNITASK_PALETTE } from './src/theme/colors';
import {
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_600SemiBold_Italic,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';

enableScreens();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App(): React.JSX.Element | null {
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_600SemiBold_Italic,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

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

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: OMNITASK_PALETTE.pearlIce }} onLayout={revealAnimatedSplash}>
        <ThemeProvider>
          <AppDialogProvider>
            <AuthProvider>
              <SyncProvider>
                <AttachmentProvider>
                  <TaskProvider>
                    <FocusSessionProvider>
                      <CanvasNoteProvider>
                        <AlarmProvider>
                          <EventProvider>
                            <NavigationContainer ref={navigationRef} onReady={flushPendingAlarmNavigation}>
                              <RootNavigator />
                            </NavigationContainer>
                          </EventProvider>
                        </AlarmProvider>
                      </CanvasNoteProvider>
                    </FocusSessionProvider>
                  </TaskProvider>
                </AttachmentProvider>
              </SyncProvider>
            </AuthProvider>
          </AppDialogProvider>
        </ThemeProvider>
        {showAnimatedSplash ? <AnimatedSplashScreen onFinish={() => setShowAnimatedSplash(false)} /> : null}
      </View>
    </SafeAreaProvider>
  );
}
