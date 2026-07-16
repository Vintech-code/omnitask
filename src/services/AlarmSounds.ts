export interface AlarmSoundDefinition {
  label: string;
  asset: number | null;
  notificationFile: string | null;
}

export const ALARM_SOUNDS: AlarmSoundDefinition[] = [
  { label: 'Silent', asset: null, notificationFile: null },
  { label: 'Marimba Ringtone', asset: require('../../assets/sounds/mixkit-marimba-ringtone-1359.wav'), notificationFile: 'alarm_marimba.wav' },
  { label: 'Marimba Waiting', asset: require('../../assets/sounds/mixkit-marimba-waiting-ringtone-1360.wav'), notificationFile: 'alarm_marimba_waiting.wav' },
  { label: 'Waiting Ringtone', asset: require('../../assets/sounds/mixkit-waiting-ringtone-1354.wav'), notificationFile: 'alarm_waiting.wav' },
  { label: 'On Hold Ringtone', asset: require('../../assets/sounds/mixkit-on-hold-ringtone-1361.wav'), notificationFile: 'alarm_on_hold.wav' },
  { label: 'Funky Triplets', asset: require('../../assets/sounds/mixkit-funky-triplets-1141.mp3'), notificationFile: 'alarm_funky_triplets.mp3' },
  { label: 'Gimme That Groove', asset: require('../../assets/sounds/mixkit-gimme-that-groove-872.mp3'), notificationFile: 'alarm_gimme_groove.mp3' },
  { label: 'Dirty Thinkin', asset: require('../../assets/sounds/mixkit-dirty-thinkin-989.mp3'), notificationFile: 'alarm_dirty_thinkin.mp3' },
  { label: 'Love', asset: require('../../assets/sounds/mixkit-love-787.mp3'), notificationFile: 'alarm_love.mp3' },
  { label: 'Sounds Good', asset: require('../../assets/sounds/mixkit-sounds-good-1077.mp3'), notificationFile: 'alarm_sounds_good.mp3' },
  { label: 'Little Birds', asset: require('../../assets/sounds/mixkit-little-birds-singing-in-the-trees-17.wav'), notificationFile: 'alarm_little_birds.wav' },
  { label: 'Rooster Crowing', asset: require('../../assets/sounds/mixkit-rooster-crowing-in-the-morning-2462.wav'), notificationFile: 'alarm_rooster.wav' },
  { label: 'Cow Moo', asset: require('../../assets/sounds/mixkit-cow-moo-in-the-barn-1751.wav'), notificationFile: 'alarm_cow.wav' },
  { label: 'Barking Dogs', asset: require('../../assets/sounds/mixkit-horde-of-barking-dogs-60.wav'), notificationFile: 'alarm_barking_dogs.wav' },
  { label: 'Cheers & Applause', asset: require('../../assets/sounds/mixkit-small-group-cheer-and-applause-518.wav'), notificationFile: 'alarm_cheers.wav' },
  { label: 'Man Coughing', asset: require('../../assets/sounds/mixkit-young-man-coughing-2227.wav'), notificationFile: 'alarm_coughing.wav' },
];

export function getAlarmSound(label: string) {
  return ALARM_SOUNDS.find(sound => sound.label === label);
}
