import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import type { CurrentWeather, HourlyWeather } from '@/types/weather';
import type { CurrentWeatherStatus } from '@/hooks/useCurrentWeather';
import { upcomingHourlyWeather, weatherConditionLabel, weatherIconName } from '@/utils/weather';

interface WeatherCardProps {
  date: Date;
  weather: CurrentWeather | null;
  hourly: HourlyWeather[];
  location: string;
  status: CurrentWeatherStatus;
  error: string | null;
  onEnableLocation: () => void;
  onRetry: () => void;
}

export function WeatherCard({ date, weather, hourly, location, status, error, onEnableLocation, onRetry }: WeatherCardProps) {
  const { theme } = useTheme();
  const [hourlyExpanded, setHourlyExpanded] = useState(false);
  const loading = status === 'loading' || status === 'checking-permission';
  const upcoming = useMemo(() => upcomingHourlyWeather(hourly, date, 6), [date, hourly]);
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <GlassCard style={styles.card} padding={18}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.accent.base }]}>TODAY'S WEATHER</Text>
          <Text style={[styles.date, { color: theme.content.primary }]}>{dateLabel}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={theme.content.muted} />
            <Text style={[styles.location, { color: theme.content.secondary }]} numberOfLines={1}>{location}</Text>
          </View>
        </View>
        <View style={[styles.iconTile, { backgroundColor: theme.accent.soft }]}>
          <Ionicons
            name={(weather ? weatherIconName(weather.weatherCode, weather.isDay) : 'partly-sunny-outline') as keyof typeof Ionicons.glyphMap}
            size={24}
            color={theme.accent.base}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.stateRow}>
          <ActivityIndicator color={theme.accent.base} />
          <Text style={[styles.stateText, { color: theme.content.muted }]}>Checking the local forecast…</Text>
        </View>
      ) : status === 'permission-required' ? (
        <View style={styles.stateRow}>
          <View style={styles.stateCopy}>
            <Text style={[styles.stateTitle, { color: theme.content.primary }]}>Local weather is off</Text>
            <Text style={[styles.stateText, { color: theme.content.muted }]}>Allow location access to show weather for where you are.</Text>
          </View>
          <TouchableOpacity style={[styles.action, { backgroundColor: theme.accent.soft }]} onPress={onEnableLocation}>
            <Text style={[styles.actionText, { color: theme.accent.base }]}>Enable</Text>
          </TouchableOpacity>
        </View>
      ) : status === 'error' || !weather ? (
        <View style={styles.stateRow}>
          <View style={styles.stateCopy}>
            <Text style={[styles.stateTitle, { color: theme.content.primary }]}>Forecast unavailable</Text>
            <Text style={[styles.stateText, { color: theme.content.muted }]} numberOfLines={2}>{error || 'Try again when you are online.'}</Text>
          </View>
          <TouchableOpacity style={[styles.action, { backgroundColor: theme.accent.soft }]} onPress={onRetry}>
            <Text style={[styles.actionText, { color: theme.accent.base }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.currentRow}>
            <Text style={[styles.temperature, { color: theme.content.primary }]}>{Math.round(weather.temperatureC)}°</Text>
            <View style={styles.conditionCopy}>
              <Text style={[styles.condition, { color: theme.content.primary }]}>{weatherConditionLabel(weather.weatherCode)}</Text>
              <Text style={[styles.updated, { color: theme.content.muted }]}>Updated {weather.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
          </View>
          <View style={[styles.details, { borderTopColor: theme.divider }]}>
            <View style={styles.detail}>
              <Ionicons name="rainy-outline" size={17} color={theme.semantic.info} />
              <Text style={[styles.detailLabel, { color: theme.content.muted }]}>Rain</Text>
              <Text style={[styles.detailValue, { color: theme.content.primary }]}>{Math.round(weather.precipitationProbability)}%</Text>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.detail}>
              <Ionicons name="speedometer-outline" size={17} color={theme.semantic.warning} />
              <Text style={[styles.detailLabel, { color: theme.content.muted }]}>Wind</Text>
              <Text style={[styles.detailValue, { color: theme.content.primary }]}>{Math.round(weather.windSpeedKmh)} km/h</Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: hourlyExpanded }}
            accessibilityLabel={`${hourlyExpanded ? 'Hide' : 'Show'} hourly weather forecast`}
            activeOpacity={0.72}
            style={[styles.hourlyToggle, { borderTopColor: theme.divider }]}
            onPress={() => setHourlyExpanded(value => !value)}
          >
            <View style={[styles.hourlyToggleIcon, { backgroundColor: theme.accent.soft }]}>
              <Ionicons name="time-outline" size={17} color={theme.accent.base} />
            </View>
            <View style={styles.hourlyToggleCopy}>
              <Text style={[styles.hourlyToggleTitle, { color: theme.content.primary }]}>Hourly forecast</Text>
              <Text style={[styles.hourlyToggleSub, { color: theme.content.muted }]}>Next six hours</Text>
            </View>
            <Ionicons name={hourlyExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.content.muted} />
          </TouchableOpacity>

          {hourlyExpanded ? (
            upcoming.length > 0 ? (
              <View style={[styles.hourlyForecast, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>
                {upcoming.map((hour, index) => {
                  const isNow = index === 0 && Math.abs(hour.time.getTime() - date.getTime()) < 60 * 60_000;
                  const condition = weatherConditionLabel(hour.weatherCode);
                  return (
                    <View
                      key={hour.time.toISOString()}
                      accessible
                      accessibilityLabel={`${isNow ? 'Now' : hour.time.toLocaleTimeString([], { hour: 'numeric' })}, ${condition}, ${Math.round(hour.temperatureC)} degrees, ${Math.round(hour.precipitationProbability)} percent chance of rain`}
                      style={styles.hourColumn}
                    >
                      <Text style={[styles.hourTime, { color: isNow ? theme.accent.base : theme.content.muted }]}>
                        {isNow ? 'Now' : hour.time.toLocaleTimeString([], { hour: 'numeric' })}
                      </Text>
                      <View style={[styles.hourIcon, isNow && { backgroundColor: theme.accent.soft }]}>
                        <Ionicons
                          name={weatherIconName(hour.weatherCode) as keyof typeof Ionicons.glyphMap}
                          size={18}
                          color={isNow ? theme.accent.base : theme.content.secondary}
                        />
                      </View>
                      <Text style={[styles.hourTemp, { color: theme.content.primary }]}>{Math.round(hour.temperatureC)}°</Text>
                      <View style={styles.hourRainRow}>
                        <Ionicons name="water-outline" size={10} color={theme.semantic.info} />
                        <Text style={[styles.hourRain, { color: theme.semantic.info }]}>{Math.round(hour.precipitationProbability)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.hourlyEmpty, { color: theme.content.muted }]}>Hourly forecast is temporarily unavailable.</Text>
            )
          ) : null}
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.1 },
  date: { marginTop: 3, fontSize: 17, lineHeight: 22, fontWeight: '800', letterSpacing: -0.2 },
  locationRow: { marginTop: 6, maxWidth: 250, flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  iconTile: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  currentRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  temperature: { fontSize: 43, lineHeight: 50, fontWeight: '700', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  conditionCopy: { marginLeft: 13, flex: 1 },
  condition: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  updated: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  details: { marginTop: 15, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  detail: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailDivider: { width: StyleSheet.hairlineWidth, height: 22, marginHorizontal: 12 },
  detailLabel: { fontSize: 11, fontWeight: '600' },
  detailValue: { marginLeft: 'auto', fontSize: 12, fontWeight: '700' },
  hourlyToggle: { minHeight: 58, marginTop: 14, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  hourlyToggleIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hourlyToggleCopy: { flex: 1, marginLeft: 10 },
  hourlyToggleTitle: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  hourlyToggleSub: { marginTop: 1, fontSize: 10, lineHeight: 14 },
  hourlyForecast: { marginTop: 10, paddingHorizontal: 5, paddingVertical: 11, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
  hourColumn: { flex: 1, minWidth: 0, alignItems: 'center' },
  hourTime: { fontSize: 9, lineHeight: 13, fontWeight: '700' },
  hourIcon: { width: 30, height: 30, marginTop: 5, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  hourTemp: { marginTop: 4, fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hourRainRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 1 },
  hourRain: { fontSize: 8, lineHeight: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hourlyEmpty: { paddingVertical: 14, textAlign: 'center', fontSize: 11, lineHeight: 16 },
  stateRow: { minHeight: 90, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stateCopy: { flex: 1 },
  stateTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  stateText: { flexShrink: 1, fontSize: 12, lineHeight: 17 },
  action: { minWidth: 70, minHeight: 44, borderRadius: 22, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '700' },
});
