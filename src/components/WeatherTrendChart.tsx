import { fontFamily } from '@/theme/typography';
import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { Canvas, Circle, Line, Path, Skia, vec } from '@shopify/react-native-skia';

import { useTheme } from '@/context/ThemeContext';
import type { HourlyWeather } from '@/types/weather';

const CHART_HEIGHT = 116;
const HORIZONTAL_INSET = 12;

function smoothPath(points: { x: number; y: number }[]) {
  const path = Skia.Path.Make();
  if (!points.length) return path;
  path.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    path.quadTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
  }
  const last = points[points.length - 1];
  path.lineTo(last.x, last.y);
  return path;
}

type WeatherTrendChartProps = { hours: HourlyWeather[]; inverse?: boolean; accent?: string };

export const WeatherTrendChart = React.memo(({ hours, inverse = false, accent = '#9FE5F0' }: WeatherTrendChartProps) => {
  const { width: screenWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const samples = useMemo(() => hours.slice(0, 13).filter((_, index) => index % 2 === 0), [hours]);
  const chartWidth = Math.max(260, Math.min(680, screenWidth - 72));
  const model = useMemo(() => {
    const temperatures = samples.map(item => item.temperatureC);
    const minimum = Math.min(...temperatures);
    const maximum = Math.max(...temperatures);
    const range = Math.max(2, maximum - minimum);
    const usableWidth = chartWidth - HORIZONTAL_INSET * 2;
    const points = samples.map((item, index) => ({
      x: HORIZONTAL_INSET + (usableWidth * index) / Math.max(1, samples.length - 1),
      y: 18 + ((maximum - item.temperatureC) / range) * 48,
    }));
    return { points, path: smoothPath(points) };
  }, [chartWidth, samples]);

  if (samples.length < 2) return null;
  return (
    <View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: inverse ? '#FFFFFF' : theme.accent.base }]} /><Text style={[styles.legendText, { color: inverse ? 'rgba(255,255,255,0.78)' : theme.content.secondary }]}>Temperature</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: inverse ? accent : theme.semantic.info }]} /><Text style={[styles.legendText, { color: inverse ? 'rgba(255,255,255,0.78)' : theme.content.secondary }]}>Rain chance</Text></View>
      </View>
      <View style={{ height: CHART_HEIGHT }}>
        <Canvas style={StyleSheet.absoluteFill}>
          {[28, 52, 76].map(y => <Line key={y} p1={vec(HORIZONTAL_INSET, y)} p2={vec(chartWidth - HORIZONTAL_INSET, y)} color={inverse ? 'rgba(255,255,255,0.14)' : theme.divider} strokeWidth={1} />)}
          {samples.map((item, index) => {
            const point = model.points[index];
            const rainHeight = Math.max(2, item.precipitationProbability * 0.28);
            return <Line key={`rain-${item.time.toISOString()}`} p1={vec(point.x, 102)} p2={vec(point.x, 102 - rainHeight)} color={inverse ? accent : theme.semantic.info} strokeWidth={5} strokeCap="round" />;
          })}
          <Path path={model.path} color={inverse ? '#FFFFFF' : theme.accent.base} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
          {model.points.map((point, index) => <Circle key={`point-${samples[index].time.toISOString()}`} cx={point.x} cy={point.y} r={4} color={inverse ? '#FFFFFF' : theme.accent.base} />)}
        </Canvas>
      </View>
      <View style={styles.labels}>
        {samples.map((item, index) => <View key={item.time.toISOString()} style={styles.labelCell}><Text style={[styles.temperature, { color: inverse ? '#FFFFFF' : theme.content.primary }]}>{Math.round(item.temperatureC)}°</Text><Text style={[styles.time, { color: inverse ? 'rgba(255,255,255,0.66)' : theme.content.muted }]}>{index === 0 ? 'Now' : item.time.toLocaleTimeString([], { hour: 'numeric' })}</Text></View>)}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: fontFamily.semibold },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  labelCell: { minWidth: 32, alignItems: 'center' },
  temperature: { fontSize: 11, fontFamily: fontFamily.extrabold },
  time: { marginTop: 2, fontSize: 9, fontFamily: fontFamily.semibold },
});
