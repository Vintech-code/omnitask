import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';

export const fs = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  input: { flex: 1, fontSize: 15, color: '#222' },
});

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  back: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  scroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40, alignItems: 'center' },

  /* Avatar */
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8E4F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C8BFEA',
    borderStyle: 'dashed',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarLabel: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 4 },
  avatarSub: { fontSize: 13, color: '#999', marginBottom: 4 },

  /* Checkbox */
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 22 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BLUE,
    marginRight: 10,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BLUE },
  checkText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },
  checkLink: { color: BLUE, fontWeight: '600' },

  /* Button */
  btnPrimary: {
    width: '100%',
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  /* Footer */
  signInRow: { flexDirection: 'row', marginBottom: 28 },
  gray: { color: '#999', fontSize: 14 },
  link: { color: BLUE, fontWeight: '700', fontSize: 14 },

  /* Badge */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  badgeIcon: { marginRight: 12 },
  badgeTitle: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 3 },
  badgeSub: { fontSize: 12, color: '#888', lineHeight: 17 },
});