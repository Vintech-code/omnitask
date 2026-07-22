import { AppEvent } from './event';
import type { AlarmRingPayload } from '@/services/NotificationService';

/** Root stack param list — keeps navigation.navigate calls type-safe. */
export type RootStackParamList = {
  Welcome:     undefined;
  SignIn:      undefined;
  SignUp:      undefined;
  ForgotPassword: { email?: string } | undefined;
  EmailVerification: undefined;
  Onboarding:  undefined;
  Main:        undefined;
  CreateEvent: { event?: AppEvent } | undefined;
  EventDetail: { event: AppEvent };
  Profile:     undefined;
  Stats:       undefined;
  Weather:     undefined;
  RingingAlarm: AlarmRingPayload;
};
