'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const CONFIRMATION_ARGUMENT = '--confirm';
const AUTH_BATCH_SIZE = 1000;
const STORAGE_LIST_BATCH_SIZE = 500;
const STORAGE_DELETE_CONCURRENCY = 20;
const MAX_FIRESTORE_RETRIES = 5;
let deletionStarted = false;

const resetDirectory = __dirname;
const projectRoot = path.resolve(resetDirectory, '..');
const functionsPackagePath = path.join(
  projectRoot,
  'firebase',
  'functions',
  'package.json',
);

function readJson(filePath, description) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${description} at ${filePath}: ${error.message}`);
  }
}

function getRepositoryFirebaseConfig() {
  const firebaseRc = readJson(
    path.join(projectRoot, '.firebaserc'),
    'the repository Firebase project configuration',
  );
  const projectId = firebaseRc.projects?.default;
  const developmentProjectId = firebaseRc.projects?.development;

  assertDevelopmentResetTarget({
    environment: process.env.OMNITASK_ENV,
    defaultProjectId: projectId,
    developmentProjectId,
  });

  const googleServicesPath = path.join(projectRoot, 'google-services.json');
  let storageBucket;

  if (fs.existsSync(googleServicesPath)) {
    const googleServices = readJson(googleServicesPath, 'google-services.json');
    storageBucket = googleServices.project_info?.storage_bucket;
  }

  return {
    projectId,
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      (typeof storageBucket === 'string' ? storageBucket : undefined),
  };
}

function assertDevelopmentResetTarget({
  environment,
  defaultProjectId,
  developmentProjectId,
  credentialProjectId,
}) {
  if (environment !== 'development') {
    throw new Error(
      'Safety check failed: OMNITASK_ENV must be explicitly set to "development". Nothing was deleted.',
    );
  }
  if (!developmentProjectId || typeof developmentProjectId !== 'string') {
    throw new Error(
      'Safety check failed: .firebaserc must define a "development" project alias. Nothing was deleted.',
    );
  }
  if (defaultProjectId !== developmentProjectId) {
    throw new Error(
      `Safety check failed: the default Firebase project "${defaultProjectId || 'missing'}" `
      + `does not match the development alias "${developmentProjectId}". Nothing was deleted.`,
    );
  }
  if (credentialProjectId && credentialProjectId !== developmentProjectId) {
    throw new Error(
      `Safety check failed: credentials belong to "${credentialProjectId}", `
      + `but the development project is "${developmentProjectId}". Nothing was deleted.`,
    );
  }
}

function validateCredentials(expectedProjectId) {
  const credentialsValue = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsValue) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS is not set. Point it to a local service-account JSON file and try again.',
    );
  }

  const credentialsPath = path.resolve(credentialsValue);
  const credentials = readJson(credentialsPath, 'the service-account credentials');

  if (credentials.type !== 'service_account' || !credentials.project_id) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS must point to a Firebase/Google Cloud service-account JSON file.',
    );
  }

  assertDevelopmentResetTarget({
    environment: process.env.OMNITASK_ENV,
    defaultProjectId: expectedProjectId,
    developmentProjectId: expectedProjectId,
    credentialProjectId: credentials.project_id,
  });
}

function loadFirebaseAdmin() {
  if (!fs.existsSync(functionsPackagePath)) {
    throw new Error(`Firebase Functions package not found at ${functionsPackagePath}.`);
  }

  try {
    const requireFromFunctions = createRequire(functionsPackagePath);
    return {
      app: requireFromFunctions('firebase-admin/app'),
      auth: requireFromFunctions('firebase-admin/auth'),
      firestore: requireFromFunctions('firebase-admin/firestore'),
      storage: requireFromFunctions('firebase-admin/storage'),
    };
  } catch (error) {
    throw new Error(
      `Unable to load firebase-admin from firebase/functions. Run "npm.cmd install --prefix firebase\\functions" first. ${error.message}`,
    );
  }
}

async function deleteFirestore(db) {
  console.log('\n[Firestore] Finding top-level collections...');
  const collections = await db.listCollections();

  if (collections.length === 0) {
    console.log('[Firestore] No documents found.');
    return;
  }

  const writer = db.bulkWriter({
    throttling: {
      initialOpsPerSecond: 200,
      maxOpsPerSecond: 500,
    },
  });
  let deletedDocuments = 0;

  writer.onWriteResult(() => {
    deletedDocuments += 1;
    if (deletedDocuments % 500 === 0) {
      console.log(`[Firestore] Deleted ${deletedDocuments} documents so far...`);
    }
  });

  writer.onWriteError((error) => {
    if (error.failedAttempts < MAX_FIRESTORE_RETRIES) {
      return true;
    }

    console.error(
      `[Firestore] Failed to delete ${error.documentRef.path} after ${error.failedAttempts} attempts.`,
    );
    return false;
  });

  try {
    for (const collection of collections) {
      console.log(`[Firestore] Deleting collection "${collection.id}" and all descendants...`);
      await db.recursiveDelete(collection, writer);
      console.log(`[Firestore] Finished collection "${collection.id}".`);
    }
  } finally {
    await writer.close();
  }

  console.log(`[Firestore] Complete. Deleted ${deletedDocuments} documents.`);
}

async function deleteAuthUsers(auth) {
  console.log('\n[Authentication] Finding users...');
  let deletedUsers = 0;

  while (true) {
    // Always request the first page. Deleting the returned users before using a
    // page token can otherwise cause users to be skipped in a changing list.
    const result = await auth.listUsers(AUTH_BATCH_SIZE);
    if (result.users.length === 0) {
      break;
    }

    const deletion = await auth.deleteUsers(result.users.map((user) => user.uid));
    deletedUsers += deletion.successCount;
    console.log(
      `[Authentication] Deleted ${deletedUsers} users (${deletion.successCount} in this batch).`,
    );

    if (deletion.failureCount > 0) {
      const failedIndexes = deletion.errors.map(({ index }) => index).join(', ');
      throw new Error(
        `${deletion.failureCount} Authentication users failed to delete (batch indexes: ${failedIndexes}).`,
      );
    }
  }

  console.log(`[Authentication] Complete. Deleted ${deletedUsers} users.`);
}

async function runWithConcurrency(items, concurrency, action) {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await action(items[currentIndex]);
      }
    },
  );

  await Promise.all(workers);
}

function isNotFoundError(error) {
  return error?.code === 404 || error?.code === '404';
}

async function deleteStorageFiles(storage, bucketName) {
  if (!bucketName) {
    console.log(
      '\n[Storage] No bucket was found in google-services.json or FIREBASE_STORAGE_BUCKET; skipping Storage.',
    );
    return;
  }

  console.log(`\n[Storage] Deleting all object generations from gs://${bucketName}...`);
  const bucket = storage.bucket(bucketName);
  let deletedFiles = 0;

  try {
    while (true) {
      // Re-list the first page after every batch so deleting objects cannot
      // invalidate a page token and cause later objects to be skipped.
      const [files] = await bucket.getFiles({
        autoPaginate: false,
        maxResults: STORAGE_LIST_BATCH_SIZE,
        versions: true,
      });

      if (files.length === 0) {
        break;
      }

      await runWithConcurrency(files, STORAGE_DELETE_CONCURRENCY, async (file) => {
        await file.delete({ ignoreNotFound: true });
      });

      deletedFiles += files.length;
      console.log(`[Storage] Deleted ${deletedFiles} object generations so far...`);
    }
  } catch (error) {
    if (isNotFoundError(error)) {
      console.log(`[Storage] Bucket gs://${bucketName} does not exist; skipping Storage.`);
      return;
    }
    throw error;
  }

  console.log(`[Storage] Complete. Deleted ${deletedFiles} object generations.`);
}

async function main() {
  if (
    process.argv.length !== 3 ||
    process.argv[2] !== CONFIRMATION_ARGUMENT
  ) {
    console.error('Firebase reset was NOT run.');
    console.error(`Usage: node reset-firebase.js ${CONFIRMATION_ARGUMENT}`);
    process.exitCode = 1;
    return;
  }

  const { projectId, storageBucket } = getRepositoryFirebaseConfig();
  validateCredentials(projectId);
  const admin = loadFirebaseAdmin();

  console.log('============================================================');
  console.log('OmniTask DEVELOPMENT Firebase reset');
  console.log(`Target project: ${projectId}`);
  console.log(`Storage bucket: ${storageBucket || 'not configured'}`);
  console.log('The required --confirm safeguard was provided. Starting reset.');
  console.log('============================================================');

  const app = admin.app.initializeApp({
    credential: admin.app.applicationDefault(),
    projectId,
    ...(storageBucket ? { storageBucket } : {}),
  });

  try {
    deletionStarted = true;
    await deleteFirestore(admin.firestore.getFirestore(app));
    await deleteAuthUsers(admin.auth.getAuth(app));
    await deleteStorageFiles(admin.storage.getStorage(app), storageBucket);
    console.log('\nFirebase development data reset completed successfully.');
  } finally {
    await app.delete();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(
      deletionStarted
        ? '\nFirebase reset failed. Some data may already have been deleted.'
        : '\nFirebase reset was NOT run.',
    );
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  assertDevelopmentResetTarget,
};
