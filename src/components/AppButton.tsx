// src/components/AppButton.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import Colors from '../constants/Colors';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'outline';
}

const AppButton: React.FC<AppButtonProps> = ({ title, onPress, style, textStyle, variant = 'primary' }) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return Colors.primary;
      case 'secondary': return Colors.backgroundLight; // Could adapt
      case 'outline': return 'transparent';
      default: return Colors.primary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary': return '#fff';
      case 'secondary': return Colors.text;
      case 'outline': return Colors.primary;
      default: return '#fff';
    }
  };

  const css = [
    styles.button,
    { backgroundColor: getBackgroundColor() },
    variant === 'outline' && { borderWidth: 1, borderColor: Colors.primary },
    style
  ];

  return (
    <TouchableOpacity style={css} onPress={onPress}>
      <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    width: '100%',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AppButton;
