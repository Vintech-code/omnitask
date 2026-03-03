import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const BLUE = '#4A90D9';

export default function SignInScreen({ navigation }: any) {
  const { signIn, hasSeenOnboarding } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const trimEmail = email.trim();
    const trimPass = password.trim();
    if (!trimEmail) { Alert.alert('Validation', 'Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) { Alert.alert('Validation', 'Please enter a valid email address.'); return; }
    if (!trimPass) { Alert.alert('Validation', 'Please enter your password.'); return; }
    if (trimPass.length < 6) { Alert.alert('Validation', 'Password must be at least 6 characters.'); return; }
    try {
      setLoading(true);
      await signIn(trimEmail, trimPass);
      navigation.replace(hasSeenOnboarding ? 'Main' : 'Onboarding');
    } catch (e) {
      Alert.alert('Sign In Failed', 'Unable to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimEmail = email.trim();
    if (!trimEmail) {
      Alert.alert('Reset Password', 'Enter your email address first.');
      return;
    }
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('../config/firebase');
      await sendPasswordResetEmail(auth, trimEmail);
      Alert.alert('Email Sent', `A password reset link was sent to:\n${trimEmail}`);
    } catch {
      Alert.alert('Error', 'Could not send reset email. Check your email address and try again.');
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert(`${provider} Sign In`, `${provider} authentication is not available in this demo.`);
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header bar */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="chevron-back" size={22} color="#222" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sign In</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.sub}>
          Sign in to access your reminders and pomodoro sessions.
        </Text>

        {/* Email */}
        <View style={s.fieldBlock}>
          <Text style={s.label}>Email Address</Text>
          <View style={s.inputRow}>
            <Ionicons name="mail-outline" size={18} color="#AAA" style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="name@example.com"
              placeholderTextColor="#C0C0C0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* Password */}
        <View style={s.fieldBlock}>
          <View style={s.labelRow}>
            <Text style={s.label}>Password</Text>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={s.forgot}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <View style={s.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color="#AAA" style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#C0C0C0"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye' : 'eye-off'} size={18} color="#AAA" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Remember me */}
        <TouchableOpacity style={s.rememberRow} onPress={() => setRemember(!remember)} activeOpacity={0.8}>
          <View style={[s.checkbox, remember && s.checkboxChecked]}>
            {remember && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={s.rememberText}>Remember this device</Text>
        </TouchableOpacity>

        {/* Sign In button */}
        <TouchableOpacity style={s.btnPrimary} onPress={handleSignIn} activeOpacity={0.85} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={s.btnText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </>
          }
        </TouchableOpacity>

        {/* Divider */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>OR CONTINUE WITH</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={s.socialRow}>
          <TouchableOpacity style={s.socialBtn} activeOpacity={0.8} onPress={() => handleSocialLogin('Apple')}>
            <FontAwesome5 name="apple" size={18} color="#000" style={{ marginRight: 8 }} />
            <Text style={s.socialText}>Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.socialBtn} activeOpacity={0.8} onPress={() => handleSocialLogin('Google')}>
            <Ionicons name="logo-google" size={18} color="#DB4437" style={{ marginRight: 8 }} />
            <Text style={s.socialText}>Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.footerRow}>
          <Text style={s.gray}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={s.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  back: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  scroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 50 },

  title: { fontSize: 26, fontWeight: '800', color: '#111', marginBottom: 8 },
  sub: { fontSize: 14, color: '#888', lineHeight: 21, marginBottom: 28 },

  fieldBlock: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  forgot: { fontSize: 13, color: BLUE, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#222' },

  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCC',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BLUE, borderColor: BLUE },
  rememberText: { fontSize: 14, color: '#555' },

  btnPrimary: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 10, fontSize: 11, color: '#AAA', fontWeight: '600', letterSpacing: 0.8 },

  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  socialBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: { fontSize: 15, color: '#222', fontWeight: '600' },

  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  gray: { color: '#999', fontSize: 14 },
  link: { color: BLUE, fontWeight: '700', fontSize: 14 },
});
