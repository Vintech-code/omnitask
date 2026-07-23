import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockSignOut = jest.fn(async () => undefined);
const mockUpdateUser = jest.fn(async () => undefined);
const mockUpdateProfilePhoto = jest.fn(async () => undefined);
const mockAlert = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Alex Doe', email: 'alex@example.com' },
    emailVerified: true,
    signOut: mockSignOut,
    updateUser: mockUpdateUser,
    profilePhoto: null,
    updateProfilePhoto: mockUpdateProfilePhoto,
  }),
}));

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      dark: false,
      background: { base: '#EDEDEF' },
      glass: {
        primary: 'rgba(255,255,255,.88)',
        secondary: 'rgba(255,255,255,.64)',
        solid: '#FFF',
        border: 'rgba(255,255,255,.92)',
        highlight: '#FFF',
      },
      content: { primary: '#171A1A', secondary: '#5C6666', muted: '#8A9292' },
      accent: { base: '#12B9A9', pressed: '#0D8F85', soft: '#C4E0E1' },
      iconTile: {
        coral: '#F26841',
        cyan: '#34C7D9',
        teal: '#12B9A9',
        blue: '#20A6EB',
        foreground: '#EDEDEF',
      },
      semantic: { success: '#12B9A9', warning: '#F26841', danger: '#D84F37', info: '#20A6EB' },
      divider: 'rgba(23,26,26,.08)',
      icon: '#171A1A',
    },
  }),
}));

jest.mock('@/components/ui', () => {
  const ReactRuntime = require('react');
  const { Text, View } = require('react-native');
  return {
    AppBackground: () => ReactRuntime.createElement(View),
    OmniLoader: ({ accessibilityLabel }: { accessibilityLabel: string }) => (
      ReactRuntime.createElement(Text, { accessibilityLabel }, 'Loading')
    ),
  };
});

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

import ProfileScreen from '@/screens/ProfileScreen/ProfileScreen';
import { AppAlert } from '@/components/ui/AppDialog';

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    jest.spyOn(AppAlert, 'alert').mockImplementation(mockAlert);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows only functional account controls', async () => {
    const screen = await render(<ProfileScreen navigation={{ goBack: mockGoBack, reset: mockReset }} />);

    expect(screen.getByText('Alex Doe')).toBeTruthy();
    expect(screen.getByText('Verified account')).toBeTruthy();
    expect(screen.getByText('Display name')).toBeTruthy();
    expect(screen.getByText('Notification settings')).toBeTruthy();
    expect(screen.queryByText('Language')).toBeNull();
    expect(screen.queryByText('Backup')).toBeNull();
    expect(screen.queryByText('Help & Support')).toBeNull();
    expect(screen.queryByText('About')).toBeNull();
    expect(screen.queryByText('Delete account')).toBeNull();
  });

  it('edits the display name and opens native notification settings', async () => {
    const screen = await render(<ProfileScreen navigation={{ goBack: mockGoBack, reset: mockReset }} />);

    await fireEvent.press(screen.getByText('Edit profile'));
    await fireEvent.changeText(screen.getByDisplayValue('Alex Doe'), 'Alex Smith');
    await fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ name: 'Alex Smith' }));

    await fireEvent.press(screen.getByLabelText('Notification settings. Manage Android permissions and alerts'));
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it('keeps sign out behind a confirmation', async () => {
    const screen = await render(<ProfileScreen navigation={{ goBack: mockGoBack, reset: mockReset }} />);

    await fireEvent.press(screen.getByText('Sign out'));

    expect(mockAlert).toHaveBeenCalledWith(
      'Sign out?',
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'Cancel' }), expect.objectContaining({ text: 'Sign out' })]),
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
