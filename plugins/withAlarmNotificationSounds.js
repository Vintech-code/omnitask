const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const sounds = {
  'mixkit-marimba-ringtone-1359.wav': 'alarm_marimba.wav',
  'mixkit-marimba-waiting-ringtone-1360.wav': 'alarm_marimba_waiting.wav',
  'mixkit-waiting-ringtone-1354.wav': 'alarm_waiting.wav',
  'mixkit-on-hold-ringtone-1361.wav': 'alarm_on_hold.wav',
  'mixkit-funky-triplets-1141.mp3': 'alarm_funky_triplets.mp3',
  'mixkit-gimme-that-groove-872.mp3': 'alarm_gimme_groove.mp3',
  'mixkit-dirty-thinkin-989.mp3': 'alarm_dirty_thinkin.mp3',
  'mixkit-love-787.mp3': 'alarm_love.mp3',
  'mixkit-sounds-good-1077.mp3': 'alarm_sounds_good.mp3',
  'mixkit-little-birds-singing-in-the-trees-17.wav': 'alarm_little_birds.wav',
  'mixkit-rooster-crowing-in-the-morning-2462.wav': 'alarm_rooster.wav',
  'mixkit-cow-moo-in-the-barn-1751.wav': 'alarm_cow.wav',
  'mixkit-horde-of-barking-dogs-60.wav': 'alarm_barking_dogs.wav',
  'mixkit-small-group-cheer-and-applause-518.wav': 'alarm_cheers.wav',
  'mixkit-young-man-coughing-2227.wav': 'alarm_coughing.wav',
};

module.exports = function withAlarmNotificationSounds(config) {
  return withDangerousMod(config, [
    'android',
    async modConfig => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const sourceDir = path.join(projectRoot, 'assets', 'sounds');
      const destinationDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw');

      fs.mkdirSync(destinationDir, { recursive: true });
      for (const [sourceName, destinationName] of Object.entries(sounds)) {
        const source = path.join(sourceDir, sourceName);
        if (!fs.existsSync(source)) {
          throw new Error(`Missing alarm sound asset: ${source}`);
        }
        fs.copyFileSync(source, path.join(destinationDir, destinationName));
      }

      return modConfig;
    },
  ]);
};
