import type { AppEvent } from '@/types/event';
import type { HourlyWeather } from '@/types/weather';
import { buildDayLensInsight, dayLensBadge } from '@/utils/dayLens';
import { eventStart } from '@/utils/eventDate';

const event: AppEvent = {
  id: 'event-1', title: 'Client visit', description: '', startDate: 'Jul 22, 2026', startTime: '08:00 AM',
  endTime: '09:00 AM', location: 'Office', latitude: 14.59, longitude: 120.98, category: 'Work',
  priority: 'Medium', reminders: [], alarmActive: true, recurrence: 'none', timeZone: 'Asia/Manila',
};

function weather(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  return {
    time: eventStart(event)!, temperatureC: 27, precipitationProbability: 20, weatherCode: 2,
    windSpeedKmh: 8, windGustKmh: 12, ...overrides,
  };
}

describe('Day Lens guidance', () => {
  it('creates actionable rain preparation guidance', () => {
    const insight = buildDayLensInsight(event, [weather({ precipitationProbability: 78, weatherCode: 61 })]);
    expect(insight?.level).toBe('advisory');
    expect(insight?.guidance).toContain('umbrella');
    expect(insight && dayLensBadge(insight)).toBe('78% rain');
  });

  it('prioritizes severe conditions', () => {
    const insight = buildDayLensInsight(event, [weather({ precipitationProbability: 90, weatherCode: 95 })]);
    expect(insight?.level).toBe('severe');
    expect(insight && dayLensBadge(insight)).toBe('Weather alert');
  });

  it('keeps normal conditions calm and non-alarming', () => {
    const insight = buildDayLensInsight(event, [weather()]);
    expect(insight?.level).toBe('clear');
    expect(insight?.guidance).toContain('schedule can stay as planned');
  });
});
