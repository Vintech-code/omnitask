import { useEffect, useMemo } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

export type WeatherVisualState = 'clear' | 'cloudy' | 'overcast' | 'light-rain' | 'heavy-rain' | 'thunderstorm' | 'fog';
export type WeatherTimeOfDay = 'morning' | 'afternoon' | 'sunset' | 'night';

export interface WeatherPalette { skyTop: string; skyBottom: string; mountainBack: string; mountainFront: string; water: string; glow: string; }

const stateForCode = (code: number): WeatherVisualState => {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'thunderstorm';
  if (code >= 65 || code === 82 || code === 86) return 'heavy-rain';
  if ((code >= 51 && code <= 63) || code === 80 || code === 81) return 'light-rain';
  return 'overcast';
};

const timeFor = (date: Date, isDay: boolean): WeatherTimeOfDay => {
  if (!isDay) return 'night'; const hour = date.getHours();
  if (hour < 11) return 'morning'; if (hour < 16) return 'afternoon'; return 'sunset';
};

const PALETTES: Record<WeatherTimeOfDay, WeatherPalette> = {
  morning: { skyTop: '#697985', skyBottom: '#B9C3C7', mountainBack: '#5C676B', mountainFront: '#354247', water: '#50656D', glow: '#DCE9EA' },
  afternoon: { skyTop: '#596872', skyBottom: '#A6B1B6', mountainBack: '#566166', mountainFront: '#303C41', water: '#455B64', glow: '#D6E2E4' },
  sunset: { skyTop: '#4C5660', skyBottom: '#92999D', mountainBack: '#535A5E', mountainFront: '#30373A', water: '#3F5057', glow: '#CFD8D7' },
  night: { skyTop: '#11171D', skyBottom: '#35434C', mountainBack: '#283238', mountainFront: '#151D21', water: '#1D3038', glow: '#B6D5DA' },
};

export function useWeatherAnimation(weatherCode: number, isDay: boolean, date = new Date()) {
  const visualState = stateForCode(weatherCode); const timeOfDay = timeFor(date, isDay);
  const rainTarget = visualState === 'thunderstorm' ? 1 : visualState === 'heavy-rain' ? 0.78 : visualState === 'light-rain' ? 0.36 : 0;
  const cloudTarget = visualState === 'clear' ? 0.2 : visualState === 'cloudy' ? 0.52 : 0.92;
  const fogTarget = visualState === 'fog' ? 0.72 : visualState === 'overcast' ? 0.34 : visualState.includes('rain') || visualState === 'thunderstorm' ? 0.42 : 0.16;
  const rain = useSharedValue(rainTarget); const clouds = useSharedValue(cloudTarget); const fog = useSharedValue(fogTarget); const lightning = useSharedValue(visualState === 'thunderstorm' ? 1 : 0);
  useEffect(() => { rain.value = withTiming(rainTarget, { duration: 1400 }); clouds.value = withTiming(cloudTarget, { duration: 1600 }); fog.value = withTiming(fogTarget, { duration: 1700 }); lightning.value = withTiming(visualState === 'thunderstorm' ? 1 : 0, { duration: 900 }); }, [cloudTarget, fogTarget, rainTarget, visualState]);
  return useMemo(() => ({ visualState, timeOfDay, palette: PALETTES[timeOfDay], rain, clouds, fog, lightning }), [timeOfDay, visualState]);
}

