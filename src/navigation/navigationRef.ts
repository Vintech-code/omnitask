import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';
import type { AlarmRingPayload } from '@/services/NotificationService';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingAlarm: AlarmRingPayload | null = null;

export function openRingingAlarm(payload: AlarmRingPayload) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('RingingAlarm', payload);
  } else {
    pendingAlarm = payload;
  }
}

export function flushPendingAlarmNavigation() {
  if (!pendingAlarm || !navigationRef.isReady()) return;
  const payload = pendingAlarm;
  pendingAlarm = null;
  navigationRef.navigate('RingingAlarm', payload);
}
