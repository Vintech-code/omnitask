import { authErrorMessage } from '@/utils/authError';

describe('auth error messages', () => {
  it('distinguishes invalid credentials from connectivity failures', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe('The email or password is incorrect.');
    expect(authErrorMessage({ code: 'auth/network-request-failed' })).toContain('Firebase could not be reached');
  });

  it('preserves a safe explicit error message', () => {
    expect(authErrorMessage(new Error('A specific sign-in failure'))).toBe('A specific sign-in failure');
  });
});
