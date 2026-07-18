import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

import { getWeatherForecast } from '@/services/WeatherService';
import type { CurrentWeather, HourlyWeather } from '@/types/weather';

export type CurrentWeatherStatus = 'checking-permission' | 'permission-required' | 'loading' | 'ready' | 'error';

interface CurrentWeatherState {
  weather: CurrentWeather | null;
  hourly: HourlyWeather[];
  locationLabel: string;
  status: CurrentWeatherStatus;
  error: string | null;
}

function locationName(address?: Location.LocationGeocodedAddress): string {
  if (!address) return 'Current location';
  const values = [address.name, address.city || address.subregion, address.region]
    .filter((value): value is string => Boolean(value?.trim()));
  return [...new Set(values)].slice(0, 2).join(', ') || 'Current location';
}

export function useCurrentWeather() {
  const [state, setState] = useState<CurrentWeatherState>({
    weather: null,
    hourly: [],
    locationLabel: 'Current location',
    status: 'checking-permission',
    error: null,
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
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      const [forecast, addresses] = await Promise.all([
        getWeatherForecast(coordinates, { forecastDays: 2, forceRefresh }),
        Location.reverseGeocodeAsync(coordinates).catch(() => []),
      ]);
      setState({
        weather: forecast.current,
        hourly: forecast.hourly,
        locationLabel: locationName(addresses[0]),
        status: 'ready',
        error: null,
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
