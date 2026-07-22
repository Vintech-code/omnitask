import type { ImageSourcePropType } from 'react-native';

const WEATHER_ARTWORK = {
  clear: require('../../../assets/weather/1.png'),
  partlyCloudy: require('../../../assets/weather/2.png'),
  rain: require('../../../assets/weather/3.png'),
  cloudy: require('../../../assets/weather/4.png'),
  fog: require('../../../assets/weather/5.png'),
  sunShower: require('../../../assets/weather/6.png'),
  heavyRain: require('../../../assets/weather/7.png'),
  thunderstorm: require('../../../assets/weather/8.png'),
  severeThunderstorm: require('../../../assets/weather/9.png'),
} satisfies Record<string, ImageSourcePropType>;

export function weatherArtwork(code: number, isDay: boolean): ImageSourcePropType {
  if (code === 0) return WEATHER_ARTWORK.clear;
  if (code === 1 || code === 2) return WEATHER_ARTWORK.partlyCloudy;
  if (code === 3) return WEATHER_ARTWORK.cloudy;
  if (code === 45 || code === 48) return WEATHER_ARTWORK.fog;
  if ([95, 96].includes(code)) return WEATHER_ARTWORK.thunderstorm;
  if (code === 99) return WEATHER_ARTWORK.severeThunderstorm;
  if ([65, 67, 75, 82, 86].includes(code)) return WEATHER_ARTWORK.heavyRain;
  if (isDay && [51, 53, 55, 61, 63, 80, 81].includes(code)) return WEATHER_ARTWORK.sunShower;
  if ([51, 53, 55, 56, 57, 61, 63, 66, 71, 73, 77, 80, 81, 85].includes(code)) return WEATHER_ARTWORK.rain;
  return WEATHER_ARTWORK.cloudy;
}
