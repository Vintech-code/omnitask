import { useEffect, useMemo, useRef, useState } from 'react';

import { getWeatherForecast } from '@/services/WeatherService';
import type { AppEvent } from '@/types/event';
import type { DayLensInsight } from '@/types/weather';
import { buildDayLensInsight } from '@/utils/dayLens';
import { eventStart } from '@/utils/eventDate';

export function useDayLens(events: AppEvent[], refreshKey = 0) {
  const [insights, setInsights] = useState<Record<string, DayLensInsight>>({});
  const [isLoading, setIsLoading] = useState(false);
  const handledRefreshKey = useRef(refreshKey);
  const eligible = useMemo(() => {
    const forecastLimit = Date.now() + 15 * 86_400_000;
    return events.filter(event => {
      const start = eventStart(event);
      return Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
        && Boolean(start && start.getTime() <= forecastLimit);
    }).slice(0, 6);
  }, [events]);

  useEffect(() => {
    let active = true;
    if (!eligible.length) {
      setInsights({});
      return () => { active = false; };
    }
    setIsLoading(true);
    const forceRefresh = refreshKey !== handledRefreshKey.current;
    handledRefreshKey.current = refreshKey;
    void Promise.all(eligible.map(async event => {
      const start = eventStart(event)!;
      const daysUntil = Math.max(1, Math.ceil((start.getTime() - Date.now()) / 86_400_000) + 1);
      const forecast = await getWeatherForecast(
        { latitude: event.latitude!, longitude: event.longitude! },
        { forecastDays: Math.min(16, daysUntil), forceRefresh },
      );
      return buildDayLensInsight(event, forecast.hourly);
    })).then(results => {
      if (!active) return;
      setInsights(Object.fromEntries(results.filter((item): item is DayLensInsight => Boolean(item)).map(item => [item.eventId, item])));
    }).catch(() => {
      // Day Lens is supplemental; a network error must not disturb the dashboard.
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [eligible, refreshKey]);

  return { insights, isLoading };
}
