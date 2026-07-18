import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockSignUp = jest.fn();
const mockGoogleSignIn = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
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

import SignUpScreen from '@/screens/SignUpScreen/SignUpScreen';

describe('SignUpScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('continues with Google without requiring a separate sign-up form', async () => {
    mockGoogleSignIn.mockResolvedValueOnce(undefined);
    const navigation = { replace: jest.fn(), navigate: jest.fn(), goBack: jest.fn() };
    const screen = await render(<SignUpScreen navigation={navigation} />);

    await fireEvent.press(screen.getByTestId('google-sign-up'));

    await waitFor(() => expect(mockGoogleSignIn).toHaveBeenCalledTimes(1));
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('creates an email account while preserving the password exactly', async () => {
    mockSignUp.mockResolvedValueOnce(undefined);
    const navigation = { replace: jest.fn(), navigate: jest.fn(), goBack: jest.fn() };
    const screen = await render(<SignUpScreen navigation={navigation} />);

    await fireEvent.changeText(screen.getByTestId('sign-up-full-name'), '  Alex Doe  ');
    await fireEvent.changeText(screen.getByTestId('sign-up-email-address'), ' alex@example.com ');
    await fireEvent.changeText(screen.getByTestId('sign-up-password'), ' secret password ');
    await fireEvent.changeText(screen.getByTestId('sign-up-confirm-password'), ' secret password ');
    await fireEvent.press(screen.getByTestId('sign-up-submit'));

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith(
      'Alex Doe',
      'alex@example.com',
      ' secret password ',
    ));
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
