// src/components/AppTextInput.tsx
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

interface AppTextInputProps extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
}

const AppTextInput: React.FC<AppTextInputProps> = ({ icon, secureTextEntry, ...otherProps }) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={styles.container}>
      {icon && <Ionicons name={icon} size={20} color={Colors.textSecondary} style={styles.icon} />}
      <TextInput
        style={styles.input}
        placeholderTextColor={Colors.textSecondary}
        secureTextEntry={isSecure}
        {...otherProps}
      />
      {secureTextEntry && (
        <TouchableOpacity onPress={() => setIsSecure(!isSecure)}>
          <Ionicons
            name={isSecure ? "eye-off" : "eye"}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    flexDirection: 'row',
    width: '100%',
    padding: 15,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
});

export default AppTextInput;
