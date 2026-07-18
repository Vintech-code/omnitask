import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';
import type { AlarmRingPayload } from '@/services/NotificationService';
import type { AppEvent } from '@/types/event';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingAlarm: AlarmRingPayload | null = null;
let pendingEvent: AppEvent | null = null;

export function openRingingAlarm(payload: AlarmRingPayload) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('RingingAlarm', payload);
  } else {
    pendingAlarm = payload;
  }
}

export function flushPendingAlarmNavigation() {
  if (!navigationRef.isReady()) return;
  if (pendingAlarm) {
    const payload = pendingAlarm;
    pendingAlarm = null;
    navigationRef.navigate('RingingAlarm', payload);
    return;
  }
  if (pendingEvent) {
    const event = pendingEvent;
    pendingEvent = null;
    navigationRef.navigate('EventDetail', { event });
  }
}

export function openEventDetail(event: AppEvent) {
  if (navigationRef.isReady()) navigationRef.navigate('EventDetail', { event });
  else pendingEvent = event;
}
