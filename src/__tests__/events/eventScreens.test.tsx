import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { fireEvent, render } from '@testing-library/react-native';

import type { AppEvent } from '@/types/event';

const mockUseEvents = jest.fn();

jest.mock('@/context/EventStore', () => ({
  useEvents: () => mockUseEvents(),
}));

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    theme: {
      text: '#111111',
      textSub: '#444444',
      textDim: '#777777',
      border: '#dddddd',
      divider: '#dddddd',
      bg: '#ffffff',
      bg2: '#f4f4f4',
      card: '#ffffff',
      background: { base: '#ffffff', top: '#f4f4f4' },
      content: { primary: '#111111', secondary: '#444444', muted: '#777777' },
      glass: { solid: '#ffffff', border: '#dddddd', secondary: '#f7f7f7' },
      accent: { base: '#2563eb', soft: '#dbeafe' },
      semantic: { danger: '#dc2626', warning: '#d97706', success: '#16a34a' },
    },
  }),
}));

jest.mock('@/components/ui', () => ({
  AppBackground: () => {
    const { View: MockView } = require('react-native');
    return <MockView />;
  },
  ScreenSkeleton: () => {
    const { View: MockView } = require('react-native');
    return <MockView />;
  },
  WheelPickerColumn: ({ items, onSelect }: any) => {
    const { Text: MockText, TouchableOpacity: MockTouchableOpacity, View: MockView } = require('react-native');
    return <MockView>{items.map((item: string, index: number) => <MockTouchableOpacity key={`${item}-${index}`} onPress={() => onSelect(index)}><MockText>{item}</MockText></MockTouchableOpacity>)}</MockView>;
  },
}));

jest.mock('@/components/BurgerMenu', () => ({
  BurgerMenu: () => {
    const { View: MockView } = require('react-native');
    return <MockView />;
  },
}));
jest.mock('@/components/OrganizerSwitch', () => ({
  OrganizerSwitch: () => {
    const { View: MockView } = require('react-native');
    return <MockView />;
  },
}));

jest.mock('@/components/events', () => ({
  EventLocationPicker: () => {
    const { View: MockView } = require('react-native');
    return <MockView />;
  },
  EventActionSheet: ({ visible, title, actions = [], onClose, closeLabel = 'Cancel' }: any) => {
    const {
      Text: MockText,
      TouchableOpacity: MockTouchableOpacity,
      View: MockView,
    } = require('react-native');
    return visible ? (
      <MockView testID={`sheet-${title}`}>
        <MockText>{title}</MockText>
        {actions.map((action: any) => (
          <MockTouchableOpacity key={action.label} disabled={action.disabled} onPress={action.onPress}>
            <MockText>{action.label}</MockText>
          </MockTouchableOpacity>
        ))}
        <MockTouchableOpacity onPress={onClose}><MockText>{closeLabel}</MockText></MockTouchableOpacity>
      </MockView>
    ) : null;
  },
}));

import CreateEventScreen from '@/screens/CreateEventScreen/CreateEventScreen';
import EventAlarmsScreen from '@/screens/EventAlarmsScreen/EventAlarmsScreen';

const savedEvent = (overrides: Partial<AppEvent> = {}): AppEvent => ({
  id: 'event-1',
  title: 'Existing event',
  description: '',
  startDate: 'Jul 20, 2027',
  startTime: '08:00 AM',
  endDate: 'Jul 20, 2027',
  endTime: '09:00 AM',
  allDay: false,
  timeZone: 'Asia/Manila',
  location: 'Manila',
  latitude: 14.5995,
  longitude: 120.9842,
  category: 'Work',
  priority: 'Medium',
  reminders: ['15 minutes before'],
  recurrence: 'none',
  alarmActive: true,
  ...overrides,
});

describe('event create and edit UI', () => {
  const addEvent = jest.fn();
  const updateEvent = jest.fn();
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-17T00:00:00.000Z'));
  });

  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEvents.mockReturnValue({
      events: [],
      categories: ['Work', 'Personal'],
      addCategory: jest.fn(),
      addEvent,
      updateEvent,
    });
  });

  it('creates an all-day multi-day recurring event after calendar and reminder interactions', async () => {
    const screen = await render(<CreateEventScreen navigation={navigation} route={{ params: {} }} />);

    await fireEvent.changeText(screen.getByTestId('event-title-input'), 'Team retreat');
    await fireEvent(screen.getByTestId('event-all-day-switch'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('event-add-end'));
    await fireEvent.press(screen.getByTestId('event-recurrence-weekly'));
    await fireEvent.press(screen.getByTestId('event-start-date'));
    await fireEvent.press(screen.getByTestId('calendar-day-18'));
    await fireEvent.press(screen.getByText('Done'));
    await fireEvent.press(screen.getByTestId('event-add-reminder'));
    await fireEvent.press(screen.getByText('30 minutes before'));
    await fireEvent.press(screen.getByTestId('event-save'));

    expect(addEvent).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Team retreat',
      startDate: 'Jul 18, 2026',
      endDate: 'Jul 18, 2026',
      allDay: true,
      recurrence: 'weekly',
      reminders: ['15 minutes before', '30 minutes before'],
      timeZone: expect.any(String),
    }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('updates an existing event without creating a duplicate', async () => {
    const event = savedEvent();
    const screen = await render(<CreateEventScreen navigation={navigation} route={{ params: { event } }} />);
    await fireEvent.changeText(screen.getByTestId('event-title-input'), 'Updated event');
    await fireEvent.press(screen.getByTestId('event-save'));

    expect(updateEvent).toHaveBeenCalledWith(expect.objectContaining({ id: event.id, title: 'Updated event' }));
    expect(addEvent).not.toHaveBeenCalled();
  });
});

describe('event reminder and delete UI', () => {
  const toggleAlarmActive = jest.fn();
  const removeEvent = jest.fn();
  const event = savedEvent();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEvents.mockReturnValue({
      events: [event],
      isLoading: false,
      toggleAlarmActive,
      removeEvent,
    });
  });

  it('toggles reminders from the event card', async () => {
    const screen = await render(<EventAlarmsScreen navigation={{ navigate: jest.fn() }} />);
    await fireEvent(screen.getByTestId(`event-reminder-toggle-${event.id}`), 'valueChange', false);
    expect(toggleAlarmActive).toHaveBeenCalledWith(event.id);
  });

  it('requires confirmation before deleting an event', async () => {
    const screen = await render(<EventAlarmsScreen navigation={{ navigate: jest.fn() }} />);
    await fireEvent.press(screen.getByLabelText(`More actions for ${event.title}`));
    await fireEvent.press(screen.getByText('Delete event'));
    expect(removeEvent).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Delete permanently'));
    expect(removeEvent).toHaveBeenCalledWith(event.id);
  });
});
