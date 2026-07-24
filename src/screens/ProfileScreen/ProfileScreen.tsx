import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppAlert as Alert } from '@/components/ui/AppDialog';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
import { AppBackground, OmniLoader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { makeStyles } from './styles';
import { AttachmentImage } from '@/components/attachments';

type ProfileNavigation = {
  goBack: () => void;
  reset: (state: { index: number; routes: Array<{ name: string }> }) => void;
};

interface ActionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  color: string;
  onPress: () => void;
}

function ActionRow({ icon, label, detail, color, onPress }: ActionRowProps) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${detail}`}
      activeOpacity={0.72}
      onPress={onPress}
      style={s.actionRow}
    >
      <View style={[s.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color={theme.iconTile.foreground} />
      </View>
      <View style={s.actionCopy}>
        <Text style={s.actionLabel}>{label}</Text>
        <Text style={s.actionDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.content.muted} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: { navigation: ProfileNavigation }) {
  const { theme } = useTheme();
  const { user, emailVerified, signOut, updateUser, profilePhoto, profilePhotoAttachmentId, updateProfilePhoto } = useAuth();
  const s = makeStyles(theme);
  const entrance = useRef(new Animated.Value(0)).current;
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const pickPhoto = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photo access needed', 'Allow photo access in Settings to choose a profile picture.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        await updateProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Could not update photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const openEditor = () => {
    setEditName(user?.name ?? '');
    setEditModal(true);
  };

  const saveProfile = async () => {
    const name = editName.trim();
    if (!name || saving) {
      if (!name) Alert.alert('Name required', 'Enter the name you want OmniTask to display.');
      return;
    }
    setSaving(true);
    try {
      await updateUser({ name });
      setEditModal(false);
    } catch (error) {
      Alert.alert('Could not save profile', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your synced data stays attached to this account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          if (signingOut) return;
          setSigningOut(true);
          try {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          } catch (error) {
            Alert.alert('Could not sign out', error instanceof Error ? error.message : 'Please try again.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name.split(/\s+/).map(word => word[0]).join('').toUpperCase().slice(0, 2)
    : 'OT';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppBackground />
      <View style={s.header}>
        <TouchableOpacity accessibilityLabel="Go back" onPress={navigation.goBack} style={s.headerButton}>
          <Ionicons name="arrow-back" size={22} color={theme.icon} />
        </TouchableOpacity>
        <View style={s.headerCopy}>
          <Text style={s.headerTitle}>Profile</Text>
          <Text style={s.headerSubtitle}>Your OmniTask identity</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <Animated.View
          style={[
            s.hero,
            {
              opacity: entrance,
              transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
            },
          ]}
        >
          <LinearGradient
            colors={theme.dark
              ? ['rgba(42,62,63,0.98)', 'rgba(21,56,58,0.94)', 'rgba(16,26,27,0.98)']
              : ['rgba(255,255,255,0.98)', 'rgba(196,224,225,0.86)', 'rgba(121,198,202,0.68)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroGradient}
          />
          <View pointerEvents="none" style={s.heroRailWide} />
          <View pointerEvents="none" style={s.heroRailFine} />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            disabled={photoBusy}
            activeOpacity={0.78}
            onPress={() => void pickPhoto()}
            style={s.avatar}
          >
            {profilePhoto || profilePhotoAttachmentId ? (
              <AttachmentImage attachmentId={profilePhotoAttachmentId ?? undefined} fallbackUri={profilePhoto ?? undefined} style={s.avatarPhoto} showStatus />
            ) : (
              <LinearGradient
                colors={[theme.iconTile.blue, theme.iconTile.teal]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.avatarFallback}
              >
                <Text style={s.avatarInitials}>{initials}</Text>
              </LinearGradient>
            )}
            <View style={s.photoAction}>
              {photoBusy ? <OmniLoader size="small" onPrimary accessibilityLabel="Updating profile photo" /> : <Ionicons name="camera" size={15} color={theme.iconTile.foreground} />}
            </View>
          </TouchableOpacity>

          <View style={s.identity}>
            <Text style={s.name} numberOfLines={1}>{user?.name || 'OmniTask user'}</Text>
            <Text style={s.email} numberOfLines={1}>{user?.email || ''}</Text>
            <View style={s.statusRow}>
              <View style={s.statusPill}>
                <View style={[s.statusDot, { backgroundColor: emailVerified ? theme.semantic.success : theme.semantic.warning }]} />
                <Text style={s.statusText}>{emailVerified ? 'Verified account' : 'Signed in'}</Text>
              </View>
              <View style={s.statusPill}>
                <View style={[s.statusDot, { backgroundColor: theme.iconTile.blue }]} />
                <Text style={s.statusText}>Offline-ready</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity accessibilityRole="button" onPress={openEditor} style={s.editButton}>
            <Text style={s.editButtonText}>Edit profile</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[s.section, { opacity: entrance }]}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Account controls</Text>
            <Text style={s.sectionDescription}>Only settings with an active action are shown here.</Text>
          </View>
          <View style={s.actionGroup}>
            <ActionRow
              icon="person-outline"
              label="Display name"
              detail="Update how your name appears"
              color={theme.iconTile.teal}
              onPress={openEditor}
            />
            <View style={s.divider} />
            <ActionRow
              icon="notifications-outline"
              label="Notification settings"
              detail="Manage Android permissions and alerts"
              color={theme.iconTile.blue}
              onPress={() => void Linking.openSettings()}
            />
          </View>
        </Animated.View>

        <TouchableOpacity
          accessibilityRole="button"
          disabled={signingOut}
          activeOpacity={0.74}
          onPress={confirmSignOut}
          style={s.signOutButton}
        >
          {signingOut ? <OmniLoader size="small" accessibilityLabel="Signing out" /> : null}
          <Text style={s.signOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </TouchableOpacity>
        <Text style={s.version}>OmniTask 1.0.0</Text>
      </ScrollView>

      <Modal visible={editModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => !saving && setEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalLayer}>
          <Pressable
            accessibilityLabel="Close edit profile"
            disabled={saving}
            onPress={() => setEditModal(false)}
            style={s.modalBackdrop}
          />
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>Edit profile</Text>
            <Text style={s.dialogCopy}>This name appears in your greeting and shared workspace presence.</Text>
            <Text style={s.inputLabel}>Display name</Text>
            <TextInput
              autoFocus
              editable={!saving}
              maxLength={50}
              returnKeyType="done"
              value={editName}
              onChangeText={setEditName}
              onSubmitEditing={() => void saveProfile()}
              placeholder="Your name"
              placeholderTextColor={theme.content.muted}
              style={s.input}
            />
            <View style={s.dialogActions}>
              <TouchableOpacity disabled={saving} onPress={() => setEditModal(false)} style={s.cancelButton}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={saving || !editName.trim()} onPress={() => void saveProfile()} style={[s.saveButton, (saving || !editName.trim()) && s.disabled]}>
                {saving ? <OmniLoader size="small" onPrimary accessibilityLabel="Saving profile" /> : null}
                <Text style={s.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
