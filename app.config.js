const fs = require('node:fs');
const path = require('node:path');
const base = require('./app.json');

const ENVIRONMENTS = ['development', 'staging', 'production'];
const DEVELOPMENT_FIREBASE = {
  apiKey: 'AIzaSyDs7SVepUDkvWPbpBHAa6Gz4UtPTj81QSs',
  authDomain: 'omnitask-d5b47.firebaseapp.com',
  projectId: 'omnitask-d5b47',
  storageBucket: 'omnitask-d5b47.firebasestorage.app',
  messagingSenderId: '385511004673',
  appId: '1:385511004673:web:90727f4bcd26ab399dbe00',
  measurementId: 'G-1PJG4L44FT',
};

function appEnvironment() {
  const requested = (process.env.OMNITASK_ENV || 'development').trim().toLowerCase();
  if (!ENVIRONMENTS.includes(requested)) {
    throw new Error(
      `Invalid OMNITASK_ENV "${requested}". Use development, staging, or production.`,
    );
  }
  return requested;
}

function readFirebaseConfig(environment) {
  const value = name => process.env[`EXPO_PUBLIC_FIREBASE_${name}`]?.trim();
  const configured = {
    apiKey: value('API_KEY'),
    authDomain: value('AUTH_DOMAIN'),
    projectId: value('PROJECT_ID'),
    storageBucket: value('STORAGE_BUCKET'),
    messagingSenderId: value('MESSAGING_SENDER_ID'),
    appId: value('APP_ID'),
    measurementId: value('MEASUREMENT_ID'),
  };
  const required = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'];
  const missing = required.filter(key => !configured[key]);
  if (missing.length === 0) {
    if (
      environment !== 'development'
      && configured.projectId === DEVELOPMENT_FIREBASE.projectId
    ) {
      throw new Error(
        `${environment} cannot use the development Firebase project "${configured.projectId}".`,
      );
    }
    const expectedProjectId = process.env.OMNITASK_EXPECTED_FIREBASE_PROJECT_ID?.trim();
    if (expectedProjectId && configured.projectId !== expectedProjectId) {
      throw new Error(
        `Firebase project mismatch: configured "${configured.projectId}", expected "${expectedProjectId}".`,
      );
    }
    return configured;
  }
  if (environment === 'development') return DEVELOPMENT_FIREBASE;
  throw new Error(
    `${environment} Firebase configuration is incomplete. Missing: ${missing.join(', ')}. `
    + 'Set the matching EXPO_PUBLIC_FIREBASE_* values in the selected EAS environment.',
  );
}

function packageIdentity(environment) {
  const basePackage = base.expo.android.package;
  const baseBundle = base.expo.ios?.bundleIdentifier || basePackage;
  if (environment === 'development') {
    return {
      androidPackage: `${basePackage}.dev`,
      iosBundleIdentifier: `${baseBundle}.dev`,
      name: 'OmniTask Dev',
      scheme: 'omnitask-dev',
    };
  }
  if (environment === 'staging') {
    return {
      androidPackage: `${basePackage}.staging`,
      iosBundleIdentifier: `${baseBundle}.staging`,
      name: 'OmniTask Staging',
      scheme: 'omnitask-staging',
    };
  }
  return {
    androidPackage: basePackage,
    iosBundleIdentifier: baseBundle,
    name: base.expo.name,
    scheme: base.expo.scheme,
  };
}

function serviceFile(environment, platform) {
  const explicit = process.env[
    platform === 'android' ? 'GOOGLE_SERVICES_FILE' : 'GOOGLE_SERVICE_INFO_FILE'
  ]?.trim();
  const relative = explicit || (
    platform === 'android'
      ? `./config/firebase/google-services.${environment}.json`
      : `./config/firebase/GoogleService-Info.${environment}.plist`
  );
  return fs.existsSync(path.resolve(__dirname, relative)) ? relative : undefined;
}

function validateAndroidServiceFile(file, firebase, androidPackage) {
  if (!file) return;
  const contents = JSON.parse(fs.readFileSync(path.resolve(__dirname, file), 'utf8'));
  const fileProjectId = contents.project_info?.project_id;
  const clients = Array.isArray(contents.client) ? contents.client : [];
  const packages = clients
    .map(client => client.client_info?.android_client_info?.package_name)
    .filter(Boolean);
  if (fileProjectId !== firebase.projectId) {
    throw new Error(
      `${file} belongs to Firebase project "${fileProjectId}", expected "${firebase.projectId}".`,
    );
  }
  if (!packages.includes(androidPackage)) {
    throw new Error(
      `${file} does not contain Android package "${androidPackage}". Registered packages: `
      + `${packages.join(', ') || 'none'}.`,
    );
  }
  const appClient = clients.find(
    client => client.client_info?.android_client_info?.package_name === androidPackage,
  );
  const oauthClients = Array.isArray(appClient?.oauth_client) ? appClient.oauth_client : [];
  const hasAndroidOauthClient = oauthClients.some(client => (
    client.client_type === 1
    && client.android_info?.package_name === androidPackage
    && client.android_info?.certificate_hash
  ));
  const hasWebOauthClient = oauthClients.some(client => client.client_type === 3 && client.client_id);
  if (!hasAndroidOauthClient) {
    throw new Error(
      `${file} contains "${androidPackage}" but no Android OAuth client for its signing SHA-1. `
      + 'Add the build certificate fingerprint to this Firebase Android app, then download the file again.',
    );
  }
  if (!hasWebOauthClient) {
    throw new Error(
      `${file} has no Web OAuth client for Google Sign-In. Enable the Google provider in Firebase Authentication, then download the file again.`,
    );
  }
}

function assertNativeBuildServices({
  isEasBuild,
  platform,
  environment,
  googleMapsApiKey,
  googleServicesFile,
}) {
  if (!isEasBuild || platform !== 'android') return;
  if (!googleMapsApiKey) {
    throw new Error(
      `${environment} Android EAS build is missing GOOGLE_MAPS_API_KEY. `
      + 'Add it to the matching EAS environment before building.',
    );
  }
  if (!googleServicesFile) {
    throw new Error(
      `${environment} Android EAS build is missing GOOGLE_SERVICES_FILE. `
      + 'Upload the matching google-services JSON as an EAS file environment variable.',
    );
  }
}

module.exports = () => {
  const environment = appEnvironment();
  const firebase = readFirebaseConfig(environment);
  const identity = packageIdentity(environment);
  const googleServicesFile = serviceFile(environment, 'android');
  const googleServiceInfoFile = serviceFile(environment, 'ios');
  validateAndroidServiceFile(
    googleServicesFile,
    firebase,
    identity.androidPackage,
  );

  const rawGoogleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const googleMapsApiKey = rawGoogleMapsApiKey
    && !/^YOUR_|REPLACE_|CHANGE_ME$/i.test(rawGoogleMapsApiKey)
    && /^AIza[\w-]{30,}$/.test(rawGoogleMapsApiKey)
      ? rawGoogleMapsApiKey
      : undefined;
  assertNativeBuildServices({
    isEasBuild: process.env.EAS_BUILD === 'true',
    platform: process.env.EAS_BUILD_PLATFORM,
    environment,
    googleMapsApiKey,
    googleServicesFile,
  });

  return {
    ...base.expo,
    name: identity.name,
    scheme: identity.scheme,
    ios: {
      ...base.expo.ios,
      bundleIdentifier: identity.iosBundleIdentifier,
      ...(googleServiceInfoFile ? { googleServicesFile: googleServiceInfoFile } : {}),
    },
    android: {
      ...base.expo.android,
      package: identity.androidPackage,
      ...(googleMapsApiKey
        ? {
            config: {
              ...(base.expo.android.config || {}),
              googleMaps: { apiKey: googleMapsApiKey },
            },
          }
        : {}),
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    plugins: [
      ...(base.expo.plugins || []),
      '@react-native-google-signin/google-signin',
      'expo-video',
    ],
    extra: {
      ...(base.expo.extra || {}),
      appEnvironment: environment,
      firebase,
      googleAuthenticationConfigured: Boolean(googleServicesFile || googleServiceInfoFile),
      googleMapsConfigured: Boolean(googleMapsApiKey),
    },
  };
};

module.exports.appEnvironment = appEnvironment;
module.exports.readFirebaseConfig = readFirebaseConfig;
module.exports.packageIdentity = packageIdentity;
module.exports.validateAndroidServiceFile = validateAndroidServiceFile;
module.exports.assertNativeBuildServices = assertNativeBuildServices;
