const fs = require('fs');
const path = require('path');
const base = require('./app.json');

module.exports = () => {
  const rawGoogleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const googleMapsApiKey = rawGoogleMapsApiKey
    && !/^YOUR_|REPLACE_|CHANGE_ME$/i.test(rawGoogleMapsApiKey)
    && /^AIza[\w-]{30,}$/.test(rawGoogleMapsApiKey)
      ? rawGoogleMapsApiKey
      : undefined;
  const googleServicesFile = './google-services.json';
  const hasGoogleServices = fs.existsSync(path.join(__dirname, googleServicesFile));
  return {
    ...base.expo,
    android: {
      ...base.expo.android,
      ...(googleMapsApiKey
        ? {
            config: {
              ...(base.expo.android.config || {}),
              googleMaps: { apiKey: googleMapsApiKey },
            },
          }
        : {}),
      ...(hasGoogleServices ? { googleServicesFile } : {}),
    },
    plugins: [
      ...(base.expo.plugins || []),
      '@react-native-google-signin/google-signin',
      'expo-video',
    ],
    extra: {
      ...(base.expo.extra || {}),
      googleAuthenticationConfigured: hasGoogleServices,
      googleMapsConfigured: Boolean(googleMapsApiKey),
    },
  };
};
