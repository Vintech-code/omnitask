import { AppEvent } from './event';
import type { AlarmRingPayload } from '@/services/NotificationService';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Dashboard: undefined;
  Focus: undefined;
  Alarm: undefined;
  Calculator: undefined;
  Tasks: {
    section?: 'tasks' | 'notes' | 'canvas' | 'events';
    taskId?: string;
    taskRequest?: number;
    createTaskRequest?: number;
    noteId?: string;
    noteRequest?: number;
    createType?: 'text' | 'checklist' | 'rich';
    createRequest?: number;
  } | undefined;
};

/** Root stack param list — keeps navigation.navigate calls type-safe. */
export type RootStackParamList = {
  Welcome:     undefined;
  SignIn:      undefined;
  SignUp:      undefined;
  ForgotPassword: { email?: string } | undefined;
  EmailVerification: undefined;
  Onboarding:  undefined;
  Main:        NavigatorScreenParams<MainTabParamList> | undefined;
  CreateEvent: { event?: AppEvent } | undefined;
  EventDetail: { event: AppEvent };
  Profile:     undefined;
  Stats:       undefined;
  Weather:     undefined;
  RingingAlarm: AlarmRingPayload;
};
