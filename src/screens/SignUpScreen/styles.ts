import { fontFamily } from '@/theme/typography';
import { StyleSheet } from 'react-native';
import { BRAND_BLUE as ORANGE } from '@/theme/colors';

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  headerBar: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 40, minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: fontFamily.bold, color: '#1A1A1A' },
  headerSpacer: { width: 40 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, maxWidth: 480, width: '100%', alignSelf: 'center' },
  intro: { marginBottom: 20 },
  title: { fontSize: 28, lineHeight: 34, fontFamily: fontFamily.extrabold, color: '#111', letterSpacing: -0.4, marginBottom: 7 },
  subtitle: { maxWidth: 390, fontSize: 14, lineHeight: 21, color: '#6F7178' },
  card: {
    width: '100%',
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.84)',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  googleHelper: { marginTop: 9, paddingHorizontal: 8, textAlign: 'center', fontSize: 12, lineHeight: 17, color: '#73757C' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E3E7' },
  dividerText: { marginHorizontal: 10, fontSize: 10, color: '#8B8D94', fontFamily: fontFamily.bold, letterSpacing: 0.7 },
  fields: { gap: 14 },
  errorNotice: { marginTop: 14, padding: 11, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#8F1D16' },
  btnPrimary: { width: '100%', minHeight: 52, marginTop: 18, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: ORANGE },
  disabled: { opacity: 0.7 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: fontFamily.extrabold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  terms: { marginTop: 14, paddingHorizontal: 6, textAlign: 'center', fontSize: 11, lineHeight: 17, color: '#85878E' },
  termsLink: { color: ORANGE, fontFamily: fontFamily.bold },
  signInRow: { marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  gray: { color: '#777A81', fontSize: 14 },
  link: { color: ORANGE, fontFamily: fontFamily.extrabold, fontSize: 14 },
});
