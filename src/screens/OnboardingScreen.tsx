import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { requestNotificationPermission } from '../services/NotificationService';

const { width: W } = Dimensions.get('window');
const BLUE = '#4A90D9';

// ─── Step data ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: null, // uses logo image
    title: 'Welcome to OmniTask',
    subtitle: 'Your all-in-one productivity companion.\nEverything you need, in one place.',
    bg: '#EBF4FF',
    accent: BLUE,
  },
  {
    icon: null, // uses a feature grid
    title: 'Everything You Need',
    subtitle: 'Built with four powerful tools to help you stay focused and on top of every task.',
    bg: '#F0FDF4',
    accent: '#3DAE7C',
  },
  {
    icon: 'notifications-outline',
    title: 'Never Miss a Thing',
    subtitle: 'Allow notifications so OmniTask can remind you of alarms, events, and deadlines on time.',
    bg: '#FFF8F0',
    accent: '#F59E0B',
  },
];

const FEATURES = [
  { icon: 'timer-outline',         label: 'Pomodoro Timer',   color: '#4A90D9', bg: '#EBF2FF' },
  { icon: 'alarm-outline',         label: 'Smart Alarms',     color: '#E05252', bg: '#FDECEA' },
  { icon: 'calendar-outline',      label: 'Event Calendar',   color: '#3DAE7C', bg: '#E6F9F1' },
  { icon: 'checkmark-done-outline', label: 'Tasks & Notes',   color: '#9C6FDE', bg: '#F3EDFF' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function OnboardingScreen({ navigation }: any) {
  const { markOnboardingSeen } = useAuth();
  const [step, setStep] = useState(0);
  const [notifGranted, setNotifGranted] = useState(false);

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

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 2) {
      // Final step — request permission, then enter app
      if (!notifGranted) {
        const granted = await requestNotificationPermission();
        setNotifGranted(granted);
      }
      await markOnboardingSeen();
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      animateToStep(step + 1);
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markOnboardingSeen();
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const current = STEPS[step];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: current.bg }]}>
      {/* Skip button */}
      {step < 2 && (
        <TouchableOpacity style={s.skip} onPress={handleSkip}>
          <Text style={[s.skipText, { color: current.accent }]}>Skip</Text>
        </TouchableOpacity>
      )}

      <Animated.View
        style={[s.content, { opacity: fadeAnim, transform: [{ translateX: slideX }] }]}
      >
        {/* ── Step 1: Logo ── */}
        {step === 0 && (
          <View style={s.illustrationBox}>
            <View style={[s.logoBg, { backgroundColor: '#fff', shadowColor: current.accent }]}>
              <Image
                source={require('../../assets/omnitasklogo.png')}
                style={{ width: 90, height: 90 }}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* ── Step 2: Feature grid ── */}
        {step === 1 && (
          <View style={s.featureGrid}>
            {FEATURES.map(f => (
              <View key={f.label} style={[s.featureCard, { backgroundColor: '#fff' }]}>
                <View style={[s.featureIconBox, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon as any} size={28} color={f.color} />
                </View>
                <Text style={[s.featureLabel, { color: '#222' }]}>{f.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Step 3: Notifications ── */}
        {step === 2 && (
          <View style={s.illustrationBox}>
            <View style={[s.logoBg, { backgroundColor: '#fff', shadowColor: current.accent }]}>
              <Ionicons name="notifications" size={70} color={current.accent} />
            </View>
          </View>
        )}

        <Text style={[s.title, { color: '#111' }]}>{current.title}</Text>
        <Text style={[s.subtitle, { color: '#555' }]}>{current.subtitle}</Text>
      </Animated.View>

      {/* ── Dots ── */}
      <View style={s.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              { backgroundColor: i === step ? current.accent : '#ccc' },
              i === step && s.dotActive,
            ]}
          />
        ))}
      </View>

      {/* ── CTA button ── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: current.accent }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>
            {step === 0 ? 'Get Started'
             : step === 1 ? 'Next'
             : 'Enable Notifications'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {step === 2 && (
          <TouchableOpacity style={s.skipNotif} onPress={handleSkip}>
            <Text style={[s.skipNotifText, { color: current.accent }]}>Maybe Later</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  skip: { alignSelf: 'flex-end', paddingHorizontal: 22, paddingTop: 8 },
  skipText: { fontSize: 15, fontWeight: '600' },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  illustrationBox: { marginBottom: 40, alignItems: 'center' },
  logoBg: {
    width: 160, height: 160, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },

  featureGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 14, justifyContent: 'center',
    marginBottom: 36,
    width: W - 64,
  },
  featureCard: {
    width: (W - 64 - 14) / 2,
    borderRadius: 18, padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  featureIconBox: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 14, lineHeight: 34 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 23 },

  dots: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24, borderRadius: 4 },

  footer: { width: '100%', paddingHorizontal: 28, gap: 12 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  btnText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  skipNotif: { alignItems: 'center', paddingVertical: 6 },
  skipNotifText: { fontSize: 14, fontWeight: '600' },
});
