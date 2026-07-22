import { fontFamily } from '@/theme/typography';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import type { HourlyWeather } from '@/types/weather';
import { weatherIconName } from '@/utils/weather';

type HourlyForecastProps = { hours: HourlyWeather[]; inverse?: boolean; accent?: string };

export const HourlyForecast = React.memo(({ hours, inverse = false, accent = '#9FE5F0' }: HourlyForecastProps) => {
  const { theme } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {hours.slice(0, 12).map((hour, index) => (
        <View key={hour.time.toISOString()} style={[styles.hour, index === 0 && { backgroundColor: inverse ? 'rgba(255,255,255,0.12)' : theme.accent.soft }]}>
          <Text style={[styles.time, { color: inverse ? (index === 0 ? accent : 'rgba(255,255,255,0.72)') : (index === 0 ? theme.accent.base : theme.content.muted) }]}>{index === 0 ? 'Now' : hour.time.toLocaleTimeString([], { hour: 'numeric' })}</Text>
          <Ionicons name={weatherIconName(hour.weatherCode) as keyof typeof Ionicons.glyphMap} size={20} color={inverse ? '#FFFFFF' : theme.icon} />
          <Text style={[styles.temp, { color: inverse ? '#FFFFFF' : theme.content.primary }]}>{Math.round(hour.temperatureC)}°</Text>
          <View style={styles.rain}><Ionicons name="water-outline" size={9} color={inverse ? accent : theme.semantic.info} /><Text style={[styles.rainText, { color: inverse ? accent : theme.semantic.info }]}>{Math.round(hour.precipitationProbability)}%</Text></View>
        </View>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: { paddingHorizontal: 4, gap: 4 },
  hour: { width: 62, minHeight: 112, borderRadius: 18, alignItems: 'center', justifyContent: 'space-around', paddingVertical: 10 },
  time: { fontSize: 9, fontFamily: fontFamily.bold },
  temp: { fontSize: 14, fontFamily: fontFamily.extrabold },
  rain: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  rainText: { fontSize: 8, fontFamily: fontFamily.bold },
});
