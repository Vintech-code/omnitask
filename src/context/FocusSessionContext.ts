import { createContext, useContext } from 'react';

import {
  DEFAULT_DAILY_FOCUS_GOAL_MINUTES,
  FOCUS_PREFERENCES_SCHEMA_VERSION,
  type FocusMetrics,
  type FocusPreferences,
  type FocusSession,
  type LegacyFocusSummary,
  type StartFocusSessionInput,
} from '@/types/focus';

export interface FocusSessionContextValue {
  sessions: FocusSession[];
  preferences: FocusPreferences;
  legacySummary: LegacyFocusSummary | null;
  metrics: FocusMetrics;
  activePomodoro: FocusSession | null;
  activeStopwatch: FocusSession | null;
  isLoading: boolean;
  startSession: (input: StartFocusSessionInput, now?: number) => FocusSession;
  pauseSession: (id: string, now?: number) => FocusSession | null;
  resumeSession: (id: string, now?: number) => FocusSession | null;
  finishSession: (id: string, completed: boolean, now?: number) => FocusSession | null;
  updateSessionLinks: (id: string, links: { taskId?: string; noteId?: string }) => FocusSession | null;
  setDailyGoalMinutes: (minutes: number) => void;
}

const emptyPreferences: FocusPreferences = {
  dailyGoalMinutes: DEFAULT_DAILY_FOCUS_GOAL_MINUTES,
  updatedAt: 0,
  version: FOCUS_PREFERENCES_SCHEMA_VERSION,
};

const emptyMetrics: FocusMetrics = {
  todayMinutes: 0,
  todayCompletedSessions: 0,
  weekMinutes: 0,
  lifetimeMinutes: 0,
  lifetimeCompletedSessions: 0,
  legacyCompletedSessions: 0,
  currentStreak: 0,
  interruptionCount: 0,
  productiveHour: null,
  goalProgress: 0,
};

export const FocusSessionContext = createContext<FocusSessionContextValue>({
  sessions: [],
  preferences: emptyPreferences,
  legacySummary: null,
  metrics: emptyMetrics,
  activePomodoro: null,
  activeStopwatch: null,
  isLoading: true,
  startSession: () => { throw new Error('FocusSessionProvider is missing.'); },
  pauseSession: () => null,
  resumeSession: () => null,
  finishSession: () => null,
  updateSessionLinks: () => null,
  setDailyGoalMinutes: () => undefined,
});

export const useFocusSessions = () => useContext(FocusSessionContext);
