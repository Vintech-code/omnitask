import { fontFamily } from '@/theme/typography';
import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
const { height: SCREEN_H } = (require('react-native').Dimensions).get('window');

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  /* Hero */
  hero: {
    alignItems: 'center',
    paddingTop: SCREEN_H < 700 ? 24 : 40,
    paddingBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 14,
  },
  appName: {
    fontSize: 32,
    fontFamily: fontFamily.black,
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 15,
    color: '#888',
    fontFamily: fontFamily.medium,
  },

  /* Balancing animation */
  balancingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balancingAnim: {
    width: 280,
    height: 220,
  },

  /* CTA block */
  ctaBlock: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 16,
  },
  btnPrimary: {
    width: '100%',
    height: 52,
    backgroundColor: BLUE,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 0.2,
  },
  btnSecondary: {
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#DDE2EE',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: '#444',
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E9F0' },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: '#AAA',
    fontFamily: fontFamily.bold,
    letterSpacing: 1,
  },

  /* Google authentication */
  googleButtonWrap: { width: '100%', marginBottom: 18 },

  /* Terms */
  terms: {
    textAlign: 'center',
    fontSize: 11,
    color: '#BBB',
    lineHeight: 17,
  },
});
