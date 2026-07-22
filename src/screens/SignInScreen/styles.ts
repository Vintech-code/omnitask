import { fontFamily } from '@/theme/typography';
import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  back: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1A1A1A' },
  scroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 50, maxWidth: 480, width: '100%', alignSelf: 'center' },

  title: { fontSize: 26, fontFamily: fontFamily.extrabold, color: '#111', marginBottom: 8 },
  sub: { fontSize: 14, color: '#888', lineHeight: 21, marginBottom: 28 },

  fields: { gap: 14, marginBottom: 18 },
  forgotButton: { minHeight: 32, marginTop: -6, alignSelf: 'flex-end', justifyContent: 'center' },
  forgot: { fontSize: 13, color: BLUE, fontFamily: fontFamily.semibold },

  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCC',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BLUE, borderColor: BLUE },
  rememberText: { fontSize: 14, color: '#555' },

  btnPrimary: {
    width: '100%',
    height: 52,
    backgroundColor: BLUE,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  btnText: { color: '#fff', fontSize: 17, fontFamily: fontFamily.bold },
  btnDisabled: { opacity: 0.82 },
  loadingContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connectionNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, padding: 12, marginTop: -12, marginBottom: 20 },
  connectionNoticeText: { flex: 1, color: '#7A5200', fontSize: 13, lineHeight: 18 },
  errorNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 14, borderWidth: 1, padding: 12, marginTop: -12, marginBottom: 20 },
  errorNoticeText: { flex: 1, color: '#9A1B1B', fontSize: 13, lineHeight: 18 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 10, fontSize: 11, color: '#AAA', fontFamily: fontFamily.semibold, letterSpacing: 0.8 },

  googleButtonWrap: { width: '100%', marginBottom: 28 },

  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  gray: { color: '#999', fontSize: 14 },
  link: { color: BLUE, fontFamily: fontFamily.bold, fontSize: 14 },
});
