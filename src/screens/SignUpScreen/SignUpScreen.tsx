import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppBackground } from '@/components/ui';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { FloatingAuthField } from '@/components/auth/FloatingAuthField';
import { useAuth } from '@/context/AuthContext';
import { isGoogleAuthCancelled } from '@/services/GoogleAuthService';
import { useTheme } from '@/context/ThemeContext';
import { s } from './styles';

export default function SignUpScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const update = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setErrorMessage(null);
  };

  const handleCreate = async () => {
    if (loading || googleLoading) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) return setErrorMessage('Enter your full name.');
    if (!trimmedEmail) return setErrorMessage('Enter your email address.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setErrorMessage('Enter a valid email address.');
    if (password.length < 6) return setErrorMessage('Password must be at least 6 characters.');
    if (password !== confirm) return setErrorMessage('Passwords do not match.');

    try {
      setErrorMessage(null);
      setLoading(true);
      await signUp(trimmedName, trimmedEmail, password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleContinue = async () => {
    if (loading || googleLoading) return;
    try {
      setErrorMessage(null);
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (error) {
      if (!isGoogleAuthCancelled(error)) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to continue with Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <AppBackground />
      <View style={s.headerBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="chevron-back" size={23} color={theme.icon} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.content.primary }]}>Sign up</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.intro}>
          <Text style={[s.title, { color: theme.content.primary }]}>Create your account</Text>
          <Text style={[s.subtitle, { color: theme.content.secondary }]}>One account keeps your tasks, events, and focus sessions together.</Text>
        </View>
        
        <View style={[s.card, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}>
          <GoogleAuthButton
            testID="google-sign-up"
            loading={googleLoading}
            disabled={loading}
            onPress={handleGoogleContinue}
          />
         

          <View style={s.dividerRow}>
            <View style={[s.dividerLine, { backgroundColor: theme.divider }]} />
            <Text style={[s.dividerText, { color: theme.content.muted }]}>OR SIGN UP WITH EMAIL</Text>
            <View style={[s.dividerLine, { backgroundColor: theme.divider }]} />
          </View>

          <View style={s.fields}>
            <FloatingAuthField testID="sign-up-full-name" placeholder="John Doe" icon="person-outline"
              label="Full name"
              value={name}
              onChangeText={update(setName)}
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
            />
            <FloatingAuthField testID="sign-up-email-address" placeholder="name@example.com" icon="mail-outline"
              label="Email address"
              value={email}
              onChangeText={update(setEmail)}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <FloatingAuthField testID="sign-up-password" placeholder="••••••••" icon="lock-closed-outline"
              label="Password"
              value={password}
              onChangeText={update(setPassword)}
              secure
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
            />
            <FloatingAuthField testID="sign-up-confirm-password" placeholder="••••••••" icon="lock-closed-outline"
              label="Confirm password"
              value={confirm}
              onChangeText={update(setConfirm)}
              secure
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => void handleCreate()}
            />
          </View>

          {errorMessage ? (
            <View testID="sign-up-error" style={[s.errorNotice, { backgroundColor: theme.dark ? 'rgba(240,112,106,0.14)' : '#FFF0EE', borderColor: theme.dark ? 'rgba(240,112,106,0.32)' : 'transparent' }]}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.semantic.danger} />
              <Text style={[s.errorText, { color: theme.dark ? '#FFB4AF' : '#8F1D16' }]}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            testID="sign-up-submit"
            accessibilityRole="button"
            style={[s.btnPrimary, { backgroundColor: theme.accent.base }, (loading || googleLoading) && s.disabled]}
            onPress={() => void handleCreate()}
            activeOpacity={0.86}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <View style={s.loadingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={s.btnText}>Creating account...</Text>
              </View>
            ) : (
              <Text style={s.btnText}>Create account</Text>
            )}
          </TouchableOpacity>

          <Text style={[s.terms, { color: theme.content.muted }]}>By continuing, you agree to OmniTask's <Text style={[s.termsLink, { color: theme.accent.base }]}>Terms</Text> and <Text style={[s.termsLink, { color: theme.accent.base }]}>Privacy Policy</Text>.</Text>
        </View>

        <View style={s.signInRow}>
          <Text style={[s.gray, { color: theme.content.secondary }]}>Already have an account? </Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('SignIn')}>
            <Text style={[s.link, { color: theme.accent.base }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
