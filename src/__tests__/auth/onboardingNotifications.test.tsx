import React from 'react';
import { Alert, Animated } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockMarkOnboardingSeen = jest.fn();
const mockRequestPermissionState = jest.fn();
const mockOpenNotificationSettings = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ markOnboardingSeen: mockMarkOnboardingSeen }),
}));

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: { base: '#FF7A00', soft: 'rgba(255,122,0,0.13)' },
      content: { primary: '#171717', secondary: '#666765' },
      glass: {
        primary: 'rgba(255,255,255,0.58)',
        border: 'rgba(255,255,255,0.76)',
      },
      divider: 'rgba(23,23,23,0.09)',
    },
  }),
}));

jest.mock('@/services/NotificationService', () => ({
  requestNotificationPermissionState: (...args: unknown[]) => mockRequestPermissionState(...args),
  openNotificationSettings: (...args: unknown[]) => mockOpenNotificationSettings(...args),
}));

jest.mock('@/components/ui', () => ({
  AppBackground: () => {
    const ReactRuntime = require('react');
    const { View } = require('react-native');
    return ReactRuntime.createElement(View);
  },
}));

jest.mock('lottie-react-native', () => {
  const ReactRuntime = require('react');
  const { View } = require('react-native');
  return (props: Record<string, unknown>) => ReactRuntime.createElement(View, props);
});

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
}));

import OnboardingScreen from '@/screens/OnboardingScreen/OnboardingScreen';

async function renderOnboarding() {
  const navigation = { reset: jest.fn() };
  const screen = await render(<OnboardingScreen navigation={navigation as never} route={{} as never} />);
  return { navigation, screen };
}

async function advanceToNotifications(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(screen.getByText('Get Started'));
  await waitFor(() => expect(screen.getByText('Next')).toBeTruthy());
  await fireEvent.press(screen.getByText('Next'));
  await waitFor(() => expect(screen.getByText('Enable Notifications')).toBeTruthy());
}

describe('Onboarding notification permission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Animated, 'parallel').mockImplementation(() => ({
      start: callback => callback?.({ finished: true }),
      stop: jest.fn(),
      reset: jest.fn(),
    }));
    mockMarkOnboardingSeen.mockResolvedValue(undefined);
    mockOpenNotificationSettings.mockResolvedValue(undefined);
  });

  it('finishes onboarding only after notification permission is granted', async () => {
    mockRequestPermissionState.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    });
    const { navigation, screen } = await renderOnboarding();
    await advanceToNotifications(screen);

    await fireEvent.press(screen.getByText('Enable Notifications'));

    await waitFor(() => expect(mockRequestPermissionState).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockMarkOnboardingSeen).toHaveBeenCalledTimes(1));
    expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Main' }] });
  });

  it('stays on onboarding and offers settings when permission cannot be requested again', async () => {
    mockRequestPermissionState.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: false,
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { navigation, screen } = await renderOnboarding();
    await advanceToNotifications(screen);

    await fireEvent.press(screen.getByText('Enable Notifications'));

    await waitFor(() => expect(screen.getByText(/Notifications are off/)).toBeTruthy());
    expect(mockMarkOnboardingSeen).not.toHaveBeenCalled();
    expect(navigation.reset).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Notifications are off',
      expect.any(String),
      expect.any(Array),
    );

    const buttons = alert.mock.calls[0][2];
    const settingsButton = buttons?.find(button => button.text === 'Open settings');
    settingsButton?.onPress?.();
    await waitFor(() => expect(mockOpenNotificationSettings).toHaveBeenCalledTimes(1));
  });

  it('shows a retryable error without completing onboarding when permission fails', async () => {
    mockRequestPermissionState.mockRejectedValue(new Error('Notification service is unavailable.'));
    const { navigation, screen } = await renderOnboarding();
    await advanceToNotifications(screen);

    await fireEvent.press(screen.getByText('Enable Notifications'));

    await waitFor(() => expect(screen.getByText('Notification service is unavailable.')).toBeTruthy());
    expect(mockMarkOnboardingSeen).not.toHaveBeenCalled();
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  it('allows Maybe Later without requesting notification permission', async () => {
    const { navigation, screen } = await renderOnboarding();
    await advanceToNotifications(screen);

    await fireEvent.press(screen.getByText('Maybe Later'));

    await waitFor(() => expect(mockMarkOnboardingSeen).toHaveBeenCalledTimes(1));
    expect(mockRequestPermissionState).not.toHaveBeenCalled();
    expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Main' }] });
  });
});
