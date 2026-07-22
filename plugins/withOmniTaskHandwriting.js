const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod, withMainApplication } = require('@expo/config-plugins');

const dependency = 'implementation("com.google.mlkit:digital-ink-recognition:19.0.0")';

module.exports = function withOmniTaskHandwriting(config) {
  config = withAppBuildGradle(config, modConfig => {
    if (!modConfig.modResults.contents.includes('com.google.mlkit:digital-ink-recognition')) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(/dependencies\s*\{/, match => `${match}\n    ${dependency}`);
    }
    return modConfig;
  });

  config = withMainApplication(config, modConfig => {
    if (!modConfig.modResults.contents.includes('add(OmniTaskHandwritingPackage())')) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        /(PackageList\(this\)\.packages\.apply\s*\{)/,
        '$1\n              add(OmniTaskHandwritingPackage())',
      );
    }
    return modConfig;
  });

  return withDangerousMod(config, ['android', async modConfig => {
    const packageName = modConfig.android?.package;
    if (!packageName) throw new Error('android.package is required for the OmniTask handwriting bridge.');
    const destination = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...packageName.split('.'));
    const templates = path.join(modConfig.modRequest.projectRoot, 'plugins', 'handwriting');
    fs.mkdirSync(destination, { recursive: true });
    for (const filename of ['OmniTaskHandwritingModule.kt', 'OmniTaskHandwritingPackage.kt']) {
      const source = fs.readFileSync(path.join(templates, filename), 'utf8').replaceAll('__PACKAGE_NAME__', packageName);
      fs.writeFileSync(path.join(destination, filename), source);
    }
    return modConfig;
  }]);
};
