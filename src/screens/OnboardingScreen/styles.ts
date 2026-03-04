import { StyleSheet } from 'react-native';
const { width: W } = (require('react-native').Dimensions).get('window');

export const s = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  skip: { alignSelf: 'flex-end', paddingHorizontal: 22, paddingTop: 8 },
  skipText: { fontSize: 15, fontWeight: '600' },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  illustrationBox: { marginBottom: 40, alignItems: 'center' },
  logoBg: {
    width: 160, height: 160, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  featureIconBox: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  featureLottie: { width: 56, height: 56 },
  featureLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  featureDesc: { fontSize: 11, textAlign: 'center', lineHeight: 15 },

  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 14, lineHeight: 34 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 23 },

  dots: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24, borderRadius: 4 },

  footer: { width: '100%', paddingHorizontal: 28, gap: 12 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  btnText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  skipNotif: { alignItems: 'center', paddingVertical: 6 },
  skipNotifText: { fontSize: 14, fontWeight: '600' },
});