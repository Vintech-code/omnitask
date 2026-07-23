import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const navigate = jest.fn();
const mockSetForUser = jest.fn(async (..._args: unknown[]) => undefined);

jest.mock('react-native-svg', () => { const { View: MockView } = require('react-native'); return { __esModule: true, default: MockView, Circle: MockView }; });
jest.mock('react-native-safe-area-context', () => { const ReactRuntime = require('react'); const { View: MockView } = require('react-native'); return { SafeAreaView: ({ children }: { children: React.ReactNode }) => ReactRuntime.createElement(MockView, null, children), useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }; });
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), notificationAsync: jest.fn(), NotificationFeedbackType: { Success: 'success' } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
  setNotificationChannelAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'focus-notification'),
}));
jest.mock('@/services/NotificationService', () => ({ requestNotificationPermission: jest.fn(async () => true), cancelNotification: jest.fn(async () => undefined) }));
jest.mock('@/services/FocusStatsService', () => ({
  hydrateFocusSessions: jest.fn(async (_uid: string, onValue: (value: number) => void) => onValue(2)),
  saveFocusSessions: jest.fn(async () => undefined),
}));
jest.mock('@/services/StorageService', () => ({
  KEYS: { LINKED_NOTE: 'linked-note' },
  Storage: { getForUser: jest.fn(async () => null), setForUser: (...args: unknown[]) => mockSetForUser(...args), removeForUser: jest.fn(async () => undefined) },
}));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/context/TaskStore', () => ({
  useTaskStore: () => ({
    isLoading: false,
    notes: [{ id: 'note-1', title: 'Project brief', category: 'Work', archived: false, tags: [] }],
  }),
}));
jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      text: '#171717', textDim: '#666765', textSub: '#92938F', card: '#FFF', bg2: '#EEE', border: '#DDD', segBg: '#EEE', segActive: '#FFF',
      glass: { primary: 'rgba(255,255,255,.58)', secondary: 'rgba(255,255,255,.38)', solid: '#FFF', border: '#FFF' },
      content: { primary: '#171717', secondary: '#666765', muted: '#92938F' },
      accent: { base: '#12B9A9', soft: 'rgba(196,224,225,.72)' },
      iconTile: { coral: '#F26841', cyan: '#34C7D9', teal: '#12B9A9', blue: '#20A6EB', foreground: '#EDEDEF' },
      semantic: { success: '#12B9A9', info: '#20A6EB' }, divider: '#DDD',
    },
  }),
}));
jest.mock('@/components/BurgerMenu', () => { const ReactRuntime = require('react'); const { View: MockView } = require('react-native'); return { BurgerMenu: () => ReactRuntime.createElement(MockView) }; });
jest.mock('@/components/ui', () => { const ReactRuntime = require('react'); const { View: MockView } = require('react-native'); return { AppBackground: () => ReactRuntime.createElement(MockView), ScreenSkeleton: () => ReactRuntime.createElement(MockView) }; });

import FocusScreen from '@/screens/FocusScreen/FocusScreen';

describe('FocusScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts the timer, links and opens a note, and exposes working overflow actions', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = await render(<FocusScreen navigation={{ navigate }} />);

    expect(screen.getByText('25:00')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Start timer'));
    await waitFor(() => expect(screen.getByText('In progress')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Link a note to this focus session'));
    await fireEvent.press(screen.getByText('Project brief'));
    await waitFor(() => expect(mockSetForUser).toHaveBeenCalledWith('linked-note', 'user-1', 'note-1'));

    await fireEvent.press(screen.getByLabelText('Open Project brief'));
    expect(navigate).toHaveBeenCalledWith('Tasks', expect.objectContaining({ section: 'notes', noteId: 'note-1' }));

    await fireEvent.press(screen.getByLabelText('Open focus options'));
    expect(alert).toHaveBeenCalledWith('Focus options', undefined, expect.arrayContaining([
      expect.objectContaining({ text: 'Reset current timer', onPress: expect.any(Function) }),
      expect.objectContaining({ text: 'View focus statistics', onPress: expect.any(Function) }),
    ]));
  });
});
