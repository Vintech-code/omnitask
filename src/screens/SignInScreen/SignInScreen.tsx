import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { s } from './styles';
import { AppBackground } from '@/components/ui';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { FloatingAuthField } from '@/components/auth/FloatingAuthField';
import { isGoogleAuthCancelled } from '@/services/GoogleAuthService';
import { useTheme } from '@/context/ThemeContext';


export default function SignInScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { signIn, signInWithGoogle, hasSeenOnboarding } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (loading) return;
    const trimEmail = email.trim();
    if (!trimEmail) { Alert.alert('Validation', 'Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) { Alert.alert('Validation', 'Please enter a valid email address.'); return; }
    if (!password) { Alert.alert('Validation', 'Please enter your password.'); return; }
    if (password.length < 6) { Alert.alert('Validation', 'Password must be at least 6 characters.'); return; }
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      setErrorMessage(null);
      setSlowConnection(false);
      setLoading(true);
      slowTimer = setTimeout(() => setSlowConnection(true), 3500);
      await signIn(trimEmail, password);
      navigation.replace(hasSeenOnboarding ? 'Main' : 'Onboarding');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      if (slowTimer) clearTimeout(slowTimer);
      setSlowConnection(false);
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

  const handleGoogleSignIn = async () => {
    if (loading || googleLoading) return;
    try {
      setErrorMessage(null);
      setGoogleLoading(true);
      await signInWithGoogle();
      navigation.replace(hasSeenOnboarding ? 'Main' : 'Onboarding');
    } catch (error) {
      if (!isGoogleAuthCancelled(error)) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in with Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <AppBackground />
      {/* Header bar */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="chevron-back" size={22} color={theme.icon} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.content.primary }]}>Sign In</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={[s.title, { color: theme.content.primary }]}>Welcome back</Text>
        <Text style={[s.sub, { color: theme.content.secondary }]}>
          Sign in to access your reminders and pomodoro sessions.
        </Text>

        <View style={s.fields}>
          <FloatingAuthField
            testID="sign-in-email"
            label="Email address"
            placeholder="name@example.com"
            icon="mail-outline"
            keyboardType="email-address"
            value={email}
            onChangeText={value => { setEmail(value); setErrorMessage(null); }}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <FloatingAuthField
            testID="sign-in-password"
            label="Password"
            placeholder="••••••••"
            icon="lock-closed-outline"
            secure
            value={password}
            onChangeText={value => { setPassword(value); setErrorMessage(null); }}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => void handleSignIn()}
          />
          <TouchableOpacity accessibilityRole="button" style={s.forgotButton} onPress={handleForgotPassword}>
            <Text style={[s.forgot, { color: theme.accent.base }]}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In button */}
        <TouchableOpacity testID="sign-in-submit" style={[s.btnPrimary, { backgroundColor: theme.accent.base }, loading && s.btnDisabled]} onPress={handleSignIn} activeOpacity={0.85} disabled={loading}>
          {loading
            ? <View style={s.loadingContent}><ActivityIndicator color="#fff" /><Text style={s.btnText}>Signing in...</Text></View>
            : <>
                <Text style={s.btnText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </>
          }
        </TouchableOpacity>
        {slowConnection ? (
          <View style={[s.connectionNotice, { backgroundColor: theme.dark ? 'rgba(240,174,61,0.14)' : '#FFF8E1', borderColor: theme.dark ? 'rgba(240,174,61,0.32)' : 'transparent' }]}>
            <Ionicons name="cloud-offline-outline" size={17} color={theme.semantic.warning} />
            <Text style={[s.connectionNoticeText, { color: theme.dark ? '#FFD28A' : '#7A5200' }]}>Still connecting to Firebase. Check Wi-Fi or mobile data.</Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View testID="sign-in-error" style={[s.errorNotice, { backgroundColor: theme.dark ? 'rgba(240,112,106,0.14)' : '#FFEBEE', borderColor: theme.dark ? 'rgba(240,112,106,0.32)' : 'transparent' }]}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.semantic.danger} />
            <Text style={[s.errorNoticeText, { color: theme.dark ? '#FFB4AF' : '#9A1B1B' }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Divider */}
        <View style={s.dividerRow}>
          <View style={[s.dividerLine, { backgroundColor: theme.divider }]} />
          <Text style={[s.dividerText, { color: theme.content.muted }]}>OR CONTINUE WITH</Text>
          <View style={[s.dividerLine, { backgroundColor: theme.divider }]} />
        </View>

        <View style={s.googleButtonWrap}>
          <GoogleAuthButton
            testID="google-sign-in"
            loading={googleLoading}
            disabled={loading}
            onPress={handleGoogleSignIn}
          />
        </View>

        {/* Footer */}
        <View style={s.footerRow}>
          <Text style={[s.gray, { color: theme.content.secondary }]}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={[s.link, { color: theme.accent.base }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
