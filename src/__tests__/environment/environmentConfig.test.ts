const appConfig = require('../../../app.config');
const {
  assertDevelopmentResetTarget,
} = require('../../../firebase-reset/reset-firebase');

describe('environment configuration', () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it('uses distinct package identities for every environment', () => {
    expect(appConfig.packageIdentity('development').androidPackage).toMatch(/\.dev$/);
    expect(appConfig.packageIdentity('staging').androidPackage).toMatch(/\.staging$/);
    expect(appConfig.packageIdentity('production').androidPackage).not.toMatch(/\.(dev|staging)$/);
  });

  it('does not allow a staging or production build to use development Firebase', () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'test';
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'omnitask-d5b47';
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'test';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'test';

    expect(() => appConfig.readFirebaseConfig('staging')).toThrow(
      /cannot use the development Firebase project/,
    );
    expect(() => appConfig.readFirebaseConfig('production')).toThrow(
      /cannot use the development Firebase project/,
    );
  });

  it('requires complete Firebase configuration outside development', () => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('EXPO_PUBLIC_FIREBASE_')) delete process.env[key];
    }
    expect(() => appConfig.readFirebaseConfig('staging')).toThrow(/incomplete/);
  });

  it('makes the reset utility fail closed outside the explicit development target', () => {
    const valid = {
      environment: 'development',
      defaultProjectId: 'omnitask-dev',
      developmentProjectId: 'omnitask-dev',
      credentialProjectId: 'omnitask-dev',
    };
    expect(() => assertDevelopmentResetTarget(valid)).not.toThrow();
    expect(() => assertDevelopmentResetTarget({ ...valid, environment: 'production' })).toThrow(
      /OMNITASK_ENV/,
    );
    expect(() => assertDevelopmentResetTarget({
      ...valid,
      defaultProjectId: 'omnitask-production',
    })).toThrow(/does not match/);
    expect(() => assertDevelopmentResetTarget({
      ...valid,
      credentialProjectId: 'omnitask-production',
    })).toThrow(/credentials belong/);
  });

  it('rejects an Android Firebase file without a package-specific OAuth client', () => {
    const temporaryFile = require('node:path').join(
      require('node:os').tmpdir(),
      `omnitask-google-services-${Date.now()}.json`,
    );
    require('node:fs').writeFileSync(temporaryFile, JSON.stringify({
      project_info: { project_id: 'omnitask-test' },
      client: [{
        client_info: { android_client_info: { package_name: 'com.example.omnitask' } },
        oauth_client: [{ client_type: 3, client_id: 'web-client' }],
      }],
    }));
    try {
      expect(() => appConfig.validateAndroidServiceFile(
        temporaryFile,
        { projectId: 'omnitask-test' },
        'com.example.omnitask',
      )).toThrow(/no Android OAuth client/);
    } finally {
      require('node:fs').unlinkSync(temporaryFile);
    }
  });

  it('fails an Android EAS build when Maps or Firebase native inputs are absent', () => {
    const valid = {
      isEasBuild: true,
      platform: 'android',
      environment: 'development',
      googleMapsApiKey: 'configured-key',
      googleServicesFile: 'configured-file.json',
    };

    expect(() => appConfig.assertNativeBuildServices(valid)).not.toThrow();
    expect(() => appConfig.assertNativeBuildServices({
      ...valid,
      googleMapsApiKey: undefined,
    })).toThrow(/GOOGLE_MAPS_API_KEY/);
    expect(() => appConfig.assertNativeBuildServices({
      ...valid,
      googleServicesFile: undefined,
    })).toThrow(/GOOGLE_SERVICES_FILE/);
  });

  it('does not require Android-only inputs while evaluating local or iOS config', () => {
    expect(() => appConfig.assertNativeBuildServices({
      isEasBuild: false,
      platform: 'android',
      environment: 'development',
    })).not.toThrow();
    expect(() => appConfig.assertNativeBuildServices({
      isEasBuild: true,
      platform: 'ios',
      environment: 'development',
    })).not.toThrow();
  });
});
