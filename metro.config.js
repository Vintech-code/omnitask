const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Required for Firebase JS SDK v9+ (ESM package exports)
config.resolver.unstable_enablePackageExports = true;

// Absolute import alias: @/ → src/
config.resolver.extraNodeModules = {
  '@': path.resolve(__dirname, 'src'),
};

module.exports = config;
