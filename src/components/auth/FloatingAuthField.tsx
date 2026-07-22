import { fontFamily } from '@/theme/typography';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardTypeOptions, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { AppTextInput as TextInput } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';

type Props = {
  testID: string;
  label: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
};

export function FloatingAuthField({ testID, label, placeholder, icon, value, onChangeText, secure = false, keyboardType = 'default', autoComplete, textContentType, returnKeyType, onSubmitEditing }: Props) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    Animated.timing(progress, { toValue: focused || value.length > 0 ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [focused, progress, value]);

  const labelStyle = {
    top: progress.interpolate({ inputRange: [0, 1], outputRange: [17, -8] }),
    fontSize: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
    color: progress.interpolate({ inputRange: [0, 1], outputRange: [theme.content.secondary, theme.accent.base] }),
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[
        styles.field,
        { backgroundColor: theme.glass.solid, borderColor: theme.glass.border },
        focused && [styles.fieldFocused, { borderColor: theme.accent.base }],
      ]}
      onPress={() => inputRef.current?.focus()}
    >
      <Animated.Text pointerEvents="none" style={[styles.label, { backgroundColor: theme.dark ? '#222321' : '#FFFFFF' }, labelStyle]}>{label}</Animated.Text>
      <Ionicons name={icon} size={19} color={focused ? theme.accent.base : theme.content.muted} style={styles.leadingIcon} />
      <TextInput
        ref={inputRef}
        testID={testID}
        style={[styles.input, { color: theme.content.primary }]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ''}
        placeholderTextColor={theme.content.muted}
        secureTextEntry={secure && !visible}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' || secure ? 'none' : 'words'}
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      {secure ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} hitSlop={10} style={styles.visibilityButton} onPress={() => setVisible(current => !current)}>
          <Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.content.secondary} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  field: { width: '100%', height: 56, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  fieldFocused: { borderWidth: 2, paddingHorizontal: 13 },
  label: { position: 'absolute', left: 43, zIndex: 2, paddingHorizontal: 4, fontFamily: fontFamily.semibold },
  leadingIcon: { width: 24, marginRight: 7 },
  input: { flex: 1, height: '100%', paddingTop: 8, paddingRight: 32, fontSize: 16, color: '#171717' },
  visibilityButton: { position: 'absolute', right: 10, width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
