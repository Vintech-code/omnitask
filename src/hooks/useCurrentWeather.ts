import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

import { getWeatherForecast } from '@/services/WeatherService';
import { KEYS, Storage } from '@/services/StorageService';
import type { CurrentWeather, HourlyWeather } from '@/types/weather';
import { storedWeatherLocationLabel, weatherLocationLabel } from '@/utils/weatherLocation';

interface StoredWeatherLocation {
  latitude: number;
  longitude: number;
  label: string;
}

export type CurrentWeatherStatus = 'checking-permission' | 'permission-required' | 'loading' | 'ready' | 'error';

interface CurrentWeatherState {
  weather: CurrentWeather | null;
  hourly: HourlyWeather[];
  locationLabel: string;
  status: CurrentWeatherStatus;
  error: string | null;
  dataSource: 'network' | 'cache' | null;
  isStale: boolean;
}

export function useCurrentWeather() {
  const [state, setState] = useState<CurrentWeatherState>({
    weather: null,
    hourly: [],
    locationLabel: 'Current location',
    status: 'checking-permission',
    error: null,
    dataSource: null,
    isStale: false,
  });

  const load = useCallback(async (requestPermission = false, forceRefresh = false) => {
    setState(previous => ({ ...previous, status: requestPermission ? 'loading' : previous.status, error: null }));
    try {
      const permission = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setState(previous => ({ ...previous, status: 'permission-required', error: null }));
        return;
      }

      setState(previous => ({ ...previous, status: 'loading', error: null }));
      const savedLocation = await Storage.get<StoredWeatherLocation>(KEYS.WEATHER_LOCATION);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      const coordinates = position
        ? { latitude: position.coords.latitude, longitude: position.coords.longitude }
        : savedLocation
          ? { latitude: savedLocation.latitude, longitude: savedLocation.longitude }
          : null;
      if (!coordinates) throw new Error('Your location is unavailable. Turn on location services and try again.');
      const [forecast, addresses] = await Promise.all([
        getWeatherForecast(coordinates, { forecastDays: 2, forceRefresh }),
        position ? Location.reverseGeocodeAsync(coordinates).catch(() => []) : Promise.resolve([]),
      ]);
      const label = addresses[0] ? weatherLocationLabel(addresses[0]) : storedWeatherLocationLabel(savedLocation?.label);
      await Storage.set<StoredWeatherLocation>(KEYS.WEATHER_LOCATION, { ...coordinates, label });
      setState({
        weather: forecast.current,
        hourly: forecast.hourly,
        locationLabel: label,
        status: 'ready',
        error: null,
        dataSource: forecast.source ?? 'network',
        isStale: forecast.isStale ?? false,
      });
    } catch (error) {
      setState(previous => ({
        ...previous,
        status: 'error',
        error: error instanceof Error ? error.message : 'Weather data is unavailable.',
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    requestPermission: () => load(true, true),
    refresh: () => load(false, true),
  };
}
