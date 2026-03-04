import { Alert, NativeModules, PermissionsAndroid, Platform } from 'react-native';

type AlarmNativeModule = {
  scheduleAlarm: (timeMillis: number, id: number, label: string) => Promise<boolean>;
  cancelAlarm: (id: number) => Promise<boolean>;
  canScheduleExactAlarms: () => Promise<boolean>;
  openExactAlarmSettings: () => Promise<boolean>;
};

const NativeAlarm = NativeModules.AlarmModule as AlarmNativeModule | undefined;

function ensureModule(): AlarmNativeModule {
  if (!NativeAlarm) {
    throw new Error('AlarmModule is not available. Build Android native app after prebuild.');
  }
  return NativeAlarm;
}

export async function requestAlarmPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  if (Platform.Version >= 33) {
    const notificationResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (notificationResult !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('Permission required', 'Please allow notifications for alarm alerts.');
      return false;
    }
  }

  const module = ensureModule();
  const exactAllowed = await module.canScheduleExactAlarms();
  if (!exactAllowed) {
    Alert.alert(
      'Exact alarm permission required',
      'Please allow exact alarms for reliable wake-up alarms.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => module.openExactAlarmSettings().catch(() => {}) },
      ]
    );
    return false;
  }

  return true;
}

export async function scheduleNativeAlarm(params: { id: number; timeMillis: number; label: string }) {
  const module = ensureModule();
  return module.scheduleAlarm(params.timeMillis, params.id, params.label);
}

export async function cancelNativeAlarm(id: number) {
  const module = ensureModule();
  return module.cancelAlarm(id);
}

export function getNextTimeMillis(hour24: number, minute: number) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour24, minute, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}
