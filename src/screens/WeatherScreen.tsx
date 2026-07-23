import React, { useMemo, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ForecastCard } from '@/components/ForecastCard';
import { HourlyForecast } from '@/components/HourlyForecast';
import { AppText as Text } from '@/components/ui/AppText';
import { AppBackground, GlassCard } from '@/components/ui';
import { WeatherTrendChart } from '@/components/WeatherTrendChart';
import { WeatherVideoBackground, weatherMediaFor } from '@/components/weather/WeatherVideoBackground';
import { useTheme } from '@/context/ThemeContext';
import { OmniLoader } from '@/components/ui/OmniLoader';
import { useCurrentWeather } from '@/hooks/useCurrentWeather';
import { fontFamily } from '@/theme/typography';
import { upcomingHourlyWeather, weatherConditionLabel } from '@/utils/weather';

export default function WeatherScreen({ navigation }: any) {
  const { height } = useWindowDimensions();
  const { theme } = useTheme();
  const weatherState = useCurrentWeather();
  const weather = weatherState.weather;
  const scrollY = useRef(new Animated.Value(0)).current;
  const isBusy = weatherState.status === 'loading' || weatherState.status === 'checking-permission';
  const upcoming = useMemo(() => upcomingHourlyWeather(weatherState.hourly, new Date(), 36), [weatherState.hourly]);
  const groups = useMemo(
    () => Array.from({ length: 6 }, (_, index) => upcoming.slice(index * 6, index * 6 + 6)).filter(group => group.length),
    [upcoming],
  );

  if (!weather) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background.base }]}>
        <AppBackground />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.fallbackNav}>
            <TouchableOpacity accessibilityLabel="Go back" style={styles.fallbackIconButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={theme.icon} />
            </TouchableOpacity>
            <Text style={[styles.fallbackTitle, { color: theme.content.primary }]}>Weather</Text>
            <View style={styles.fallbackIconButton} />
          </View>
          {weatherState.status === 'permission-required' ? (
            <View style={styles.center}>
              <GlassCard variant="solid" style={styles.stateCard} contentStyle={styles.stateContent}>
                <View style={[styles.stateIcon, { backgroundColor: theme.iconTile.blue }]}><Ionicons name="location-outline" size={26} color={theme.iconTile.foreground} /></View>
                <Text style={[styles.stateTitle, { color: theme.content.primary }]}>Weather needs your location</Text>
                <Text style={[styles.stateText, { color: theme.content.secondary }]}>Allow location access to show your local forecast and event weather warnings.</Text>
                <TouchableOpacity disabled={isBusy} style={[styles.enable, { backgroundColor: theme.accent.base }]} onPress={() => void weatherState.requestPermission()}>
                  <Text style={styles.enableText}>Enable location</Text>
                </TouchableOpacity>
              </GlassCard>
            </View>
          ) : isBusy ? (
            <View style={styles.center}><OmniLoader size="large" accessibilityLabel="Preparing forecast" /><Text style={[styles.loading, { color: theme.content.secondary }]}>Preparing your forecast…</Text></View>
          ) : (
            <View style={styles.center}>
              <GlassCard variant="solid" style={styles.stateCard} contentStyle={styles.stateContent}>
                <View style={[styles.stateIcon, { backgroundColor: theme.iconTile.cyan }]}><Ionicons name="cloud-offline-outline" size={26} color={theme.iconTile.foreground} /></View>
                <Text style={[styles.stateTitle, { color: theme.content.primary }]}>Forecast unavailable</Text>
                <Text style={[styles.stateText, { color: theme.content.secondary }]}>{weatherState.error || 'Check your connection and try again.'}</Text>
                <TouchableOpacity disabled={isBusy} style={[styles.enable, { backgroundColor: theme.accent.base }]} onPress={() => void weatherState.refresh()}>
                  <Text style={styles.enableText}>Try again</Text>
                </TouchableOpacity>
              </GlassCard>
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  const media = weatherMediaFor(weather);
  const overlayOpacity = scrollY.interpolate({ inputRange: [0, 160, 380], outputRange: [0, 0.72, 1], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 220], outputRange: [1, 0.38], extrapolate: 'clamp' });
  const heroTranslate = scrollY.interpolate({ inputRange: [0, 260], outputRange: [0, -34], extrapolate: 'clamp' });

  return (
    <View style={[styles.root, { backgroundColor: media.scrollGradient[2] }]}>
      <StatusBar style="light" backgroundColor={media.scrollGradient[0]} />
      <WeatherVideoBackground weather={weather} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(5,12,16,0.34)', 'rgba(5,12,16,0.03)', 'rgba(5,12,16,0.48)']}
        locations={[0, 0.47, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}>
        <LinearGradient colors={media.scrollGradient} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.nav}>
          <TouchableOpacity accessibilityLabel="Go back" style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={27} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.locationBlock}>
            <Text style={styles.locationTitle} numberOfLines={1}>{weatherState.locationLabel}</Text>
            <Text style={styles.locationSubtitle}>Live local weather</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Refresh weather" disabled={isBusy} style={[styles.iconButton, isBusy && styles.disabled]} onPress={() => void weatherState.refresh()}>
            {isBusy ? <OmniLoader size="small" onPrimary accessibilityLabel="Refreshing weather" /> : <Ionicons name="refresh" size={23} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.content, { paddingTop: Math.max(230, height * 0.31) }]}
        >
          <Animated.View style={[styles.heroIntro, { opacity: heroOpacity, transform: [{ translateY: heroTranslate }] }]}>
            <View style={styles.heroMain}>
              <Text style={styles.temperature}>{Math.round(weather.temperatureC)}°</Text>
              <View style={styles.conditionBlock}>
                <Text style={styles.description}>{weatherConditionLabel(weather.weatherCode)}</Text>
                <Text style={styles.feelsLike}>Feels like {Math.round(weather.apparentTemperatureC ?? weather.temperatureC)}° · Wind {Math.round(weather.windSpeedKmh)} km/h</Text>
              </View>
            </View>
            <Text style={styles.updated}>{weatherState.dataSource === 'cache' ? (weatherState.isStale ? 'Offline forecast' : 'Saved forecast') : 'Updated'} · {weather.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
          </Animated.View>

          <View style={[styles.panel, { backgroundColor: media.panel }]}>
            <View style={styles.panelHeader}>
              <View style={styles.panelTitleRow}><Ionicons name="time-outline" size={25} color="rgba(255,255,255,0.82)" /><Text style={styles.panelTitle}>Next 36 Hours</Text></View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastRow}>
              {groups.map((group, index) => <ForecastCard key={`${group[0].time.toISOString()}-${index}`} hours={group} inverse accent={media.accent} />)}
            </ScrollView>
            <View style={styles.chartWrap}><WeatherTrendChart hours={upcoming} inverse accent={media.accent} /></View>
            <View style={styles.divider} />
            <HourlyForecast hours={upcoming} inverse accent={media.accent} />
          </View>

          <View style={[styles.panel, styles.conditionsPanel, { backgroundColor: media.panelStrong }]}>
            <View style={styles.panelTitleRow}><Ionicons name="partly-sunny-outline" size={24} color="rgba(255,255,255,0.82)" /><Text style={styles.panelTitle}>Current Conditions</Text></View>
            <View style={styles.metrics}>
              <View style={styles.metric}><Ionicons name="water-outline" size={21} color={media.accent} /><Text style={styles.metricValue}>{Math.round(weather.humidityPercent ?? 0)}%</Text><Text style={styles.metricLabel}>Humidity</Text></View>
              <View style={styles.metric}><Ionicons name="rainy-outline" size={21} color={media.accent} /><Text style={styles.metricValue}>{Math.round(upcoming[0]?.precipitationProbability ?? 0)}%</Text><Text style={styles.metricLabel}>Rain chance</Text></View>
              <View style={styles.metric}><Ionicons name="navigate-outline" size={21} color={media.accent} /><Text style={styles.metricValue}>{Math.round(weather.windSpeedKmh)}</Text><Text style={styles.metricLabel}>km/h wind</Text></View>
            </View>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  nav: { zIndex: 2, minHeight: 68, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.48 },
  locationBlock: { flex: 1, paddingHorizontal: 8 },
  locationTitle: { color: '#FFFFFF', fontSize: 23, lineHeight: 28, fontFamily: fontFamily.extrabold, textShadowColor: 'rgba(0,0,0,0.28)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  locationSubtitle: { color: 'rgba(255,255,255,0.72)', marginTop: 1, fontSize: 11, fontFamily: fontFamily.semibold },
  content: { paddingHorizontal: 20, paddingBottom: 44, gap: 16 },
  heroIntro: { minHeight: 176, justifyContent: 'flex-end', paddingBottom: 8 },
  heroMain: { flexDirection: 'row', alignItems: 'flex-end' },
  temperature: { color: '#FFFFFF', fontSize: 104, lineHeight: 110, fontFamily: fontFamily.light, letterSpacing: -7, textShadowColor: 'rgba(0,0,0,0.22)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  conditionBlock: { flex: 1, paddingBottom: 18, paddingLeft: 14 },
  description: { color: '#FFFFFF', fontSize: 20, lineHeight: 25, fontFamily: fontFamily.bold },
  feelsLike: { color: 'rgba(255,255,255,0.74)', marginTop: 5, fontSize: 12, lineHeight: 17, fontFamily: fontFamily.semibold },
  updated: { color: 'rgba(255,255,255,0.70)', marginTop: -4, fontSize: 11, fontFamily: fontFamily.semibold },
  panel: { borderRadius: 25, padding: 16, overflow: 'hidden' },
  panelHeader: { minHeight: 42, justifyContent: 'center' },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelTitle: { color: 'rgba(255,255,255,0.84)', fontSize: 17, fontFamily: fontFamily.bold },
  forecastRow: { paddingVertical: 10 },
  chartWrap: { marginTop: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: 14 },
  conditionsPanel: { minHeight: 178, gap: 22 },
  metrics: { flexDirection: 'row' },
  metric: { flex: 1, minHeight: 86, alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.16)' },
  metricValue: { color: '#FFFFFF', marginTop: 5, fontSize: 18, fontFamily: fontFamily.extrabold },
  metricLabel: { color: 'rgba(255,255,255,0.66)', marginTop: 2, fontSize: 10, fontFamily: fontFamily.semibold },
  fallbackNav: { minHeight: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fallbackIconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  fallbackTitle: { fontSize: 18, fontFamily: fontFamily.extrabold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  stateCard: { width: '100%', maxWidth: 390 },
  stateContent: { padding: 24, alignItems: 'center' },
  stateIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { marginTop: 14, fontSize: 18, fontFamily: fontFamily.extrabold },
  stateText: { marginTop: 6, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  enable: { minHeight: 48, borderRadius: 24, paddingHorizontal: 22, marginTop: 18, alignItems: 'center', justifyContent: 'center' },
  enableText: { color: '#FFFFFF', fontFamily: fontFamily.black },
  loading: { marginTop: 12, fontSize: 13 },
});
