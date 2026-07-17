import { AppEvent } from './event';
import type { AlarmRingPayload } from '@/services/NotificationService';

/** Root stack param list — keeps navigation.navigate calls type-safe. */
export type RootStackParamList = {
  Welcome:     undefined;
  SignIn:      undefined;
  SignUp:      undefined;
  Onboarding:  undefined;
  Main:        undefined;
  CreateEvent: { event?: AppEvent } | undefined;
  EventDetail: { event: AppEvent };
  Profile:     undefined;
  Search:      undefined;
  Stats:       undefined;
  RingingAlarm: AlarmRingPayload;
};
