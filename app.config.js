const fs = require('fs');
const path = require('path');
const base = require('./app.json');

module.exports = () => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
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
      ...(hasGoogleServices
        ? [['react-native-nitro-google-signin', { androidGoogleServicesFile: googleServicesFile }]]
        : []),
    ],
    extra: {
      ...(base.expo.extra || {}),
      googleAuthenticationConfigured: hasGoogleServices,
      googleMapsConfigured: Boolean(googleMapsApiKey),
    },
  };
};
