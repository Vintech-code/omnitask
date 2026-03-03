import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { Storage, KEYS } from '../services/StorageService';

const BLUE = '#4A90D9';

const Field = ({
  label,
  placeholder,
  icon,
  secure,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  value: string;
  onChange: (v: string) => void;
}) => {
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 18, width: '100%' }}>
      <Text style={fs.label}>{label}</Text>
      <View style={fs.row}>
        <Ionicons name={icon} size={18} color="#AAA" style={{ marginRight: 8 }} />
        <TextInput
          style={fs.input}
          placeholder={placeholder}
          placeholderTextColor="#C0C0C0"
          secureTextEntry={secure && !show}
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(!show)}>
            <Ionicons name={show ? 'eye' : 'eye-off'} size={18} color="#AAA" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const fs = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  input: { flex: 1, fontSize: 15, color: '#222' },
});

export default function SignUpScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Validation', 'Please enter your full name.'); return; }
    if (!email.trim()) { Alert.alert('Validation', 'Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert('Validation', 'Please enter a valid email address.'); return; }
    if (password.length < 6) { Alert.alert('Validation', 'Password must be at least 6 characters.'); return; }
    if (password !== confirm) { Alert.alert('Validation', 'Passwords do not match.'); return; }
    if (!agreed) { Alert.alert('Validation', 'Please agree to the Terms of Service and Privacy Policy.'); return; }
    try {
      setLoading(true);
      await signUp(name.trim(), email.trim(), password);
      if (profilePhoto) await Storage.set(KEYS.PROFILE_PHOTO, profilePhoto);
      navigation.replace('Onboarding');
    } catch (e) {
      Alert.alert('Sign Up Failed', 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header bar */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="chevron-back" size={22} color="#222" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <TouchableOpacity style={s.avatarWrap} onPress={pickPhoto} activeOpacity={0.8}>
          <View style={s.avatarCircle}>
            {profilePhoto
              ? <Image source={{ uri: profilePhoto }} style={{ width: 92, height: 92, borderRadius: 46 }} />
              : <Ionicons name="person" size={52} color="#b0a8d0" />}
          </View>
          <View style={s.cameraBtn}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={s.avatarLabel}>Upload Profile Photo</Text>
        <Text style={s.avatarSub}>Make your profile recognizable</Text>

        <View style={{ width: '100%', marginTop: 24 }}>
          <Field label="Full Name" placeholder="John Doe" icon="person-outline" value={name} onChange={setName} />
          <Field label="Email Address" placeholder="john@example.com" icon="mail-outline" value={email} onChange={setEmail} />
          <Field label="Password" placeholder="••••••••" icon="lock-closed-outline" secure value={password} onChange={setPassword} />
          <Field label="Confirm Password" placeholder="••••••••" icon="lock-closed-outline" secure value={confirm} onChange={setConfirm} />
        </View>

        {/* Terms checkbox */}
        <TouchableOpacity style={s.checkRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
          <View style={[s.checkbox, agreed && s.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={s.checkText}>
            I agree to the{' '}
            <Text style={s.checkLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={s.checkLink}>Privacy Policy</Text>.
          </Text>
        </TouchableOpacity>

        {/* Create Account button */}
        <TouchableOpacity style={s.btnPrimary} onPress={handleCreate} activeOpacity={0.85} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        <View style={s.signInRow}>
          <Text style={s.gray}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={s.link}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Security badge */}
        <View style={s.badge}>
          <View style={s.badgeIcon}>
            <Ionicons name="checkmark-circle" size={28} color="#3DAE7C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.badgeTitle}>Secure &amp; Private</Text>
            <Text style={s.badgeSub}>Your data is encrypted and never shared with third parties.</Text>
          </View>
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
  scroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40, alignItems: 'center' },

  /* Avatar */
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8E4F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C8BFEA',
    borderStyle: 'dashed',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarLabel: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 4 },
  avatarSub: { fontSize: 13, color: '#999', marginBottom: 4 },

  /* Checkbox */
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 22 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BLUE,
    marginRight: 10,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BLUE },
  checkText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },
  checkLink: { color: BLUE, fontWeight: '600' },

  /* Button */
  btnPrimary: {
    width: '100%',
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  /* Footer */
  signInRow: { flexDirection: 'row', marginBottom: 28 },
  gray: { color: '#999', fontSize: 14 },
  link: { color: BLUE, fontWeight: '700', fontSize: 14 },

  /* Badge */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  badgeIcon: { marginRight: 12 },
  badgeTitle: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 3 },
  badgeSub: { fontSize: 12, color: '#888', lineHeight: 17 },
});
