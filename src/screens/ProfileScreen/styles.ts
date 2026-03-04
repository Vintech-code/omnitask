import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';

export const epStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  tallSheet: { maxHeight: '85%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 2 },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { fontSize: 15, fontWeight: '500', minWidth: 56 },
  title: { fontSize: 16, fontWeight: '700' },
  done: { fontSize: 15, fontWeight: '700', minWidth: 56, textAlign: 'right' },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, fontWeight: '500', marginBottom: 10,
  },
  hint: { fontSize: 12, lineHeight: 17 },
  langRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  langText: { fontSize: 16, fontWeight: '500' },
});

export const makeStyles = (t: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg2 },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 13,
      backgroundColor: t.bg, borderBottomWidth: 1, borderBottomColor: t.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: t.text, textAlign: 'center' },

    avatarCard: {
      flexDirection: 'row', alignItems: 'center',
      margin: 16, padding: 18,
      backgroundColor: t.card, borderRadius: 18,
      borderWidth: 1, borderColor: t.border,
    },
    avatarCircle: {
      width: 68, height: 68, borderRadius: 34,
      backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    },
    avatarInitials: { fontSize: 24, fontWeight: '800', color: '#fff' },
    avatarPhoto: { width: 68, height: 68, borderRadius: 34 },
    cameraOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 22, backgroundColor: 'rgba(0,0,0,0.40)',
      alignItems: 'center', justifyContent: 'center',
    },
    profileName: { fontSize: 19, fontWeight: '800', color: t.text, marginBottom: 3 },
    profileEmail: { fontSize: 13, color: t.textDim, marginBottom: 10 },
    editBtn: {
      alignSelf: 'flex-start',
      borderWidth: 1.5, borderColor: BLUE,
      borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5,
    },
    editBtnText: { fontSize: 13, color: BLUE, fontWeight: '700' },

    section: {
      marginHorizontal: 16, marginBottom: 8,
      backgroundColor: t.card, borderRadius: 18,
      borderWidth: 1, borderColor: t.border, overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 15,
      borderTopWidth: 1, borderTopColor: t.border,
    },
    rowFirst: { borderTopWidth: 0 },
    rowLast: {},
    rowIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: `${BLUE}18`,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 13,
    },
    rowIconDanger: { backgroundColor: '#FDECEA' },
    rowLabel: { fontSize: 15, fontWeight: '500', color: t.text },
    rowLabelDanger: { color: '#E05252' },

    version: {
      fontSize: 12, color: t.textDim,
      textAlign: 'center', marginTop: 20,
    },
  });