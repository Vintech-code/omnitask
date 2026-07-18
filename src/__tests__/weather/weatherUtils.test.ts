import {
  assessWeatherWarning,
  isSevereWeatherCode,
  nearestHourlyWeather,
  upcomingHourlyWeather,
  weatherConditionLabel,
} from '@/utils/weather';
import type { HourlyWeather } from '@/types/weather';

const hour = (time: string, overrides: Partial<HourlyWeather> = {}): HourlyWeather => ({
  time: new Date(time),
  temperatureC: 29,
  precipitationProbability: 20,
  weatherCode: 2,
  windSpeedKmh: 12,
  windGustKmh: 20,
  ...overrides,
});

describe('weather utilities', () => {
  it('maps WMO conditions and severe codes', () => {
    expect(weatherConditionLabel(0)).toBe('Clear sky');
    expect(weatherConditionLabel(95)).toBe('Thunderstorm');
    expect(isSevereWeatherCode(95)).toBe(true);
    expect(isSevereWeatherCode(3)).toBe(false);
  });

  it('warns at the 60 percent rain threshold', () => {
    expect(assessWeatherWarning(hour('2026-07-20T00:00:00Z', { precipitationProbability: 60 }))).toEqual(expect.objectContaining({
      shouldWarn: true,
      severity: 'advisory',
      reasons: ['rain'],
    }));
  });

  it('treats severe codes and strong winds as severe', () => {
    const result = assessWeatherWarning(hour('2026-07-20T00:00:00Z', {
      weatherCode: 99,
      windGustKmh: 70,
    }));
    expect(result.shouldWarn).toBe(true);
    expect(result.severity).toBe('severe');
    expect(result.reasons).toEqual(expect.arrayContaining(['severe-condition', 'strong-wind']));
  });

  it('selects the hourly forecast nearest the event time', () => {
    const result = nearestHourlyWeather([
      hour('2026-07-20T00:00:00Z'),
      hour('2026-07-20T01:00:00Z', { precipitationProbability: 80 }),
    ], new Date('2026-07-20T00:50:00Z'));
    expect(result?.precipitationProbability).toBe(80);
  });

  it('returns the next six hourly entries in chronological order', () => {
    const result = upcomingHourlyWeather([
      hour('2026-07-19T03:00:00Z'),
      hour('2026-07-19T01:00:00Z'),
      hour('2026-07-18T23:00:00Z'),
      hour('2026-07-19T02:00:00Z'),
    ], new Date('2026-07-19T01:35:00Z'), 3);
    expect(result.map(item => item.time.toISOString())).toEqual([
      '2026-07-19T01:00:00.000Z',
      '2026-07-19T02:00:00.000Z',
      '2026-07-19T03:00:00.000Z',
    ]);
  });
});
