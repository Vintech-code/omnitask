import { fontFamily } from '@/theme/typography';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import type { HourlyWeather } from '@/types/weather';
import { weatherConditionLabel, weatherIconName } from '@/utils/weather';

type ForecastCardProps = { hours: HourlyWeather[]; inverse?: boolean; accent?: string };

export const ForecastCard = React.memo(({ hours, inverse = false, accent = '#9FE5F0' }: ForecastCardProps) => {
  const { theme } = useTheme();
  if (!hours.length) return null;
  const rain = Math.max(...hours.map(item => item.precipitationProbability));
  const low = Math.min(...hours.map(item => item.temperatureC));
  const high = Math.max(...hours.map(item => item.temperatureC));
  const representative = hours[Math.floor(hours.length / 2)];
  return (
    <View style={[styles.card, inverse && styles.inverseCard]}>
      <Text style={[styles.time, { color: inverse ? 'rgba(255,255,255,0.72)' : theme.content.muted }]}>{hours[0].time.toLocaleTimeString([], { hour: 'numeric' })}</Text>
      <Ionicons name={weatherIconName(representative.weatherCode) as keyof typeof Ionicons.glyphMap} size={22} color={inverse ? '#FFFFFF' : theme.icon} />
      <Text style={[styles.temp, { color: inverse ? '#FFFFFF' : theme.content.primary }]}>{Math.round(low)}° / {Math.round(high)}°</Text>
      <Text style={[styles.condition, { color: inverse ? 'rgba(255,255,255,0.86)' : theme.content.secondary }]} numberOfLines={1}>{weatherConditionLabel(representative.weatherCode)}</Text>
      <View style={styles.rain}><Ionicons name="water-outline" size={11} color={inverse ? accent : theme.semantic.info} /><Text style={[styles.rainText, { color: inverse ? accent : theme.semantic.info }]}>{Math.round(rain)}%</Text></View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: 112, minHeight: 126, paddingHorizontal: 12, paddingVertical: 10 },
  inverseCard: { marginRight: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.10)' },
  time: { fontSize: 11, fontFamily: fontFamily.bold },
  temp: { marginTop: 9, fontSize: 15, fontFamily: fontFamily.extrabold },
  condition: { marginTop: 3, fontSize: 10 },
  rain: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3 },
  rainText: { fontSize: 10, fontFamily: fontFamily.extrabold },
});
