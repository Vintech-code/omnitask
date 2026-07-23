import { fontFamily } from '@/theme/typography';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppBackground } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { OmniLoader } from '@/components/ui/OmniLoader';
import { requestVerificationEmail } from '@/services/EmailService';

const INITIAL_COOLDOWN = 60;

export default function EmailVerificationScreen() {
  const { user, signOut, refreshEmailVerification, verificationEmailStatus } = useAuth();
  const { theme } = useTheme();
  const [cooldown, setCooldown] = useState(verificationEmailStatus === 'sent' ? INITIAL_COOLDOWN : 0);
  const [action, setAction] = useState<'resend' | 'refresh' | 'logout' | null>(null);
  const [message, setMessage] = useState<string | null>(verificationEmailStatus === 'sent' ? 'Verification email sent. Check your inbox and spam folder.' : null);
  const [error, setError] = useState<string | null>(verificationEmailStatus === 'failed' ? 'Your account was created, but the first email could not be delivered. Tap resend to try again.' : null);

  useEffect(() => {
    if (verificationEmailStatus === 'sent') {
      setCooldown(value => Math.max(value, INITIAL_COOLDOWN));
      setMessage('Verification email sent. Check your inbox and spam folder.');
      setError(null);
    } else if (verificationEmailStatus === 'failed') {
      setCooldown(0);
      setMessage(null);
      setError('Your account was created, but the first email could not be delivered. Tap resend to try again.');
    }
  }, [verificationEmailStatus]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const resend = async () => {
    if (action || cooldown > 0) return;
    try {
      setAction('resend');
      setError(null);
      const result = await requestVerificationEmail();
      setCooldown(result.cooldownSeconds ?? INITIAL_COOLDOWN);
      setMessage('A new verification email has been sent.');
    } catch (requestError) {
      const code = (requestError as { code?: string })?.code ?? '';
      setError(code.includes('resource-exhausted') || code.includes('too-many-requests') ? 'Please wait before requesting another email.' : 'Unable to resend right now. Check your connection and try again.');
    } finally {
      setAction(null);
    }
  };

  const refresh = async () => {
    if (action) return;
    try {
      setAction('refresh');
      setError(null);
      setMessage(null);
      const verified = await refreshEmailVerification();
      if (!verified) setError('Your email is not verified yet. Open the newest OmniTask email and tap Verify email, then try again.');
    } catch {
      setError('Unable to refresh your account. Check your connection and try again.');
    } finally {
      setAction(null);
    }
  };

  const logout = async () => {
    if (action) return;
    try {
      setAction('logout');
      await signOut();
    } finally {
      setAction(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppBackground />
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border }]}>
          <Image source={require('../../../assets/omnitasklogo.png')} style={styles.logo} resizeMode="contain" />
          <View style={[styles.mailCircle, { backgroundColor: theme.iconTile.cyan }]}>
            <Ionicons name="mail-unread-outline" size={31} color={theme.iconTile.foreground} />
          </View>
          <Text style={[styles.title, { color: theme.content.primary }]}>Verify your email</Text>
          <Text style={[styles.copy, { color: theme.content.secondary }]}>We need to confirm that this email belongs to you before opening your OmniTask workspace.</Text>
          <View style={[styles.emailPill, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
            <Ionicons name="mail-outline" size={18} color={theme.content.muted} />
            <Text numberOfLines={1} style={[styles.email, { color: theme.content.primary }]}>{user?.email}</Text>
          </View>

          {message ? <Text style={[styles.message, { color: theme.semantic.success }]}>{message}</Text> : null}
          {error ? <Text style={[styles.message, { color: theme.semantic.danger }]}>{error}</Text> : null}

          <TouchableOpacity testID="verification-refresh" disabled={Boolean(action)} style={[styles.primary, { backgroundColor: theme.accent.base }, action && styles.disabled]} onPress={() => void refresh()}>
            {action === 'refresh' ? <OmniLoader size="small" onPrimary accessibilityLabel="Checking verification" /> : <Text style={styles.primaryText}>I've verified my email</Text>}
          </TouchableOpacity>
          <TouchableOpacity testID="verification-resend" disabled={Boolean(action) || cooldown > 0} style={[styles.outline, { borderColor: theme.glass.border, backgroundColor: theme.glass.secondary }, (action || cooldown > 0) && styles.disabled]} onPress={() => void resend()}>
            {action === 'resend' ? <OmniLoader size="small" accessibilityLabel="Resending verification email" /> : <Text style={[styles.outlineText, { color: cooldown > 0 ? theme.content.muted : theme.accent.base }]}>{cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity testID="verification-logout" disabled={Boolean(action)} style={styles.logout} onPress={() => void logout()}>
            {action === 'logout' ? <OmniLoader size="small" accessibilityLabel="Signing out" /> : <Text style={[styles.logoutText, { color: theme.content.secondary }]}>Logout</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 30 },
  card: { width: '100%', padding: 22, borderWidth: 1, borderRadius: 26, alignItems: 'center' },
  logo: { width: 62, height: 62, marginBottom: 14 },
  mailCircle: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 27, lineHeight: 33, fontFamily: fontFamily.black, textAlign: 'center', marginBottom: 8 },
  copy: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 18 },
  emailPill: { width: '100%', height: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  email: { flex: 1, fontSize: 14, fontFamily: fontFamily.bold },
  message: { marginTop: 14, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  primary: { width: '100%', height: 52, marginTop: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFF', fontSize: 16, fontFamily: fontFamily.extrabold },
  outline: { width: '100%', height: 52, marginTop: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  outlineText: { fontSize: 14, fontFamily: fontFamily.extrabold },
  logout: { minWidth: 120, minHeight: 44, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 14, fontFamily: fontFamily.bold },
  disabled: { opacity: 0.55 },
});
