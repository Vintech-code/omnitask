import type { AppEvent } from '@/types/event';
import type { DayLensInsight, HourlyWeather } from '@/types/weather';
import { assessWeatherWarning, nearestHourlyWeather, weatherConditionLabel } from '@/utils/weather';
import { eventStart, parseEventDateTime, systemTimeZone } from '@/utils/eventDate';

export function buildDayLensInsight(event: AppEvent, hourlyForecast: HourlyWeather[]): DayLensInsight | null {
  const start = event.allDay
    ? parseEventDateTime(event.startDate, '09:00 AM', event.timeZone ?? systemTimeZone())
    : eventStart(event);
  if (!start) return null;
  const weather = nearestHourlyWeather(hourlyForecast, start, 90 * 60_000);
  if (!weather) return null;
  const warning = assessWeatherWarning(weather);
  const rain = Math.round(weather.precipitationProbability);
  const condition = weatherConditionLabel(weather.weatherCode);

  let level: DayLensInsight['level'] = warning.severity === 'severe' ? 'severe' : warning.shouldWarn ? 'advisory' : 'clear';
  let guidance = 'Conditions look manageable. Your schedule can stay as planned.';
  if (warning.reasons.includes('severe-condition')) {
    guidance = `${condition} is possible near this event. Check conditions before leaving and allow extra time.`;
  } else if (warning.reasons.includes('strong-wind')) {
    guidance = 'Strong winds are possible. Secure loose items and allow extra travel time.';
  } else if (rain >= 60) {
    guidance = `${rain}% chance of rain. Bring an umbrella and protect electronics or documents.`;
  } else if (weather.temperatureC >= 32) {
    level = 'advisory';
    guidance = 'Hot conditions are expected. Bring water and avoid rushing before the event.';
  } else if (weather.temperatureC <= 18) {
    level = 'advisory';
    guidance = 'Cool conditions are expected. Bring a light layer if you will be outdoors.';
  }

  return {
    eventId: event.id,
    level,
    condition,
    guidance,
    precipitationProbability: rain,
    temperatureC: weather.temperatureC,
    weatherCode: weather.weatherCode,
  };
}

export function dayLensBadge(insight: DayLensInsight): string {
  if (insight.level === 'severe') return 'Weather alert';
  if (insight.precipitationProbability >= 60) return `${insight.precipitationProbability}% rain`;
  if (insight.temperatureC >= 32) return 'Hot conditions';
  if (insight.temperatureC <= 18) return 'Cool conditions';
  return 'Weather clear';
}
