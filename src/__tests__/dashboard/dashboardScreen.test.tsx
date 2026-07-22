import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockUpdateNote = jest.fn();

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

const mockNote = {
  id: 'note-1',
  title: 'Dashboard work',
  body: '',
  date: 'Jul 22, 2026',
  timestamp: 1,
  category: 'Work',
  cardColor: '#FFF',
  tags: [],
  todos: [{ id: 'todo-1', text: 'Finish dashboard design', done: false }],
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
  useTaskStore: () => ({ notes: [mockNote], updateNote: mockUpdateNote, isLoading: false }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Alex Doe' }, profilePhoto: null }),
}));

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      dark: false,
      background: { base: '#F3F3F1' },
      glass: {
        primary: 'rgba(255,255,255,.58)', secondary: 'rgba(255,255,255,.38)',
        solid: 'rgba(255,255,255,.86)', border: '#FFF', highlight: '#FFF',
      },
      content: { primary: '#171717', secondary: '#666', muted: '#92938F' },
      accent: { base: '#FF7A00', soft: 'rgba(255,122,0,.13)' },
      semantic: { success: '#74B82A', warning: '#E7A126', danger: '#E45B55', info: '#6E9FBD' },
      divider: 'rgba(23,23,23,.09)',
    },
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
    expect(screen.getByText('DAY LENS')).toBeTruthy();
    expect(screen.getByText('Open checklist items')).toBeTruthy();
    expect(screen.getByText('Unfinished items from your Notes')).toBeTruthy();
    expect(screen.getByText('Finish dashboard design')).toBeTruthy();
    expect(screen.queryByText('Quick actions')).toBeNull();
    expect(screen.queryByText('Hourly forecast')).toBeNull();
    expect(screen.getByText("Today's insight")).toBeTruthy();
  });

  it('keeps dashboard actions functional and completes real checklist items', async () => {
    const screen = await render(<DashboardScreen navigation={{ navigate: mockNavigate }} />);

    await fireEvent.press(screen.getByLabelText('Open focus timer'));
    expect(mockNavigate).toHaveBeenCalledWith('Focus');

    await fireEvent.press(screen.getByLabelText('Complete Finish dashboard design'));
    await waitFor(() => expect(mockUpdateNote).toHaveBeenCalledWith(expect.objectContaining({
      id: 'note-1',
      todos: [expect.objectContaining({ id: 'todo-1', done: true })],
    })));

    await fireEvent.press(screen.getByText('New checklist'));
    expect(mockNavigate).toHaveBeenCalledWith('Tasks', expect.objectContaining({ section: 'notes', createType: 'checklist' }));
  });
});
