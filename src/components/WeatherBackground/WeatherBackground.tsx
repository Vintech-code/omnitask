import React from 'react';
import { Canvas, Circle, useClock } from '@shopify/react-native-skia';
import type { CurrentWeather } from '@/types/weather';
import { useWeatherAnimation } from '@/hooks/useWeatherAnimation';
import { Sky } from './Sky'; import { Clouds } from './Clouds'; import { Mountains } from './Mountains'; import { Fog } from './Fog'; import { Rain } from './Rain'; import { Reflection } from './Reflection'; import { Lightning } from './Lightning';

export const WeatherBackground = React.memo(({ width, height, weather }: { width: number; height: number; weather: CurrentWeather }) => {
  const clock = useClock(); const animation = useWeatherAnimation(weather.weatherCode, weather.isDay, weather.time);
  if (width <= 0 || height <= 0) return null;
  return <Canvas style={{ width, height }}><Sky width={width} height={height} clock={clock} palette={animation.palette} />{animation.visualState === 'clear' ? <Circle cx={width * .78} cy={height * .14} r={52} color={animation.palette.glow} opacity={weather.isDay ? .3 : .2} /> : null}<Clouds width={width} height={height} clock={clock} palette={animation.palette} intensity={animation.clouds} /><Mountains width={width} height={height} clock={clock} palette={animation.palette} /><Reflection width={width} height={height} clock={clock} palette={animation.palette} /><Fog width={width} height={height} clock={clock} palette={animation.palette} intensity={animation.fog} /><Rain width={width} height={height} clock={clock} palette={animation.palette} intensity={animation.rain} /><Lightning width={width} height={height} clock={clock} palette={animation.palette} intensity={animation.lightning} /></Canvas>;
});

