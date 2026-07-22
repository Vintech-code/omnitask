import React, { useState, useRef } from 'react';
import { View, Image, ActivityIndicator, Alert, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import type { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  openNotificationSettings,
  requestNotificationPermissionState,
} from '@/services/NotificationService';
import type { RootStackParamList } from '@/types/navigation';
import { s } from './styles';
import { AppBackground } from '@/components/ui';

const { width: W } = Dimensions.get('window');

// ─── Step data ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'Welcome to OmniTask',
    subtitle: 'Your all-in-one productivity companion.\nEverything you need, in one place.',
  },
  {
    title: 'Everything You Need',
    subtitle: 'Built with four powerful tools to help you stay focused and on top of every task.',
  },
  {
    title: 'Never Miss a Thing',
    subtitle: 'Allow notifications so OmniTask can remind you of alarms, events, and deadlines on time.',
  },
];

const FEATURES = [
  { anim: require('../../../assets/animation/timer.json'),    label: 'Pomodoro Timer',  desc: 'Timed work sessions & smart breaks',  color: '#4A90D9', bg: '#EBF2FF' },
  { anim: require('../../../assets/animation/clock.json'),    label: 'Smart Alarms',    desc: 'Event-linked alarms so you never miss', color: '#E05252', bg: '#FDECEA' },
  { anim: require('../../../assets/animation/calendar.json'), label: 'Event Calendar',  desc: 'Schedule, track & sync your events',  color: '#3DAE7C', bg: '#E6F9F1' },
  { anim: require('../../../assets/animation/notes.json'),    label: 'To-do & Notes',   desc: 'Tasks & notes with color-coded org',  color: '#9C6FDE', bg: '#F3EDFF' },
];

// ─── Component ───────────────────────────────────────────────────────────────
type Props = StackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const { markOnboardingSeen } = useAuth();
  const { theme } = useTheme();
  const [step, setStep] = useState(0);
  const [notifGranted, setNotifGranted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState<string | null>(null);

  // Slide animation
  const slideX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateToStep = (next: number) => {
    const direction = next > step ? -W : W;
    // Fade + slide out
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideX,   { toValue: direction * 0.15, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideX.setValue(-direction * 0.15);
      // Fade + slide in
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideX,   { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const finishOnboarding = async () => {
    await markOnboardingSeen();
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const handleNext = async () => {
    if (isSubmitting) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step < 2) {
      animateToStep(step + 1);
      return;
    }

    setIsSubmitting(true);
    setNotificationFeedback(null);

    try {
      if (!notifGranted) {
        const permission = await requestNotificationPermissionState();
        if (!permission.granted) {
          setNotificationFeedback(permission.canAskAgain
            ? 'Notifications were not enabled. Try again, or choose Maybe later to continue without reminders.'
            : 'Notifications are off. Open your device settings to enable reminders, or choose Maybe later.');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

          if (!permission.canAskAgain) {
            Alert.alert(
              'Notifications are off',
              'Enable notifications for OmniTask in device settings, then return and tap the button again.',
              [
                { text: 'Not now', style: 'cancel' },
                {
                  text: 'Open settings',
                  onPress: () => {
                    void openNotificationSettings().catch(() => {
                      setNotificationFeedback('Unable to open settings. Open OmniTask in your device settings to allow notifications.');
                    });
                  },
                },
              ],
            );
          }
          return;
        }
        setNotifGranted(true);
      }

      await finishOnboarding();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setNotificationFeedback(
        error instanceof Error
          ? error.message
          : 'Unable to enable notifications right now. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isSubmitting) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSubmitting(true);
    setNotificationFeedback(null);

    try {
      await finishOnboarding();
    } catch (error) {
      setNotificationFeedback(
        error instanceof Error
          ? error.message
          : 'Unable to finish onboarding right now. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const current = STEPS[step];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: 'transparent' }]}>
      <AppBackground />
      {/* Skip button */}
      {step < 2 && (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={isSubmitting}
          style={s.skip}
          onPress={handleSkip}
        >
          <Text style={[s.skipText, { color: theme.accent.base }]}>Skip</Text>
        </TouchableOpacity>
      )}

      <Animated.View
        style={[s.content, { opacity: fadeAnim, transform: [{ translateX: slideX }] }]}
      >
        {/* ── Step 1: Logo ── */}
        {step === 0 && (
          <View style={s.illustrationBox}>
            <View style={[s.logoBg, { backgroundColor: theme.glass.primary }]}>
              <Image
                source={require('../../../assets/omnitasklogo.png')}
                style={{ width: 90, height: 90 }}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* ── Step 2: Feature grid with Lottie icons ── */}
        {step === 1 && (
          <View style={s.featureGrid}>
            {FEATURES.map(f => (
              <View
                key={f.label}
                style={[s.featureCard, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}
              >
                <View style={[s.featureIconBox, { backgroundColor: f.bg }]}>
                  <LottieView
                    source={f.anim}
                    autoPlay
                    loop
                    style={s.featureLottie}
                  />
                </View>
                <Text style={[s.featureLabel, { color: theme.content.primary }]}>{f.label}</Text>
                <Text style={[s.featureDesc, { color: theme.content.secondary }]}>{f.desc}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Step 3: Notifications ── */}
        {step === 2 && (
          <View style={s.illustrationBox}>
            <LottieView
              source={require('../../../assets/animation/todo.json')}
              autoPlay
              loop
              style={s.notifAnim}
            />
          </View>
        )}

        <Text style={[s.title, { color: theme.content.primary }]}>{current.title}</Text>
        <Text style={[s.subtitle, { color: theme.content.secondary }]}>{current.subtitle}</Text>
        {step === 2 && notificationFeedback && (
          <View
            accessibilityLiveRegion="polite"
            style={[s.feedback, { backgroundColor: theme.accent.soft, borderColor: theme.glass.border }]}
          >
            <Ionicons name="information-circle-outline" size={19} color={theme.accent.base} />
            <Text style={[s.feedbackText, { color: theme.content.secondary }]}>
              {notificationFeedback}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* ── Dots ── */}
      <View style={s.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              { backgroundColor: i === step ? theme.accent.base : theme.divider },
              i === step && s.dotActive,
            ]}
          />
        ))}
      </View>

      {/* ── CTA button ── */}
      <View style={s.footer}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={step === 2 ? 'Enable notifications' : undefined}
          accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
          testID="onboarding-primary-action"
          disabled={isSubmitting}
          style={[s.btn, { backgroundColor: theme.accent.base }, isSubmitting && s.btnDisabled]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          {isSubmitting && <ActivityIndicator size="small" color="#FFFDF8" />}
          <Text style={s.btnText}>
            {isSubmitting ? (step === 2 ? 'Enabling…' : 'Please wait…')
             : step === 0 ? 'Get Started'
             : step === 1 ? 'Next'
             : notifGranted ? 'Continue' : 'Enable Notifications'}
          </Text>
          {!isSubmitting && (
            <Ionicons name="arrow-forward" size={18} color="#FFFDF8" style={s.btnIcon} />
          )}
        </TouchableOpacity>

        {step === 2 && (
          <TouchableOpacity
            accessibilityRole="button"
            disabled={isSubmitting}
            style={s.skipNotif}
            onPress={handleSkip}
          >
            <Text style={[s.skipNotifText, { color: theme.accent.base }]}>Maybe Later</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
