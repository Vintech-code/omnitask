import { KEYS, Storage } from '@/services/StorageService';
import type { Coordinates, CurrentWeather, HourlyWeather, WeatherForecast } from '@/types/weather';

const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 15 * 60_000;
const REQUEST_TIMEOUT_MS = 12_000;
const CACHE_VERSION = 1;

interface OpenMeteoResponse {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  current?: {
    time?: number;
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    is_day?: number;
  };
  hourly?: {
    time?: number[];
    temperature_2m?: number[];
    precipitation_probability?: Array<number | null>;
    weather_code?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
  };
  reason?: string;
}

interface CacheEntry {
  expiresAt: number;
  forecast: WeatherForecast;
}

interface StoredWeatherForecast extends Omit<WeatherForecast, 'current' | 'hourly'> {
  current: Omit<CurrentWeather, 'time'> & { time: number };
  hourly: Array<Omit<HourlyWeather, 'time'> & { time: number }>;
}

interface StoredCacheEntry {
  version: number;
  expiresAt: number;
  savedAt: number;
  forecast: StoredWeatherForecast;
}

const cache = new Map<string, CacheEntry>();

function validCoordinates({ latitude, longitude }: Coordinates): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function numeric(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function cacheKey(coordinates: Coordinates, forecastDays: number): string {
  // Weather grids are much broader than GPS jitter. Coarse keys let a nearby offline
  // position resolve the same saved forecast instead of missing it by a few metres.
  return `${coordinates.latitude.toFixed(2)},${coordinates.longitude.toFixed(2)}:${forecastDays}`;
}

function storageKey(key: string): string {
  return `${KEYS.WEATHER_CACHE}:${key}`;
}

function serializeForecast(forecast: WeatherForecast): StoredWeatherForecast {
  return {
    ...forecast,
    source: 'network',
    isStale: false,
    current: { ...forecast.current, time: forecast.current.time.getTime() },
    hourly: forecast.hourly.map(hour => ({ ...hour, time: hour.time.getTime() })),
  };
}

function restoreForecast(entry: StoredCacheEntry): WeatherForecast | null {
  if (entry.version !== CACHE_VERSION || !entry.forecast?.current || !Array.isArray(entry.forecast.hourly)) return null;
  const currentTime = new Date(entry.forecast.current.time);
  const hourly = entry.forecast.hourly.map(hour => ({ ...hour, time: new Date(hour.time) }))
    .filter(hour => !Number.isNaN(hour.time.getTime()));
  if (Number.isNaN(currentTime.getTime()) || !hourly.length) return null;
  return {
    ...entry.forecast,
    current: { ...entry.forecast.current, time: currentTime },
    hourly,
    source: 'cache',
    isStale: entry.expiresAt <= Date.now(),
  };
}

async function readStoredForecast(key: string): Promise<{ forecast: WeatherForecast; expiresAt: number } | null> {
  const stored = await Storage.get<StoredCacheEntry>(storageKey(key));
  if (!stored) return null;
  const forecast = restoreForecast(stored);
  return forecast ? { forecast, expiresAt: stored.expiresAt } : null;
}

async function persistForecast(key: string, forecast: WeatherForecast, expiresAt: number): Promise<void> {
  await Storage.set<StoredCacheEntry>(storageKey(key), {
    version: CACHE_VERSION,
    expiresAt,
    savedAt: Date.now(),
    forecast: serializeForecast(forecast),
  });
}

function requestError(error: unknown): Error {
  if (error instanceof Error && error.name === 'AbortError') return new Error('The weather request timed out.');
  if (error instanceof Error) return error;
  return new Error('Weather data is unavailable. Check your connection and try again.');
}

export async function getWeatherForecast(
  coordinates: Coordinates,
  options: { forecastDays?: number; forceRefresh?: boolean } = {},
): Promise<WeatherForecast> {
  if (!validCoordinates(coordinates)) throw new Error('A valid latitude and longitude are required for weather data.');
  const forecastDays = Math.min(16, Math.max(1, Math.round(options.forecastDays ?? 16)));
  const key = cacheKey(coordinates, forecastDays);
  const memory = cache.get(key);
  if (!options.forceRefresh && memory && memory.expiresAt > Date.now()) return memory.forecast;

  // Read the disk fallback before requesting the network, but only return it if the request fails.
  // This keeps launches fresh when online while still making offline startup reliable.
  const stored = await readStoredForecast(key);
  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m',
    forecast_days: String(forecastDays),
    timezone: 'auto',
    timeformat: 'unixtime',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${FORECAST_ENDPOINT}?${params.toString()}`, { signal: controller.signal });
    const payload = await response.json() as OpenMeteoResponse;
    if (!response.ok) throw new Error(payload.reason || 'Open-Meteo could not return a forecast.');
    const current = payload.current;
    const hourly = payload.hourly;
    if (!current || !hourly?.time?.length) throw new Error('Open-Meteo returned an incomplete forecast.');

    const hourlyForecast = hourly.time.map((unixTime, index) => ({
      time: new Date(numeric(unixTime) * 1000),
      temperatureC: numeric(hourly.temperature_2m?.[index]),
      precipitationProbability: numeric(hourly.precipitation_probability?.[index]),
      weatherCode: numeric(hourly.weather_code?.[index]),
      windSpeedKmh: numeric(hourly.wind_speed_10m?.[index]),
      windGustKmh: numeric(hourly.wind_gusts_10m?.[index]),
    })).filter(item => !Number.isNaN(item.time.getTime()));
    const currentTime = new Date(numeric(current.time, Date.now() / 1000) * 1000);
    const nearestCurrentHour = hourlyForecast.reduce((nearest, candidate) => (
      Math.abs(candidate.time.getTime() - currentTime.getTime()) < Math.abs(nearest.time.getTime() - currentTime.getTime()) ? candidate : nearest
    ), hourlyForecast[0]);
    const forecast: WeatherForecast = {
      latitude: numeric(payload.latitude, coordinates.latitude),
      longitude: numeric(payload.longitude, coordinates.longitude),
      timezone: payload.timezone || 'UTC',
      current: {
        time: currentTime,
        temperatureC: numeric(current.temperature_2m),
        precipitationProbability: nearestCurrentHour?.precipitationProbability ?? 0,
        weatherCode: numeric(current.weather_code),
        windSpeedKmh: numeric(current.wind_speed_10m),
        apparentTemperatureC: numeric(current.apparent_temperature, numeric(current.temperature_2m)),
        humidityPercent: numeric(current.relative_humidity_2m),
        isDay: numeric(current.is_day, 1) === 1,
      },
      hourly: hourlyForecast,
      fetchedAt: Date.now(),
      source: 'network',
      isStale: false,
    };
    const expiresAt = Date.now() + CACHE_TTL_MS;
    cache.set(key, { forecast, expiresAt });
    await persistForecast(key, forecast, expiresAt);
    return forecast;
  } catch (error) {
    if (stored) {
      cache.set(key, { forecast: stored.forecast, expiresAt: stored.expiresAt });
      return stored.forecast;
    }
    throw requestError(error);
  } finally {
    clearTimeout(timeout);
  }
}

/** Clears the session cache. Persistent data remains available for offline fallback. */
export function clearWeatherCache(): void {
  cache.clear();
}
