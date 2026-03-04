import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';

export const fr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: { width: 28, alignItems: 'center', marginRight: 10 },
  labelWrap: { width: 88 },
  label: { fontSize: 13, fontWeight: '600' },
  valueWrap: { flex: 1, alignItems: 'flex-end' },
});


export const s = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { minWidth: 60 },
  headerTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  cancelTxt: { fontSize: 15, fontWeight: '500' },
  saveTxt: { fontSize: 15, fontWeight: '700', textAlign: 'right' },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },

  // Title card
  titleCard: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  titleInput: {
    fontSize: 20, fontWeight: '700',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  descInput: {
    fontSize: 14, lineHeight: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14,
    minHeight: 72, borderTopWidth: StyleSheet.hairlineWidth,
  },

  // Card
  card: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeRowLeft: { flexDirection: 'row', alignItems: 'center' },
  timeRowRight: { flexDirection: 'row', alignItems: 'center' },
  timeRowLabel: { fontSize: 14, fontWeight: '500' },
  timeValue: { fontSize: 14, fontWeight: '600' },
  addEndTxt: { fontSize: 14 },
  inlineInput: { fontSize: 14, fontWeight: '500', textAlign: 'right', maxWidth: 180 },

  // Priority pills
  pill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  pillTxt: { fontSize: 12, fontWeight: '600' },

  // Reminders card
  cardHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderTxt: { flex: 1, fontSize: 14, fontWeight: '600' },
  addRemBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addRemTxt: { fontSize: 13, color: BLUE, fontWeight: '600' },
  emptyRemTxt: { fontSize: 13, paddingHorizontal: 16, paddingVertical: 14 },
  remRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  remTxt: { flex: 1, fontSize: 14 },

  // Footer
  footer: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    backgroundColor: BLUE, borderRadius: 13,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Shared modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  calSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 2 },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetCancel: { fontSize: 15, fontWeight: '500', minWidth: 56 },
  sheetTitle: { fontSize: 15, fontWeight: '700' },
  sheetDone: { fontSize: 15, fontWeight: '700', minWidth: 56, textAlign: 'right' },
  wheelRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2, paddingVertical: 6 },

  // Calendar
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 8 },
  calNavBtn: { padding: 4 },
  calMonthTitle: { fontSize: 16, fontWeight: '700' },
  calDayRow: { flexDirection: 'row', marginBottom: 2 },
  calDayHdr: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingBottom: 6 },
  calRow: { flexDirection: 'row', marginBottom: 1 },
  calCell: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  calToday: { borderWidth: 1.5, borderColor: BLUE },
  calSel: { backgroundColor: BLUE },
  calCellTxt: { fontSize: 14, fontWeight: '500' },

  // Map sheet
  mapSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 32 },
  mapTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 4, marginBottom: 4 },
  mapSub: { fontSize: 13, textAlign: 'center', marginBottom: 14 },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth,
  },
  mapBtnTxt: { flex: 1, fontSize: 15, fontWeight: '600' },
  mapCancel: { alignItems: 'center', paddingVertical: 12 },

  // Category sheet
  catSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  catRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catTxt: { fontSize: 15, fontWeight: '500' },
  catAddInput: {
    borderWidth: 1, borderRadius: 9,
    paddingHorizontal: 11, paddingVertical: 8, fontSize: 14,
  },
  catAddBtn: {
    backgroundColor: BLUE, borderRadius: 9,
    paddingHorizontal: 14, paddingVertical: 8,
  },
});