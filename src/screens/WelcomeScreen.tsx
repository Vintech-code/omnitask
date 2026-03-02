import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const BLUE = '#4A90D9';

const FeatureCard = ({
  icon,
  label,
  desc,
  bg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  bg: string;
  iconColor: string;
}) => (
  <View style={[styles.card, { backgroundColor: bg }]}>
    <View style={styles.cardIcon}>{icon}</View>
    <Text style={styles.cardLabel}>{label}</Text>
    <Text style={styles.cardDesc}>{desc}</Text>
  </View>
);

export default function WelcomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Ionicons name="flash" size={36} color="#fff" />
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>Master Your Time</Text>
        <Text style={styles.sub}>
          Precision reminders, focused{'\n'}work, and smart organization in{'\n'}one app.
        </Text>

        {/* Feature Grid */}
        <View style={styles.grid}>
          <FeatureCard
            bg="#EBF2FF"
            iconColor="#6B8FD6"
            icon={<Ionicons name="timer-outline" size={28} color="#6B8FD6" />}
            label="Pomodoro"
            desc="Focus sessions with smart breaks."
          />
          <FeatureCard
            bg="#FDECEA"
            iconColor="#D97B6C"
            icon={<Ionicons name="notifications-outline" size={28} color="#D97B6C" />}
            label="Alarms"
            desc="Never miss a critical wake-up call."
          />
          <FeatureCard
            bg="#E6F9F1"
            iconColor="#5BAD8F"
            icon={<Ionicons name="checkbox-outline" size={28} color="#5BAD8F" />}
            label="To-do List"
            desc="Track tasks with daily priorities."
          />
          <FeatureCard
            bg="#FEF9E7"
            iconColor="#D4A017"
            icon={<MaterialCommunityIcons name="star-four-points-outline" size={28} color="#D4A017" />}
            label="Smart AI"
            desc="AI suggested schedules & tips."
          />
        </View>

        {/* Get Started */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('SignUp')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Get Started</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Buttons */}
        <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={() => Alert.alert('Apple Sign In', 'Apple authentication is not available in this demo.')}>
          <FontAwesome5 name="apple" size={20} color="#000" style={styles.socialIcon} />
          <Text style={styles.socialText}>Continue with Apple</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={() => Alert.alert('Google Sign In', 'Google authentication is not available in this demo.')}>
          <Ionicons name="phone-portrait-outline" size={20} color="#555" style={styles.socialIcon} />
          <Text style={styles.socialText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <Text style={styles.footerGray}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footerLinks}>
          <Text style={styles.footerGray}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, alignItems: 'center' },

  /* Logo */
  logoWrap: { marginBottom: 20 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Headline */
  headline: { fontSize: 26, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 10 },
  sub: { fontSize: 15, color: '#777', textAlign: 'center', lineHeight: 22, marginBottom: 30 },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 28,
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  cardIcon: { marginBottom: 10 },
  cardLabel: { fontSize: 14, fontWeight: '700', color: '#222', textAlign: 'center', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 17 },

  /* Primary Button */
  btnPrimary: {
    width: '100%',
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 24,
  },
  btnPrimaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  /* Divider */
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 10, fontSize: 11, color: '#AAA', fontWeight: '600', letterSpacing: 0.8 },

  /* Social */
  socialBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  socialIcon: { marginRight: 10 },
  socialText: { fontSize: 15, color: '#222', fontWeight: '600' },

  /* Footer */
  footerLinks: { flexDirection: 'row', marginTop: 6 },
  footerGray: { color: '#999', fontSize: 14 },
  footerLink: { color: BLUE, fontWeight: '700', fontSize: 14 },
});
