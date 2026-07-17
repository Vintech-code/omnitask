import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Map = (props: Record<string, unknown>) => React.createElement(View, props);
  return { __esModule: true, default: Map, Marker: View };
});

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(async () => []),
}));

jest.mock('react-native-nitro-google-signin', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    GoogleSignInButton: ({ onPress, ...props }: Record<string, unknown>) =>
      React.createElement(Pressable, { ...props, onPress }),
    GoogleOneTapSignIn: {
      configure: jest.fn(),
      checkPlayServices: jest.fn(async () => undefined),
      signIn: jest.fn(async () => ({ type: 'cancelled', data: null })),
      createAccount: jest.fn(async () => ({ type: 'cancelled', data: null })),
      presentExplicitSignIn: jest.fn(async () => ({ type: 'cancelled', data: null })),
      signOut: jest.fn(async () => undefined),
    },
    isCancelledResponse: (response: { type?: string }) => response.type === 'cancelled',
    isNoSavedCredentialFoundResponse: (response: { type?: string }) => response.type === 'noSavedCredentialFound',
    isSuccessResponse: (response: { type?: string; data?: unknown }) => response.type === 'success' && response.data != null,
  };
});
