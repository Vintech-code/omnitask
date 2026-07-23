import { fontFamily } from '@/theme/typography';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { OmniLoader } from '@/components/ui/OmniLoader';

type Props = {
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
  testID?: string;
};

/**
 * A stable React Native surface using Google's approved local G asset.
 * Authentication still opens the native Google account chooser; only the
 * unreliable Nitro HybridView button host has been replaced.
 */
export function GoogleAuthButton({ loading = false, disabled = false, onPress, testID }: Props) {
  const unavailable = loading || disabled;

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      activeOpacity={0.82}
      disabled={unavailable}
      onPress={() => void onPress()}
      style={[styles.button, unavailable && styles.disabled]}
    >
      {loading ? (
        <View style={styles.content}>
          <OmniLoader size="small" accessibilityLabel="Connecting to Google" />
          <Text style={styles.text}>Connecting...</Text>
        </View>
      ) : (
        <>
          <View style={styles.logoViewport}>
            <Image
              source={require('../../../assets/google-g.png')}
              resizeMode="contain"
              style={styles.logoArtwork}
            />
          </View>
          <Text style={styles.text}>Continue with Google</Text>
          <View style={styles.trailingSpace} />
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DADCE0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  logoViewport: { width: 28, height: 28, overflow: 'hidden' },
  // The approved source asset includes its own square button boundary. Enlarge
  // and crop it here so only the standard multicolor G appears in our pill.
  logoArtwork: { position: 'absolute', width: 56, height: 56, left: -14, top: -14 },
  trailingSpace: { width: 28, height: 28 },
  text: { color: '#1F1F1F', fontSize: 15, lineHeight: 20, fontFamily: fontFamily.bold },
  disabled: { opacity: 0.62 },
});
