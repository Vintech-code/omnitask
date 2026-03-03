const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required for Firebase JS SDK v9+ (ESM package exports)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
