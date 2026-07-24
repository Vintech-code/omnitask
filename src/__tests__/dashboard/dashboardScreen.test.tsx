import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockSetTaskStatus = jest.fn(async () => undefined);
const mockToggleTheme = jest.fn();

const mockEvent = {
  id: 'event-1',
  title: 'Morning meeting',
  description: '',
  startTime: '08:00 AM',
  startDate: 'Jul 22, 2026',
  endTime: '09:00 AM',
  location: 'Library',
  category: 'Work',
  priority: 'High' as const,
  reminders: [],
  alarmActive: false,
  recurrence: 'none' as const,
};

const mockTask = {
  id: 'task-1',
  title: 'Finish dashboard design',
  status: 'planned',
  priority: 'high',
  dueAt: new Date('2026-07-22T17:00:00').getTime(),
  recurrence: { frequency: 'none', interval: 1 },
  reminderMinutes: [],
  reminderIds: [],
  createdAt: 1,
  updatedAt: 1,
  version: 1,
};

jest.mock('@/context/EventStore', () => ({
  useEvents: () => ({ events: [mockEvent], isLoading: false }),
}));

jest.mock('@/context/AlarmStore', () => ({
  useAlarmStore: () => ({
    alarms: [{
      id: 'alarm-1', hour: 6, minute: 30, period: 'AM', label: 'Wake up', sound: 'Default',
      days: [false, true, true, true, true, true, false], snooze: 5, skipHolidays: false,
      vibrate: true, active: true,
    }],
    isLoading: false,
  }),
}));

jest.mock('@/context/TaskStore', () => ({
  useTaskStore: () => ({ tasks: [mockTask], setTaskStatus: mockSetTaskStatus, isLoading: false }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Alex Doe' }, profilePhoto: null }),
}));

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      dark: false,
      background: { base: '#EDEDEF' },
      glass: {
        primary: 'rgba(255,255,255,.58)', secondary: 'rgba(255,255,255,.38)',
        solid: 'rgba(255,255,255,.86)', border: '#FFF', highlight: '#FFF',
      },
      content: { primary: '#171717', secondary: '#666', muted: '#92938F' },
      accent: { base: '#12B9A9', soft: 'rgba(196,224,225,.72)' },
      iconTile: { coral: '#F26841', cyan: '#34C7D9', teal: '#12B9A9', blue: '#20A6EB', foreground: '#EDEDEF' },
      semantic: { success: '#12B9A9', warning: '#F26841', danger: '#D84F37', info: '#20A6EB' },
      divider: 'rgba(23,23,23,.09)',
    },
    isDark: false,
    toggleTheme: mockToggleTheme,
  }),
}));

jest.mock('@/hooks/useCurrentWeather', () => ({
  useCurrentWeather: () => ({
    weather: {
      time: new Date('2026-07-22T09:30:00'), temperatureC: 26, apparentTemperatureC: 28,
      precipitationProbability: 26, weatherCode: 3, windSpeedKmh: 2, isDay: true,
    },
    hourly: [],
    locationLabel: 'Current location',
    status: 'ready',
    error: null,
    refresh: jest.fn(async () => undefined),
    requestPermission: jest.fn(async () => undefined),
  }),
}));

jest.mock('@/hooks/useDayLens', () => ({
  useDayLens: () => ({ insights: {}, isLoading: false }),
}));

jest.mock('@/services/FocusStatsService', () => ({
  hydrateFocusSessions: jest.fn(async (_uid: string, onValue: (value: number) => void) => onValue(3)),
}));
jest.mock('@/context/FocusSessionContext', () => ({
  useFocusSessions: () => ({
    metrics: {
      todayMinutes: 75,
      todayCompletedSessions: 3,
      weekMinutes: 75,
      lifetimeMinutes: 75,
      lifetimeCompletedSessions: 3,
      legacyCompletedSessions: 0,
      currentStreak: 0,
      interruptionCount: 0,
      productiveHour: null,
      goalProgress: 0.5,
    },
    isLoading: false,
  }),
}));

jest.mock('@/components/ui', () => {
  const ReactRuntime = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    AppBackground: () => ReactRuntime.createElement(View),
    GlassCard: ({ children }: { children: React.ReactNode }) => ReactRuntime.createElement(View, null, children),
    GlassIconButton: ({ accessibilityLabel, onPress }: { accessibilityLabel: string; onPress: () => void }) => (
      ReactRuntime.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel, onPress })
    ),
    PillButton: ({ label, onPress }: { label: string; onPress: () => void }) => (
      ReactRuntime.createElement(Pressable, { accessibilityRole: 'button', onPress }, ReactRuntime.createElement(Text, null, label))
    ),
    ScreenSkeleton: () => ReactRuntime.createElement(Text, null, 'Loading'),
  };
});

import DashboardScreen from '@/screens/DashboardScreen/DashboardScreen';

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-22T09:41:00'));
  });

  afterEach(() => jest.useRealTimers());

  it('renders the reference dashboard hierarchy from real store data', async () => {
    const screen = await render(<DashboardScreen navigation={{ navigate: mockNavigate }} />);

    expect(screen.getByText('Good morning,')).toBeTruthy();
    expect(screen.getByText('Alex!')).toBeTruthy();
    expect(screen.getByText("Today's schedule")).toBeTruthy();
    expect(screen.getByText('Morning meeting')).toBeTruthy();
    expect(screen.getByText('Focus session')).toBeTruthy();
    expect(screen.getByText('25:00')).toBeTruthy();
    expect(screen.getByText('Day Lens')).toBeTruthy();
    expect(screen.getByText("Today's tasks")).toBeTruthy();
    expect(screen.getByText('Planned, due, and inbox actions')).toBeTruthy();
    expect(screen.getByText('Finish dashboard design')).toBeTruthy();
    expect(screen.queryByText('Quick actions')).toBeNull();
    expect(screen.queryByText('Hourly forecast')).toBeNull();
    expect(screen.queryByText("Today's insight")).toBeNull();
    expect(screen.getByLabelText('Switch to dark mode')).toBeTruthy();
  });

  it('keeps dashboard actions functional and updates the shared Task object', async () => {
    const screen = await render(<DashboardScreen navigation={{ navigate: mockNavigate }} />);

    await fireEvent.press(screen.getByLabelText('Open focus timer'));
    expect(mockNavigate).toHaveBeenCalledWith('Focus');

    await fireEvent.press(screen.getByLabelText('Complete Finish dashboard design'));
    await waitFor(() => expect(mockSetTaskStatus).toHaveBeenCalledWith('task-1', 'completed'));

    await fireEvent.press(screen.getByText('New task'));
    expect(mockNavigate).toHaveBeenCalledWith('Tasks', expect.objectContaining({ section: 'tasks', createTaskRequest: expect.any(Number) }));

    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Switch to dark mode'));
      await jest.advanceTimersByTimeAsync(120);
    });
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
});
