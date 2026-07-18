import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppBackground } from '@/components/ui';
import { FloatingAuthField } from '@/components/auth/FloatingAuthField';
import { useTheme } from '@/context/ThemeContext';
import { requestPasswordResetEmail } from '@/services/EmailService';
import { isValidEmail, normalizeEmail } from '@/utils/validators';

const friendlyError = (error: unknown): string => {
  const code = (error as { code?: string })?.code ?? '';
  if (code.includes('resource-exhausted')) return 'Too many requests. Please wait before trying again.';
  if (code.includes('unavailable') || code.includes('network')) return 'Unable to connect. Check your internet connection and try again.';
  return 'We could not send the reset email right now. Please try again.';
};

export default function ForgotPasswordScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (loading) return;
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await requestPasswordResetEmail(normalizeEmail(email));
      setSent(true);
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppBackground />
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={23} color={theme.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.content.primary }]}>Reset password</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.accent.soft }]}>
            <Ionicons name={sent ? 'mail-open-outline' : 'key-outline'} size={30} color={theme.accent.base} />
          </View>

          {sent ? (
            <>
              <Text style={[styles.title, { color: theme.content.primary }]}>Check your inbox</Text>
              <Text style={[styles.copy, { color: theme.content.secondary }]}>If an OmniTask password account exists for {normalizeEmail(email)}, we sent a secure reset link. Check spam if it does not arrive shortly.</Text>
              <TouchableOpacity style={[styles.primary, { backgroundColor: theme.accent.base }]} onPress={() => navigation.navigate('SignIn')}>
                <Text style={styles.primaryText}>Back to sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={() => setSent(false)}>
                <Text style={[styles.secondaryText, { color: theme.accent.base }]}>Use a different email</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: theme.content.primary }]}>Forgot your password?</Text>
              <Text style={[styles.copy, { color: theme.content.secondary }]}>Enter the email used for your OmniTask password account. We will send a secure reset link.</Text>
              <FloatingAuthField
                testID="forgot-password-email"
                label="Email address"
                placeholder="name@example.com"
                icon="mail-outline"
                keyboardType="email-address"
                value={email}
                onChangeText={value => { setEmail(value); setError(null); }}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={() => void submit()}
              />
              {error ? (
                <View style={[styles.notice, { backgroundColor: theme.dark ? 'rgba(240,112,106,0.14)' : '#FFF0EE' }]}>
                  <Ionicons name="alert-circle-outline" size={18} color={theme.semantic.danger} />
                  <Text style={[styles.noticeText, { color: theme.dark ? '#FFB4AF' : '#8F1D16' }]}>{error}</Text>
                </View>
              ) : null}
              <TouchableOpacity testID="forgot-password-submit" disabled={loading} style={[styles.primary, { backgroundColor: theme.accent.base }, loading && styles.disabled]} onPress={() => void submit()}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Send reset email</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  content: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 52 },
  card: { width: '100%', padding: 20, borderRadius: 24, borderWidth: 1 },
  iconCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 25, lineHeight: 31, fontWeight: '900', marginBottom: 8 },
  copy: { fontSize: 14, lineHeight: 21, marginBottom: 22 },
  primary: { width: '100%', height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondaryText: { fontSize: 14, fontWeight: '800' },
  notice: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 11, marginTop: 14 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  disabled: { opacity: 0.55 },
});
