import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  heading: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 20,
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  time: {
    fontSize: 58,
    lineHeight: 68,
    fontWeight: '300',
    letterSpacing: -2,
  },
  label: {
    marginTop: 12,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  controls: {
    marginBottom: 12,
  },
  snoozeButton: {
    height: 58,
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  stopButton: {
    height: 64,
    marginTop: 10,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
});

export default styles;