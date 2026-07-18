import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockRefresh = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'uid', name: 'Alex', email: 'alex@example.com' },
    refreshEmailVerification: mockRefresh,
    signOut: mockSignOut,
    verificationEmailStatus: 'unknown',
  }),
}));
jest.mock('@/services/EmailService', () => ({ requestVerificationEmail: jest.fn() }));
jest.mock('@/components/ui', () => ({
  AppBackground: () => {
    const ReactRuntime = require('react');
    const { View } = require('react-native');
    return ReactRuntime.createElement(View);
  },
}));

import EmailVerificationScreen from '@/screens/EmailVerificationScreen/EmailVerificationScreen';

describe('EmailVerificationScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the signed-in email and reports an account that is still unverified', async () => {
    mockRefresh.mockResolvedValueOnce(false);
    const screen = await render(<EmailVerificationScreen />);
    expect(screen.getByText('alex@example.com')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('verification-refresh'));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Your email is not verified yet/)).toBeTruthy();
  });

  it('allows the user to leave the verification gate safely', async () => {
    mockSignOut.mockResolvedValueOnce(undefined);
    const screen = await render(<EmailVerificationScreen />);
    await fireEvent.press(screen.getByTestId('verification-logout'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });
});
