import React, { useRef, useState, useEffect } from 'react';
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
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Storage, KEYS } from '@/services/StorageService';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { epStyles, makeStyles } from './styles';


interface MenuRow {
  icon: string;
  lib: 'ion' | 'mc';
  label: string;
  action: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

export default function ProfileScreen({ navigation }: any) {
  const { theme, isDark, toggleTheme, useSystemTheme, setUseSystemTheme } = useTheme();
  const { user, signOut, updateUser } = useAuth();
  const s = makeStyles(theme);

  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [langModal, setLangModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState('English');
  const [privacyModal, setPrivacyModal] = useState(false);
  const [helpModal, setHelpModal] = useState(false);

  useEffect(() => {
    Storage.get<string>(KEYS.PROFILE_PHOTO).then(p => { if (p) setProfilePhoto(p); });
  }, []);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const uri = result.assets[0].uri;
      setProfilePhoto(uri);
      await Storage.set(KEYS.PROFILE_PHOTO, uri);
    }
  };

  const handleSaveProfile = async () => {
    const name = editName.trim();
    if (!name) { Alert.alert('Name required', 'Please enter your name.'); return; }
    setSaving(true);
    try {
      await updateUser({ name });
      setEditModal(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'OT';

  const rows: MenuRow[] = [
    {
      icon: 'person-circle-outline', lib: 'ion',
      label: 'Edit Profile',
      action: () => { setEditName(user?.name ?? ''); setEditModal(true); },
    },
    {
      icon: 'notifications-outline', lib: 'ion',
      label: 'Notifications',
      action: () => Linking.openSettings(),
    },
    {
      icon: 'camera-outline', lib: 'ion',
      label: 'Change Profile Photo',
      action: pickPhoto,
    },
    {
      icon: 'moon-outline', lib: 'ion',
      label: 'Dark Mode',
      action: () => { if (!useSystemTheme) toggleTheme(); },
      right: (
        <Switch
          value={isDark}
          onValueChange={() => { if (!useSystemTheme) toggleTheme(); }}
          trackColor={{ false: '#ccc', true: BLUE }}
          thumbColor="#fff"
          disabled={useSystemTheme}
        />
      ),
    },
    {
      icon: 'phone-portrait-outline', lib: 'ion',
      label: 'Follow System Theme',
      action: () => setUseSystemTheme(!useSystemTheme),
      right: (
        <Switch
          value={useSystemTheme}
          onValueChange={setUseSystemTheme}
          trackColor={{ false: '#ccc', true: BLUE }}
          thumbColor="#fff"
        />
      ),
    },
    {
      icon: 'language-outline', lib: 'ion',
      label: 'Language',
      action: () => setLangModal(true),
    },
    {
      icon: 'lock-closed-outline', lib: 'ion',
      label: 'Privacy & Security',
      action: () => setPrivacyModal(true),
    },
    {
      icon: 'cloud-outline', lib: 'ion',
      label: 'Backup & Sync',
      action: () => Alert.alert('Backup & Sync', 'Your data is automatically synced to Firebase in real time. All notes, events, and alarms are backed up to the cloud.'),
    },
    {
      icon: 'help-circle-outline', lib: 'ion',
      label: 'Help & Support',
      action: () => setHelpModal(true),
    },
    {
      icon: 'information-circle-outline', lib: 'ion',
      label: 'About OmniTask',
      action: () => Alert.alert(
        'OmniTask v1.0.0',
        'Built with React Native & Expo\n\nDeveloped for productivity lovers who want a unified tasks, events & alarms experience.\n\n© 2025 OmniTask. All rights reserved.',
        [{ text: 'Close', style: 'cancel' }]
      ),
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
          <TouchableOpacity onPress={pickPhoto} style={s.avatarCircle}>
            {profilePhoto
              ? <Image source={{ uri: profilePhoto }} style={s.avatarPhoto} />
              : <Text style={s.avatarInitials}>{initials}</Text>
            }
            <View style={s.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={s.profileName}>{user?.name ?? 'Guest'}</Text>
            <Text style={s.profileEmail}>{user?.email ?? ''}</Text>
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => { setEditName(user?.name ?? ''); setEditModal(true); }}
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

      {/* ── Edit Profile Modal ── */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={epStyles.overlay} onPress={() => setEditModal(false)} />
          <View style={[epStyles.sheet, { backgroundColor: theme.bg }]}>
            <View style={[epStyles.handle, { backgroundColor: theme.border }]} />
            <View style={[epStyles.head, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Text style={[epStyles.cancel, { color: theme.textDim }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[epStyles.title, { color: theme.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={handleSaveProfile} disabled={saving}>
                <Text style={[epStyles.done, { color: saving ? theme.textDim : BLUE }]}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
            <View style={epStyles.body}>
              <Text style={[epStyles.label, { color: theme.textDim }]}>Display Name</Text>
              <TextInput
                style={[epStyles.input, { backgroundColor: theme.bg2, borderColor: theme.border, color: theme.text }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={theme.textDim}
                autoFocus
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={handleSaveProfile}
              />
              <Text style={[epStyles.hint, { color: theme.textDim }]}>This name is shown across your profile and greetings.</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Language Modal ── */}
      <Modal visible={langModal} animationType="slide" transparent onRequestClose={() => setLangModal(false)}>
        <Pressable style={epStyles.overlay} onPress={() => setLangModal(false)} />
        <View style={[epStyles.sheet, { backgroundColor: theme.bg }]}>
          <View style={[epStyles.handle, { backgroundColor: theme.border }]} />
          <View style={[epStyles.head, { borderBottomColor: theme.border }]}>
            <View style={{ width: 56 }} />
            <Text style={[epStyles.title, { color: theme.text }]}>Language</Text>
            <TouchableOpacity onPress={() => setLangModal(false)}>
              <Text style={[epStyles.done, { color: BLUE }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {['English', 'Spanish', 'French', 'German', 'Arabic'].map(lang => (
              <TouchableOpacity
                key={lang}
                style={[epStyles.langRow, { borderBottomColor: theme.border }]}
                onPress={() => setSelectedLang(lang)}
              >
                <Text style={[epStyles.langText, { color: theme.text }]}>{lang}</Text>
                {selectedLang === lang && <Ionicons name="checkmark" size={20} color={BLUE} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Privacy & Security Modal ── */}
      <Modal visible={privacyModal} animationType="slide" transparent onRequestClose={() => setPrivacyModal(false)}>
        <Pressable style={epStyles.overlay} onPress={() => setPrivacyModal(false)} />
        <View style={[epStyles.sheet, epStyles.tallSheet, { backgroundColor: theme.bg }]}>
          <View style={[epStyles.handle, { backgroundColor: theme.border }]} />
          <View style={[epStyles.head, { borderBottomColor: theme.border }]}>
            <View style={{ width: 56 }} />
            <Text style={[epStyles.title, { color: theme.text }]}>Privacy & Security</Text>
            <TouchableOpacity onPress={() => setPrivacyModal(false)}>
              <Text style={[epStyles.done, { color: BLUE }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={epStyles.body}>
            {[
              { heading: 'Data Storage', body: 'Your notes, tasks, events, and alarms are stored securely on Firebase Firestore with encryption at rest.' },
              { heading: 'No Data Selling', body: 'OmniTask never sells your personal data to third parties. Your information is yours.' },
              { heading: 'Authentication', body: 'Passwords are hashed and managed by Firebase Authentication. We never store plain-text passwords.' },
              { heading: 'Data Deletion', body: 'You can permanently delete your account and all associated data from within the app at any time.' },
              { heading: 'Permissions', body: 'OmniTask requests only the permissions it needs: camera/photos for profile pictures, and notifications for reminders.' },
            ].map(item => (
              <View key={item.heading} style={{ marginBottom: 20 }}>
                <Text style={[epStyles.label, { color: BLUE }]}>{item.heading}</Text>
                <Text style={[epStyles.hint, { color: theme.textSub, fontSize: 14, lineHeight: 21 }]}>{item.body}</Text>
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Help & Support Modal ── */}
      <Modal visible={helpModal} animationType="slide" transparent onRequestClose={() => setHelpModal(false)}>
        <Pressable style={epStyles.overlay} onPress={() => setHelpModal(false)} />
        <View style={[epStyles.sheet, epStyles.tallSheet, { backgroundColor: theme.bg }]}>
          <View style={[epStyles.handle, { backgroundColor: theme.border }]} />
          <View style={[epStyles.head, { borderBottomColor: theme.border }]}>
            <View style={{ width: 56 }} />
            <Text style={[epStyles.title, { color: theme.text }]}>Help & Support</Text>
            <TouchableOpacity onPress={() => setHelpModal(false)}>
              <Text style={[epStyles.done, { color: BLUE }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={epStyles.body}>
            {[
              { q: 'What is OmniTask?', a: 'OmniTask is an all-in-one productivity app combining To-Do lists, Calendar Events, and Alarms in one place.' },
              { q: 'How do I create a task?', a: 'Tap the + button on the Tasks tab. Fill in a title and optional body, then tap Save.' },
              { q: 'How do I set an alarm?', a: 'Go to the Alarms tab and tap the + button. Set your time, repeat options, and label.' },
              { q: 'Can I add recurring events?', a: 'Yes! When creating an event, tap the recurrence option and choose Daily, Weekly, or Monthly.' },
              { q: 'How do I change my profile photo?', a: 'Tap your avatar on the Profile screen or use "Change Profile Photo" in the settings list.' },
              { q: 'My data is not syncing.', a: 'Ensure you have an active internet connection. Data syncs with Firebase in real time when online.' },
              { q: 'How do I delete my account?', a: 'Contact support at support@omnitask.app and we will permanently delete your account and data within 48 hours.' },
            ].map(item => (
              <View key={item.q} style={{ marginBottom: 20 }}>
                <Text style={[epStyles.label, { color: BLUE }]}>{item.q}</Text>
                <Text style={[epStyles.hint, { color: theme.textSub, fontSize: 14, lineHeight: 21 }]}>{item.a}</Text>
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}