import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Image,
  type ImageSourcePropType,
  StyleSheet,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';

import type { CurrentWeather } from '@/types/weather';

type WeatherMedia = {
  video: VideoSource;
  poster: ImageSourcePropType;
  scrollGradient: readonly [string, string, string];
  panel: string;
  panelStrong: string;
  accent: string;
};

const MEDIA = {
  clearDay: {
    video: require('../../../assets/weather/video/clear-day-loop.mp4'),
    poster: require('../../../assets/weather/video/clear-day-poster.png'),
    scrollGradient: ['#759FC0', '#527B99', '#354F63'],
    panel: 'rgba(48, 78, 99, 0.76)',
    panelStrong: 'rgba(45, 70, 87, 0.91)',
    accent: '#D6F1FF',
  },
  clearNight: {
    video: require('../../../assets/weather/video/clear-night-loop.mp4'),
    poster: require('../../../assets/weather/video/clear-night-poster.png'),
    scrollGradient: ['#294B67', '#19364D', '#10283A'],
    panel: 'rgba(22, 48, 67, 0.78)',
    panelStrong: 'rgba(17, 39, 55, 0.92)',
    accent: '#FFC878',
  },
  cloudy: {
    video: require('../../../assets/weather/video/cloudy-loop.mp4'),
    poster: require('../../../assets/weather/video/cloudy-poster.png'),
    scrollGradient: ['#728EA3', '#587488', '#405D70'],
    panel: 'rgba(62, 88, 106, 0.76)',
    panelStrong: 'rgba(55, 78, 94, 0.92)',
    accent: '#D8ECF7',
  },
  rainDay: {
    video: require('../../../assets/weather/video/rain-day-loop.mp4'),
    poster: require('../../../assets/weather/video/rain-day-poster.png'),
    scrollGradient: ['#62776F', '#485E59', '#314743'],
    panel: 'rgba(54, 75, 70, 0.78)',
    panelStrong: 'rgba(46, 65, 61, 0.93)',
    accent: '#BDEBF5',
  },
  rainNight: {
    video: require('../../../assets/weather/video/rain-night-loop.mp4'),
    poster: require('../../../assets/weather/video/rain-night-poster.png'),
    scrollGradient: ['#23444A', '#153238', '#0D242A'],
    panel: 'rgba(15, 45, 50, 0.80)',
    panelStrong: 'rgba(10, 34, 39, 0.94)',
    accent: '#94DEEC',
  },
  storm: {
    video: require('../../../assets/weather/video/storm-loop.mp4'),
    poster: require('../../../assets/weather/video/storm-poster.png'),
    scrollGradient: ['#526979', '#374E60', '#263948'],
    panel: 'rgba(41, 61, 76, 0.80)',
    panelStrong: 'rgba(32, 49, 62, 0.94)',
    accent: '#D6D9FF',
  },
} satisfies Record<string, WeatherMedia>;

export function weatherMediaFor(weather: CurrentWeather): WeatherMedia {
  const code = weather.weatherCode;
  if ([95, 96, 99].includes(code)) return MEDIA.storm;
  if (code === 0 || code === 1) return weather.isDay ? MEDIA.clearDay : MEDIA.clearNight;
  if (code === 2 || code === 3 || code === 45 || code === 48) return MEDIA.cloudy;
  return weather.isDay ? MEDIA.rainDay : MEDIA.rainNight;
}

export function WeatherVideoBackground({ weather }: { weather: CurrentWeather }) {
  const media = weatherMediaFor(weather);
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const player = useVideoPlayer(reduceMotion ? null : media.video, instance => {
    instance.loop = true;
    instance.muted = true;
    instance.volume = 0;
  });

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const motionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const appSubscription = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    return () => {
      motionSubscription.remove();
      appSubscription.remove();
    };
  }, []);

  useEffect(() => {
    setFirstFrameReady(false);
  }, [media.video]);

  useEffect(() => {
    player.loop = true;
    player.muted = true;
    player.volume = 0;
    if (isFocused && appActive && !reduceMotion) player.play();
    else player.pause();
  }, [appActive, isFocused, player, reduceMotion]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={media.poster} resizeMode="cover" style={StyleSheet.absoluteFill} />
      {!reduceMotion ? (
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="cover"
          surfaceType="textureView"
          onFirstFrameRender={() => setFirstFrameReady(true)}
          style={[StyleSheet.absoluteFill, !firstFrameReady && styles.hidden]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
});
