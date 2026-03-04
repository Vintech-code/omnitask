import 'react-native-gesture-handler';
import React, { useMemo, useState } from 'react';
import { Alert, LogBox, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Suppress Expo Go SDK 53 remote push token warning — local notifications still work
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  '[expo-av]: Expo AV has been deprecated',
]);
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';

import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { EventProvider } from './src/context/EventStore';
import { TaskProvider } from './src/context/TaskStore';
import { AlarmProvider } from './src/context/AlarmStore';
import RootNavigator from './src/navigation/RootNavigator';
import { cancelNativeAlarm, getNextTimeMillis, requestAlarmPermissions, scheduleNativeAlarm } from './src/native/AlarmModule';

enableScreens();

function AlarmDemoPanel() {
  const [hourText, setHourText] = useState('07');
  const [minuteText, setMinuteText] = useState('30');
  const [alarmIdText, setAlarmIdText] = useState('1001');

  const parsed = useMemo(() => {
    const hour = Math.max(0, Math.min(23, Number(hourText) || 0));
    const minute = Math.max(0, Math.min(59, Number(minuteText) || 0));
    const id = Math.max(1, Number(alarmIdText) || 1);
    return { hour, minute, id };
  }, [hourText, minuteText, alarmIdText]);

  const onRequestPermissions = async () => {
    try {
      const ok = await requestAlarmPermissions();
      Alert.alert(ok ? 'Permissions ready' : 'Permission needed', ok ? 'Alarm permissions are granted.' : 'Please grant exact alarm/notification permissions.');
    } catch (error: any) {
      Alert.alert('Permission error', error?.message ?? 'Could not request alarm permissions.');
    }
  };

  const onSchedule = async () => {
    try {
      const hasPerms = await requestAlarmPermissions();
      if (!hasPerms) return;
      const when = getNextTimeMillis(parsed.hour, parsed.minute);
      await scheduleNativeAlarm({
        id: parsed.id,
        timeMillis: when,
        label: `OmniTask Alarm #${parsed.id}`,
      });
      Alert.alert('Alarm scheduled', `ID ${parsed.id} at ${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`);
    } catch (error: any) {
      Alert.alert('Schedule failed', error?.message ?? 'Unable to schedule alarm.');
    }
  };

  const onCancel = async () => {
    try {
      await cancelNativeAlarm(parsed.id);
      Alert.alert('Alarm canceled', `ID ${parsed.id} canceled.`);
    } catch (error: any) {
      Alert.alert('Cancel failed', error?.message ?? 'Unable to cancel alarm.');
    }
  };

  if (Platform.OS !== 'android') return null;

  return (
    <View style={demo.panel}>
      <Text style={demo.title}>Native Alarm Test</Text>
      <View style={demo.row}>
        <TextInput style={demo.input} value={hourText} onChangeText={setHourText} keyboardType="number-pad" placeholder="HH" placeholderTextColor="#888" maxLength={2} />
        <Text style={demo.colon}>:</Text>
        <TextInput style={demo.input} value={minuteText} onChangeText={setMinuteText} keyboardType="number-pad" placeholder="MM" placeholderTextColor="#888" maxLength={2} />
      </View>
      <TextInput style={demo.idInput} value={alarmIdText} onChangeText={setAlarmIdText} keyboardType="number-pad" placeholder="Alarm ID" placeholderTextColor="#888" />

      <TouchableOpacity style={[demo.btn, demo.btnLight]} onPress={onRequestPermissions}>
        <Text style={[demo.btnText, demo.btnTextDark]}>Request Permissions</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[demo.btn, demo.btnPrimary]} onPress={onSchedule}>
        <Text style={demo.btnText}>Schedule Alarm</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[demo.btn, demo.btnDanger]} onPress={onCancel}>
        <Text style={demo.btnText}>Cancel Alarm</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <TaskProvider>
            <AlarmProvider>
              <EventProvider>
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </EventProvider>
            </AlarmProvider>
          </TaskProvider>
        </AuthProvider>
      </ThemeProvider>
      {__DEV__ && <AlarmDemoPanel />}
    </View>
  );
}

const demo = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: 12,
    bottom: 20,
    width: 230,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: { color: '#fff', fontWeight: '700', marginBottom: 8, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  input: {
    width: 54,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    color: '#fff',
    textAlign: 'center',
  },
  colon: { color: '#fff', marginHorizontal: 8, fontSize: 18, fontWeight: '700' },
  idInput: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    color: '#fff',
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  btn: {
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  btnPrimary: { backgroundColor: '#2D7FF9' },
  btnDanger: { backgroundColor: '#D94848' },
  btnLight: { backgroundColor: '#E5E7EB' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  btnTextDark: { color: '#111' },
});

