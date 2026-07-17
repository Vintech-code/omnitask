import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { StackScreenProps } from '@react-navigation/stack';
import styles from './styles';
import { AppBackground, GlassCard } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { getAlarmSound } from '@/services/AlarmSounds';
import {
  dismissAlarmNotification,
  snoozeAlarmNotification,
} from '@/services/NotificationService';
import type { RootStackParamList } from '@/types/navigation';

type Props = StackScreenProps<RootStackParamList, 'RingingAlarm'>;

export default function RingingAlarmScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const payload = route.params;
  const playerRef = useRef<AudioPlayer | null>(null);
  const [busy, setBusy] = useState(false);

  const stopPlayback = useCallback(() => {
    Vibration.cancel();
    const player = playerRef.current;
    playerRef.current = null;
    if (!player) return;
    try {
      player.pause();
      player.remove();
    } catch {}
  }, []);

  useEffect(() => {
    let disposed = false;
    const start = async () => {
      await dismissAlarmNotification(payload.notificationIdentifier);
      const source = getAlarmSound(payload.sound)?.asset
        ?? getAlarmSound('Marimba Ringtone')?.asset;
      if (!source || disposed) return;
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        if (disposed) return;
        const player = createAudioPlayer(source, { keepAudioSessionActive: true });
        player.loop = true;
        playerRef.current = player;
        player.play();
        if (payload.vibrate) Vibration.vibrate([0, 500, 400, 500, 800], true);
      } catch {}
    };
    void start();
    return () => {
      disposed = true;
      stopPlayback();
    };
  }, [payload.notificationIdentifier, payload.sound, payload.vibrate, stopPlayback]);

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Main');
  };

  const stop = async () => {
    if (busy) return;
    setBusy(true);
    stopPlayback();
    await dismissAlarmNotification(payload.notificationIdentifier);
    close();
  };

  const snooze = async () => {
    if (busy) return;
    setBusy(true);
    stopPlayback();
    try {
      await snoozeAlarmNotification(payload);
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background.base }]}>
      <AppBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.heading}>
          <View style={[styles.icon, { backgroundColor: theme.accent.soft }]}>
            <Ionicons name="alarm" size={28} color={theme.accent.base} />
          </View>
          <Text style={[styles.eyebrow, { color: theme.content.secondary }]}>ALARM</Text>
        </View>

        <View style={styles.center}>
          <Text accessibilityRole="header" style={[styles.time, { color: theme.content.primary }]}>
            {payload.time}
          </Text>
          <Text style={[styles.label, { color: theme.content.secondary }]}>
            {payload.label || 'Alarm'}
          </Text>
        </View>

        <GlassCard variant="standard" padding={12} style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Snooze for ${payload.snoozeMinutes} minutes`}
            disabled={busy}
            onPress={snooze}
            style={({ pressed }) => [
              styles.snoozeButton,
              { borderColor: theme.divider, opacity: pressed || busy ? 0.65 : 1 },
            ]}
          >
            <Ionicons name="timer-outline" size={22} color={theme.content.primary} />
            <Text style={[styles.snoozeText, { color: theme.content.primary }]}>
              Snooze {payload.snoozeMinutes} min
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop alarm"
            disabled={busy}
            onPress={stop}
            style={({ pressed }) => [
              styles.stopButton,
              { backgroundColor: theme.accent.base, opacity: pressed || busy ? 0.76 : 1 },
            ]}
          >
            <Ionicons name="stop" size={25} color="#FFFFFF" />
            <Text style={styles.stopText}>Stop alarm</Text>
          </Pressable>
        </GlassCard>
      </SafeAreaView>
    </View>
  );
}
