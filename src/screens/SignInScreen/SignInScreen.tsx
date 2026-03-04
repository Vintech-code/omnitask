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
import { useAuth } from '@/context/AuthContext';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { s } from './styles';


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
      const { auth } = await import('@/config/firebase');
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