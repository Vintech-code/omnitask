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
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { styles } from './styles';

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
          source={require('../../../assets/omnitasklogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>OmniTask</Text>
        <Text style={styles.tagline}>Your all-in-one productivity hub</Text>
      </Animated.View>

      {/* Balancing animation */}
      <Animated.View style={[styles.balancingContainer, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>
        <LottieView
          source={require('../../../assets/animation/balancing.json')}
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