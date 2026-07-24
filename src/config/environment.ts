import Constants from 'expo-constants';
import type { FirebaseOptions } from 'firebase/app';

export type AppEnvironment = 'development' | 'staging' | 'production';

interface OmniTaskExtra {
  appEnvironment?: AppEnvironment;
  firebase?: FirebaseOptions;
  googleAuthenticationConfigured?: boolean;
  googleMapsConfigured?: boolean;
}

const extra = (Constants.expoConfig?.extra ?? {}) as OmniTaskExtra;

export const APP_ENVIRONMENT: AppEnvironment = extra.appEnvironment ?? 'development';
export const IS_NON_PRODUCTION = APP_ENVIRONMENT !== 'production';
export const FIREBASE_CONFIG = extra.firebase;

export function requireFirebaseConfig(): FirebaseOptions {
  const config = FIREBASE_CONFIG;
  const required: (keyof FirebaseOptions)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'messagingSenderId',
    'appId',
  ];
  const missing = required.filter(key => !config?.[key]);
  if (!config || missing.length > 0) {
    throw new Error(
      `OmniTask ${APP_ENVIRONMENT} Firebase configuration is incomplete: ${missing.join(', ')}.`,
    );
  }
  return config;
}

export function environmentLabel(): string {
  return APP_ENVIRONMENT === 'development'
    ? 'DEV'
    : APP_ENVIRONMENT === 'staging'
      ? 'STAGING'
      : 'PRODUCTION';
}
