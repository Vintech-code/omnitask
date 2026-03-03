import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

const BLUE = '#4A90D9';
const { height: SCREEN_H } = Dimensions.get('window');

const FEATURES = [
  {
    icon: 'timer-outline' as const,
    color: '#4A90D9',
    bg: '#EBF2FF',
    label: 'Pomodoro Timer',
    desc: 'Stay focused with timed work sessions & smart breaks.',
  },
  {
    icon: 'notifications-outline' as const,
    color: '#E05252',
    bg: '#FDECEA',
    label: 'Smart Alarms',
    desc: 'Event-linked alarms so you never miss what matters.',
  },
  {
    icon: 'calendar-outline' as const,
    color: '#52B788',
    bg: '#E6F9F1',
    label: 'Event Calendar',
    desc: 'Schedule, track, and sync all your important events.',
  },
  {
    icon: 'checkbox-outline' as const,
    color: '#9C6FDE',
    bg: '#F3EDFF',
    label: 'To-do & Notes',
    desc: 'Manage tasks and notes with color-coded organization.',
  },
];

export default function WelcomeScreen({ navigation }: any) {
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(contentY, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top hero */}
      <Animated.View style={[styles.hero, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image
          source={require('../../assets/omnitasklogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>OmniTask</Text>
        <Text style={styles.tagline}>Your all-in-one productivity hub</Text>
      </Animated.View>

      {/* Balancing animation */}
      <Animated.View style={[styles.balancingContainer, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>
        <LottieView
          source={require('../../assets/animation/balancing.json')}
          autoPlay
          loop
          style={styles.balancingAnim}
        />
      </Animated.View>

      {/* CTA buttons */}
      <Animated.View style={[styles.ctaBlock, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('SignUp')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Get Started! It's Free</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('SignIn')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnSecondaryText}>I already have an account</Text>
        </TouchableOpacity>

        {/* Social divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={() => Alert.alert('Apple Sign In', 'Apple authentication is not available in this demo.')}>
            <FontAwesome5 name="apple" size={17} color="#000" />
            <Text style={styles.socialText}>Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={() => Alert.alert('Google Sign In', 'Google authentication is not available in this demo.')}>
            <Ionicons name="logo-google" size={17} color="#DB4437" />
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          By continuing you agree to our <Text style={{ color: BLUE }}>Terms</Text> & <Text style={{ color: BLUE }}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAFBFF',
  },

  /* Hero */
  hero: {
    alignItems: 'center',
    paddingTop: SCREEN_H < 700 ? 24 : 40,
    paddingBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 14,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
  },

  /* Balancing animation */
  balancingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balancingAnim: {
    width: 280,
    height: 220,
  },

  /* CTA block */
  ctaBlock: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 16,
  },
  btnPrimary: {
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: '#DDE2EE',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#444',
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E9F0' },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: '#AAA',
    fontWeight: '700',
    letterSpacing: 1,
  },

  /* Social */
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  socialBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDE2EE',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  socialText: { fontSize: 15, color: '#222', fontWeight: '700' },

  /* Terms */
  terms: {
    textAlign: 'center',
    fontSize: 11,
    color: '#BBB',
    lineHeight: 17,
  },
});
