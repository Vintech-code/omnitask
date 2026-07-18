import type { Coordinates, WeatherForecast } from '@/types/weather';

const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 15 * 60_000;
const REQUEST_TIMEOUT_MS = 12_000;

interface OpenMeteoResponse {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  current?: {
    time?: number;
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
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

const cache = new Map<string, CacheEntry>();

function validCoordinates({ latitude, longitude }: Coordinates): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function numeric(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function cacheKey(coordinates: Coordinates, forecastDays: number): string {
  return `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}:${forecastDays}`;
}

export async function getWeatherForecast(
  coordinates: Coordinates,
  options: { forecastDays?: number; forceRefresh?: boolean } = {},
): Promise<WeatherForecast> {
  if (!validCoordinates(coordinates)) throw new Error('A valid latitude and longitude are required for weather data.');
  const forecastDays = Math.min(16, Math.max(1, Math.round(options.forecastDays ?? 16)));
  const key = cacheKey(coordinates, forecastDays);
  const cached = cache.get(key);
  if (!options.forceRefresh && cached && cached.expiresAt > Date.now()) return cached.forecast;

  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m',
    forecast_days: String(forecastDays),
    timezone: 'auto',
    timeformat: 'unixtime',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${FORECAST_ENDPOINT}?${params.toString()}`, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The weather request timed out.');
    throw new Error('Weather data is unavailable. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }

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
    Math.abs(candidate.time.getTime() - currentTime.getTime()) < Math.abs(nearest.time.getTime() - currentTime.getTime())
      ? candidate
      : nearest
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
      isDay: numeric(current.is_day, 1) === 1,
    },
    hourly: hourlyForecast,
    fetchedAt: Date.now(),
  };
  cache.set(key, { forecast, expiresAt: Date.now() + CACHE_TTL_MS });
  return forecast;
}

export function clearWeatherCache(): void {
  cache.clear();
}
