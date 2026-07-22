import type { HourlyWeather, WeatherWarningAssessment } from '@/types/weather';

const WEATHER_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm with hail',
};

const SEVERE_WEATHER_CODES = new Set([65, 67, 75, 82, 86, 95, 96, 99]);

export function weatherConditionLabel(code: number): string {
  return WEATHER_LABELS[code] ?? 'Weather unavailable';
}

export function weatherIconName(code: number, isDay = true): string {
  if (code === 0) return isDay ? 'sunny-outline' : 'moon-outline';
  if (code <= 3) return isDay ? 'partly-sunny-outline' : 'cloudy-night-outline';
  if (code === 45 || code === 48) return 'cloud-outline';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow-outline';
  if ([95, 96, 99].includes(code)) return 'thunderstorm-outline';
  return 'rainy-outline';
}

export function isSevereWeatherCode(code: number): boolean {
  return SEVERE_WEATHER_CODES.has(code);
}

export function assessWeatherWarning(weather: Pick<HourlyWeather, 'weatherCode' | 'precipitationProbability' | 'windSpeedKmh' | 'windGustKmh'>): WeatherWarningAssessment {
  const reasons: WeatherWarningAssessment['reasons'] = [];
  if (weather.precipitationProbability >= 60) reasons.push('rain');
  if (isSevereWeatherCode(weather.weatherCode)) reasons.push('severe-condition');
  if (weather.windSpeedKmh >= 50 || weather.windGustKmh >= 65) reasons.push('strong-wind');
  return {
    shouldWarn: reasons.length > 0,
    reasons,
    severity: reasons.includes('severe-condition') || reasons.includes('strong-wind') ? 'severe' : reasons.length ? 'advisory' : 'none',
  };
}

export function nearestHourlyWeather(hourly: HourlyWeather[], target: Date, maximumDifferenceMs = Number.POSITIVE_INFINITY): HourlyWeather | null {
  if (!hourly.length || Number.isNaN(target.getTime())) return null;
  const nearest = hourly.reduce((closest, candidate) => (
    Math.abs(candidate.time.getTime() - target.getTime()) < Math.abs(closest.time.getTime() - target.getTime())
      ? candidate
      : closest
  ));
  return Math.abs(nearest.time.getTime() - target.getTime()) <= maximumDifferenceMs ? nearest : null;
}

export function upcomingHourlyWeather(hourly: HourlyWeather[], now: Date, limit = 6): HourlyWeather[] {
  if (limit <= 0 || Number.isNaN(now.getTime())) return [];
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);
  return hourly
    .filter(item => !Number.isNaN(item.time.getTime()) && item.time.getTime() >= currentHour.getTime())
    .sort((left, right) => left.time.getTime() - right.time.getTime())
    .slice(0, limit);
}

export function weatherWarningBody(eventTitle: string, weather: HourlyWeather): string {
  const condition = weatherConditionLabel(weather.weatherCode);
  const parts = [`${condition} is forecast for ${eventTitle}`];
  if (weather.precipitationProbability >= 60) parts.push(`${Math.round(weather.precipitationProbability)}% chance of rain`);
  if (weather.windSpeedKmh >= 50 || weather.windGustKmh >= 65) {
    parts.push(`winds up to ${Math.round(Math.max(weather.windSpeedKmh, weather.windGustKmh))} km/h`);
  }
  return `${parts.join(' · ')}. Plan ahead before you leave.`;
}
