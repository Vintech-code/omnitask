const fs = require('node:fs');
const path = require('node:path');

const appConfig = require('../app.config');

const environment = appConfig.appEnvironment();
const identity = appConfig.packageIdentity(environment);
const firebase = appConfig.readFirebaseConfig(environment);
const configuredPath = process.env.GOOGLE_SERVICES_FILE?.trim();
const relativePath = configuredPath || `./config/firebase/google-services.${environment}.json`;
const configPath = path.resolve(__dirname, '..', relativePath);

const fail = message => {
  console.error(`Google authentication is not ready: ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(configPath)) {
  fail(`the ${environment} Android service file is missing at ${configPath}.`);
} else {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const projectId = config.project_info?.project_id;
    const appClient = config.client?.find(
      client => client.client_info?.android_client_info?.package_name === identity.androidPackage,
    );
    const oauthClients = appClient?.oauth_client || [];
    const webClient = oauthClients.find(client => client.client_type === 3);
    const androidClients = oauthClients.filter(client => (
      client.client_type === 1
      && client.android_info?.package_name === identity.androidPackage
      && client.android_info?.certificate_hash
    ));

    if (projectId !== firebase.projectId) {
      fail(`expected Firebase project "${firebase.projectId}", but the file belongs to "${projectId || 'unknown'}".`);
    } else if (!appClient) {
      fail(`the file does not contain Android package "${identity.androidPackage}".`);
    } else if (!webClient?.client_id) {
      fail('no Web OAuth client is present. Enable Google in Firebase Authentication, then download the file again.');
    } else if (androidClients.length === 0) {
      fail(
        `no Android OAuth client exists for "${identity.androidPackage}". Add this build certificate's SHA-1 and SHA-256 under Firebase Project settings > Your apps, then download the JSON again.`,
      );
    } else {
      console.log('Google authentication configuration is ready.');
      console.log(`Environment: ${environment}`);
      console.log(`Firebase project: ${projectId}`);
      console.log(`Android package: ${identity.androidPackage}`);
      console.log(`Registered Android signing certificates: ${androidClients.length}`);
    }
  } catch (error) {
    fail(`the service file is invalid (${error instanceof Error ? error.message : String(error)}).`);
  }
}
