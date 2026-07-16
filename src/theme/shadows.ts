import { Platform, ViewStyle } from 'react-native';

export const glassShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#232323',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  android: { elevation: 1 },
  default: {
    shadowColor: '#232323',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
}) as ViewStyle;

export const floatingShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#1E1E1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  android: { elevation: 4 },
  default: {
    shadowColor: '#1E1E1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
}) as ViewStyle;
