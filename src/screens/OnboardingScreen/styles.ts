import { fontFamily } from '@/theme/typography';
import { StyleSheet } from 'react-native';
const { width: W } = (require('react-native').Dimensions).get('window');

export const s = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  skip: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
  skipText: { fontSize: 15, fontFamily: fontFamily.semibold },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  illustrationBox: { marginBottom: 40, alignItems: 'center' },
  logoBg: {
    width: 160, height: 160, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },

  notifAnim: { width: 260, height: 260 },

  featureGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, justifyContent: 'center',
    marginBottom: 28,
    width: W - 48,
  },
  featureCard: {
    width: (W - 48 - 12) / 2,
    borderRadius: 20, padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  featureIconBox: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  featureLottie: { width: 56, height: 56 },
  featureLabel: { fontSize: 13, fontFamily: fontFamily.bold, textAlign: 'center', marginBottom: 4 },
  featureDesc: { fontSize: 11, textAlign: 'center', lineHeight: 15 },

  title: { fontSize: 26, fontFamily: fontFamily.black, textAlign: 'center', marginBottom: 14, lineHeight: 34 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 23 },
  feedback: {
    width: '100%',
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 19 },

  dots: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24, borderRadius: 4 },

  footer: { width: '100%', paddingHorizontal: 28, gap: 12 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    minHeight: 52, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 14,
  },
  btnDisabled: { opacity: 0.62 },
  btnText: { fontSize: 17, fontFamily: fontFamily.bold, color: '#FFFDF8' },
  btnIcon: { marginLeft: 8 },

  skipNotif: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipNotifText: { fontSize: 14, fontFamily: fontFamily.semibold },
});
