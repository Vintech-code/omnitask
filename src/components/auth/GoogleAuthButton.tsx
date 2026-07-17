import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GoogleSignInButton } from 'react-native-nitro-google-signin';

type Props = {
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
  testID?: string;
};

export function GoogleAuthButton({ loading = false, disabled = false, onPress, testID }: Props) {
  const [nativeInstance, setNativeInstance] = useState(0);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (wasLoading.current && !loading) {
      // Android's native Google HybridView can remain blank after its account
      // sheet closes. Recreating only that host restores the official button.
      setNativeInstance(current => current + 1);
    }
    wasLoading.current = loading;
  }, [loading]);

  return (
    <View style={[styles.clip, (loading || disabled) && styles.disabled]}>
      <GoogleSignInButton
        key={nativeInstance}
        testID={testID}
        accessibilityLabel="Sign in with Google"
        colorScheme="light"
        size="wide"
        contentAlignment="center"
        signInBehavior="none"
        loading={false}
        disabled={disabled}
        onPress={onPress}
        style={styles.button}
      />
      {loading ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#FF7A00" />
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  button: {
    width: '100%',
    height: 52,
    transform: [{ scaleX: 1.22 }, { scaleY: 1.16 }],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  loadingText: { color: '#303030', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.68 },
});
