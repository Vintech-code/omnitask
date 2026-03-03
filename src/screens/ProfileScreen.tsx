import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Animated,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const BLUE = '#4A90D9';

interface MenuRow {
  icon: string;
  lib: 'ion' | 'mc';
  label: string;
  action: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

export default function ProfileScreen({ navigation }: any) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const s = makeStyles(theme);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'OT';

  const rows: MenuRow[] = [
    {
      icon: 'person-circle-outline', lib: 'ion',
      label: 'Edit Profile',
      action: () => Alert.alert('Edit Profile', 'Profile editing coming soon.'),
    },
    {
      icon: 'notifications-outline', lib: 'ion',
      label: 'Notifications',
      action: () => Alert.alert('Notifications', 'Notification settings coming soon.'),
    },
    {
      icon: 'moon-outline', lib: 'ion',
      label: 'Dark Mode',
      action: () => {},
      right: (
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#ccc', true: BLUE }}
          thumbColor="#fff"
        />
      ),
    },
    {
      icon: 'language-outline', lib: 'ion',
      label: 'Language',
      action: () => Alert.alert('Language', 'Language settings coming soon.'),
    },
    {
      icon: 'lock-closed-outline', lib: 'ion',
      label: 'Privacy & Security',
      action: () => Alert.alert('Privacy', 'Privacy settings coming soon.'),
    },
    {
      icon: 'cloud-outline', lib: 'ion',
      label: 'Backup & Sync',
      action: () => Alert.alert('Backup', 'Cloud sync coming soon.'),
    },
    {
      icon: 'help-circle-outline', lib: 'ion',
      label: 'Help & Support',
      action: () => Alert.alert('Help', 'Support coming soon.'),
    },
    {
      icon: 'information-circle-outline', lib: 'ion',
      label: 'About OmniTask',
      action: () => Alert.alert('OmniTask', 'Version 1.0.0\nBuilt with React Native + Expo'),
    },
    {
      icon: 'log-out-outline', lib: 'ion',
      label: 'Sign Out',
      danger: true,
      action: () =>
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          }},
        ]),
    },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.iconColor} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Avatar Card ── */}
        <View style={s.avatarCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitials}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={s.profileName}>{user?.name ?? 'Guest'}</Text>
            <Text style={s.profileEmail}>{user?.email ?? ''}</Text>
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => Alert.alert('Edit Profile', 'Profile editing coming soon.')}
            >
              <Text style={s.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Settings rows ── */}
        <View style={s.section}>
          {rows.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              style={[
                s.row,
                i === 0 && s.rowFirst,
                i === rows.length - 1 && s.rowLast,
              ]}
              onPress={row.action}
              activeOpacity={row.right ? 1 : 0.7}
            >
              <View style={[s.rowIcon, row.danger && s.rowIconDanger]}>
                {row.lib === 'ion'
                  ? <Ionicons name={row.icon as any} size={20} color={row.danger ? '#E05252' : BLUE} />
                  : <MaterialCommunityIcons name={row.icon as any} size={20} color={row.danger ? '#E05252' : BLUE} />}
              </View>
              <Text style={[s.rowLabel, row.danger && s.rowLabelDanger]}>{row.label}</Text>
              {row.right
                ? <View style={{ marginLeft: 'auto' }}>{row.right}</View>
                : !row.danger && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={theme.textDim}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.version}>OmniTask v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg2 },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 13,
      backgroundColor: t.bg, borderBottomWidth: 1, borderBottomColor: t.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: t.text, textAlign: 'center' },

    avatarCard: {
      flexDirection: 'row', alignItems: 'center',
      margin: 16, padding: 18,
      backgroundColor: t.card, borderRadius: 18,
      borderWidth: 1, borderColor: t.border,
    },
    avatarCircle: {
      width: 68, height: 68, borderRadius: 34,
      backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { fontSize: 24, fontWeight: '800', color: '#fff' },
    profileName: { fontSize: 19, fontWeight: '800', color: t.text, marginBottom: 3 },
    profileEmail: { fontSize: 13, color: t.textDim, marginBottom: 10 },
    editBtn: {
      alignSelf: 'flex-start',
      borderWidth: 1.5, borderColor: BLUE,
      borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5,
    },
    editBtnText: { fontSize: 13, color: BLUE, fontWeight: '700' },

    section: {
      marginHorizontal: 16, marginBottom: 8,
      backgroundColor: t.card, borderRadius: 18,
      borderWidth: 1, borderColor: t.border, overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 15,
      borderTopWidth: 1, borderTopColor: t.border,
    },
    rowFirst: { borderTopWidth: 0 },
    rowLast: {},
    rowIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: `${BLUE}18`,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 13,
    },
    rowIconDanger: { backgroundColor: '#FDECEA' },
    rowLabel: { fontSize: 15, fontWeight: '500', color: t.text },
    rowLabelDanger: { color: '#E05252' },

    version: {
      fontSize: 12, color: t.textDim,
      textAlign: 'center', marginTop: 20,
    },
  });
