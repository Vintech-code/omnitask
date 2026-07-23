import React, { useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
  type AlertButton,
  type AlertOptions,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { fontFamily } from '@/theme/typography';
import { AppText as Text } from './AppText';

interface DialogRequest {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
}

type DialogPresenter = (request: DialogRequest) => void;
let presenter: DialogPresenter | null = null;

/** Drop-in replacement for React Native Alert with OmniTask styling. */
export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    if (presenter) presenter({ title, message, buttons, options });
    else if (options !== undefined) NativeAlert.alert(title, message, buttons, options);
    else if (buttons !== undefined) NativeAlert.alert(title, message, buttons);
    else if (message !== undefined) NativeAlert.alert(title, message);
    else NativeAlert.alert(title);
  },
};

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [request, setRequest] = useState<DialogRequest | null>(null);

  useEffect(() => {
    presenter = setRequest;
    return () => {
      presenter = null;
    };
  }, []);

  const close = (invokeDismiss = true) => {
    const onDismiss = request?.options?.onDismiss;
    setRequest(null);
    if (invokeDismiss) onDismiss?.();
  };

  const buttons = request?.buttons?.length
    ? request.buttons
    : [{ text: 'OK' } satisfies AlertButton];
  const stacked = buttons.length > 2;

  return (
    <>
      {children}
      <Modal
        visible={Boolean(request)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (request?.options?.cancelable === true) close();
        }}
      >
        <View style={styles.layer}>
          <Pressable
            accessibilityLabel="Dismiss dialog"
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.70)' : 'rgba(18,28,34,0.34)' }]}
            onPress={() => {
              if (request?.options?.cancelable === true) close();
            }}
          />
          <View
            accessibilityRole="alert"
            style={[
              styles.sheet,
              {
                backgroundColor: theme.glass.solid,
                borderColor: theme.glass.border,
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.content.primary }]}>{request?.title}</Text>
            {request?.message ? <Text style={[styles.message, { color: theme.content.secondary }]}>{request.message}</Text> : null}
            <View style={[styles.actions, stacked && styles.actionsStacked]}>
              {buttons.map((button, index) => {
                const isCancel = button.style === 'cancel';
                const isDestructive = button.style === 'destructive';
                const isPrimary = !isCancel && (isDestructive || index === buttons.length - 1);
                return (
                  <TouchableOpacity
                    key={`${button.text ?? 'OK'}_${index}`}
                    accessibilityRole="button"
                    style={[
                      styles.action,
                      !stacked && styles.actionInline,
                      {
                        backgroundColor: isDestructive
                          ? theme.semantic.danger
                          : isPrimary
                            ? theme.accent.base
                            : theme.glass.secondary,
                        borderColor: isPrimary ? 'transparent' : theme.glass.border,
                      },
                    ]}
                    onPress={() => {
                      setRequest(null);
                      button.onPress?.();
                    }}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        {
                          color: isPrimary ? theme.iconTile.foreground : theme.content.primary,
                        },
                      ]}
                    >
                      {button.text ?? 'OK'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  sheet: { width: '100%', maxWidth: 400, alignSelf: 'center', borderRadius: 22, borderWidth: 1, padding: 18 },
  title: { fontSize: 19, lineHeight: 24, fontFamily: fontFamily.extrabold },
  message: { marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: fontFamily.medium },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 7, marginTop: 14 },
  actionsStacked: { flexDirection: 'column' },
  action: { minHeight: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  actionInline: { flex: 1 },
  actionText: { fontSize: 14, fontFamily: fontFamily.extrabold, textAlign: 'center' },
});
