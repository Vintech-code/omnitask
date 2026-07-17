import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockSignIn = jest.fn();
const mockGoogleSignIn = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signInWithGoogle: mockGoogleSignIn,
    hasSeenOnboarding: true,
  }),
}));
jest.mock('@/components/ui', () => ({
  AppBackground: () => {
    const ReactRuntime = require('react');
    const { View: NativeView } = require('react-native');
    return ReactRuntime.createElement(NativeView);
  },
}));

import SignInScreen from '@/screens/SignInScreen/SignInScreen';

describe('SignInScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('preserves the password and displays the real sign-in error', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Firebase could not be reached. Check your connection.'));
    const navigation = { replace: jest.fn(), goBack: jest.fn() };
    const screen = await render(<SignInScreen navigation={navigation} />);

    await fireEvent.changeText(screen.getByTestId('sign-in-email'), ' person@example.com ');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), ' secret password ');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(mockSignIn).toHaveBeenCalledWith('person@example.com', ' secret password ');
    expect(screen.getByText('Firebase could not be reached. Check your connection.')).toBeTruthy();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
