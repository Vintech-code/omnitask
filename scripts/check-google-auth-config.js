const fs = require('fs');
const path = require('path');

const expectedPackage = 'com.vincentements_007.omnitask';
const expectedProject = 'omnitask-d5b47';
const expectedDebugSha1 = '5e8f16062ea3cd2c4a0d547876baa6f38cabf625';
const configPath = path.resolve(__dirname, '..', 'google-services.json');

const fail = (message) => {
  console.error(`Google authentication is not ready: ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(configPath)) {
  fail('google-services.json is missing from the project root. Download it from Firebase Project settings after registering the Android app and SHA-1.');
} else {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const projectId = config.project_info?.project_id;
    const appClient = config.client?.find(
      (client) => client.client_info?.android_client_info?.package_name === expectedPackage,
    );
    const oauthClients = appClient?.oauth_client || [];
    const webClient = oauthClients.find((client) => client.client_type === 3);
    const debugAndroidClient = oauthClients.find((client) => {
      if (client.client_type !== 1) return false;
      const androidInfo = client.android_info || {};
      const certificateHash = String(androidInfo.certificate_hash || '')
        .replace(/:/g, '')
        .toLowerCase();
      return androidInfo.package_name === expectedPackage && certificateHash === expectedDebugSha1;
    });

    if (projectId !== expectedProject) {
      fail(`expected Firebase project "${expectedProject}", but the file belongs to "${projectId || 'unknown'}".`);
    } else if (!appClient) {
      fail(`the file does not contain Android package "${expectedPackage}".`);
    } else if (!webClient?.client_id) {
      fail('no Web OAuth client is present. Enable Google in Firebase Authentication, then download google-services.json again.');
    } else if (!debugAndroidClient?.client_id) {
      fail('no Android OAuth client matches the project debug SHA-1. Add SHA-1 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25, then download google-services.json again.');
    } else {
      console.log('Google authentication configuration is ready for Android prebuild.');
      console.log(`Firebase project: ${projectId}`);
      console.log(`Android package: ${expectedPackage}`);
    }
  } catch (error) {
    fail(`google-services.json is invalid JSON (${error instanceof Error ? error.message : String(error)}).`);
  }
}
