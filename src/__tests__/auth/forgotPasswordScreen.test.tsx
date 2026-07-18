import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockReset = jest.fn();

jest.mock('@/services/EmailService', () => ({
  requestPasswordResetEmail: (...args: unknown[]) => mockReset(...args),
}));
jest.mock('@/components/ui', () => ({
  AppBackground: () => {
    const ReactRuntime = require('react');
    const { View } = require('react-native');
    return ReactRuntime.createElement(View);
  },
}));

import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen/ForgotPasswordScreen';

describe('ForgotPasswordScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates email before calling the protected backend flow', async () => {
    const screen = await render(<ForgotPasswordScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} route={{ params: {} }} />);
    await fireEvent.changeText(screen.getByTestId('forgot-password-email'), 'invalid');
    await fireEvent.press(screen.getByTestId('forgot-password-submit'));
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('shows the privacy-safe success screen after requesting reset', async () => {
    mockReset.mockResolvedValueOnce({ ok: true, message: 'sent' });
    const screen = await render(<ForgotPasswordScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} route={{ params: { email: ' Person@Example.com ' } }} />);
    await fireEvent.press(screen.getByTestId('forgot-password-submit'));
    await waitFor(() => expect(mockReset).toHaveBeenCalledWith('person@example.com'));
    expect(screen.getByText('Check your inbox')).toBeTruthy();
    expect(screen.getByText(/If an OmniTask password account exists/)).toBeTruthy();
  });
});
