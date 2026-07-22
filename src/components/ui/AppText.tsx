import React from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';

import { fontFamily } from '@/theme/typography';

/** App-wide text primitives. Explicit styles may still select another Nunito face. */
export const AppText = React.forwardRef<React.ComponentRef<typeof NativeText>, TextProps>(
  ({ style, ...props }, ref) => <NativeText ref={ref} {...props} style={[styles.text, style]} />,
);
AppText.displayName = 'AppText';

export const AppTextInput = React.forwardRef<NativeTextInput, TextInputProps>(
  ({ style, ...props }, ref) => <NativeTextInput ref={ref} {...props} style={[styles.text, style]} />,
);
AppTextInput.displayName = 'AppTextInput';

const styles = StyleSheet.create({
  text: { fontFamily: fontFamily.regular },
});
