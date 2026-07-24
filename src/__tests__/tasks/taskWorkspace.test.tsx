import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockCreateTask = jest.fn(async (value: unknown) => value);
const mockUpdateTask = jest.fn(async (value: unknown) => value);
const mockRemoveTask = jest.fn(async () => undefined);
const mockSetTaskStatus = jest.fn(async () => undefined);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('react-native-safe-area-context', () => {
  const ReactRuntime = require('react');
  const { View } = require('react-native');
  return { SafeAreaView: ({ children }: { children: React.ReactNode }) => ReactRuntime.createElement(View, null, children) };
});
jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      dark: false,
      background: { base: '#EDEDEF' },
      glass: { primary: '#fff', secondary: '#f7f7f7', solid: '#fff', border: '#eee' },
      content: { primary: '#171A1A', secondary: '#5C6666', muted: '#8A9292' },
      accent: { base: '#12B9A9', soft: '#DDF5F2' },
      iconTile: { coral: '#F26841', cyan: '#34C7D9', teal: '#12B9A9', foreground: '#EDEDEF' },
      semantic: { success: '#12B9A9', danger: '#D84F37' },
      divider: '#ddd',
    },
  }),
}));
jest.mock('@/context/TaskStore', () => ({
  useTaskStore: () => ({
    tasks: [{
      id: 'task-1', title: 'Review launch', status: 'inbox', priority: 'high',
      recurrence: { frequency: 'none', interval: 1 }, reminderMinutes: [], reminderIds: [],
      createdAt: 1, updatedAt: 1, version: 1,
    }],
    isLoading: false,
    createTask: mockCreateTask,
    updateTask: mockUpdateTask,
    removeTask: mockRemoveTask,
    setTaskStatus: mockSetTaskStatus,
  }),
}));

import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';

describe('TaskWorkspace', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completes and opens the same Task record', async () => {
    const screen = await render(<TaskWorkspace />);

    await fireEvent.press(screen.getByLabelText('Complete Review launch'));
    await waitFor(() => expect(mockSetTaskStatus).toHaveBeenCalledWith('task-1', 'completed'));

    await fireEvent.press(screen.getByLabelText('Open Review launch'));
    expect(screen.getByText('Edit task')).toBeTruthy();
    expect(screen.getByDisplayValue('Review launch')).toBeTruthy();
  });

  it('creates a Task from the Organize workspace', async () => {
    const screen = await render(<TaskWorkspace />);

    await fireEvent.press(screen.getByLabelText('Create task'));
    await fireEvent.changeText(screen.getByPlaceholderText('What needs to be done?'), 'Prepare demo');
    await waitFor(() => expect(screen.getByDisplayValue('Prepare demo')).toBeTruthy());
    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Prepare demo',
      status: 'inbox',
      priority: 'medium',
    })));
  });
});
