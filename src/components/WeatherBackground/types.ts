import type { SharedValue } from 'react-native-reanimated';
import type { WeatherPalette } from '@/hooks/useWeatherAnimation';
export interface SceneProps { width: number; height: number; clock: SharedValue<number>; palette: WeatherPalette; }
export interface AtmosphereProps extends SceneProps { intensity: SharedValue<number>; }

