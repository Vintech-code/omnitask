import { GoogleOneTapSignIn } from 'react-native-nitro-google-signin';

import { requestGoogleIdentity } from '@/services/GoogleAuthService';

describe('GoogleAuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the explicit account chooser so all accounts and Add account are available', async () => {
    (GoogleOneTapSignIn.presentExplicitSignIn as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      data: {
        idToken: 'google-id-token',
        user: { id: 'google-user', email: 'other@gmail.com', name: 'Other User' },
      },
    });

    const identity = await requestGoogleIdentity();

    expect(GoogleOneTapSignIn.presentExplicitSignIn).toHaveBeenCalledTimes(1);
    expect(GoogleOneTapSignIn.signIn).not.toHaveBeenCalled();
    expect(identity.user.email).toBe('other@gmail.com');
  });
});
