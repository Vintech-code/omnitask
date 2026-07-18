import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID, requestGoogleIdentity } from '@/services/GoogleAuthService';

describe('GoogleAuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the explicit account chooser so all accounts and Add account are available', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      data: {
        idToken: 'google-id-token',
        user: { id: 'google-user', email: 'other@gmail.com', name: 'Other User' },
      },
    });

    const identity = await requestGoogleIdentity();

    expect(GoogleSignin.configure).toHaveBeenCalledWith(expect.objectContaining({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    }));
    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
    expect(GoogleSignin.signIn).toHaveBeenCalledTimes(1);
    expect(identity.user.email).toBe('other@gmail.com');
  });

  it('does not expose a native Java stack when Google configuration fails', async () => {
    (GoogleSignin.configure as jest.Mock).mockImplementationOnce(() => {
      throw new Error(
        'java.lang.IllegalStateException: webClientId is "autoDetect" but default_web_client_id was not found.\n at native.stack.Trace',
      );
    });

    await expect(requestGoogleIdentity()).rejects.toThrow(
      'Google Sign-In is not configured in this app build yet.',
    );
  });
});
