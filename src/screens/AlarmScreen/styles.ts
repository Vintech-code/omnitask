import { fontFamily } from '@/theme/typography';
import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';

export const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0,
  },
  topBarTitle: { fontSize: 26, fontFamily: fontFamily.bold, flex: 1, textAlign: 'left', marginLeft: 14, letterSpacing: -0.4 },
  iconBtn: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 124 },

  // Next Alarm banner
  nextAlarmBanner: {
    borderRadius: 24, padding: 18, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22,
  },
  nextAlarmLeft: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  nextAlarmBody: { flex: 1 },
  nextAlarmLabel: {
    fontSize: 10,
    fontFamily: fontFamily.extrabold, letterSpacing: 1.2, marginBottom: 4,
  },
  nextAlarmTime: { fontSize: 17, fontFamily: fontFamily.extrabold, marginBottom: 2 },
  nextAlarmSub: { fontSize: 12 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 11, fontFamily: fontFamily.extrabold, color: '#999', letterSpacing: 1.1 },
  sectionBadge: {
    backgroundColor: '#E6F0FB', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, color: BLUE, fontFamily: fontFamily.bold },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15, color: '#bbb', fontFamily: fontFamily.semibold },
  emptyBtn: {
    backgroundColor: BLUE, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 11, marginTop: 2,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: fontFamily.bold },

  // Alarm list item
  alarmRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16,
    borderRadius: 22, borderWidth: 1, marginTop: 10,
  },
  alarmLeft: { flex: 1 },
  alarmTimeRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 6 },
  alarmTime: { fontSize: 40, fontFamily: fontFamily.light, lineHeight: 44 },
  alarmPeriod: { fontSize: 18, fontFamily: fontFamily.regular, marginBottom: 4 },
  alarmLabel: { fontSize: 15, marginBottom: 4, flexShrink: 1 },
  alarmSub: { fontSize: 12, marginTop: 4 },
  alarmRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBtn: { padding: 6 },
  dimText: { color: '#CCC' },
  divider: { height: 0, marginHorizontal: 16 },

  // Sleep tip
  sleepTipCard: {
    borderRadius: 22, padding: 16, borderWidth: 1,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 18,
  },
  sleepTipIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(74,144,217,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  sleepTipTitle: { fontSize: 14, fontFamily: fontFamily.extrabold, marginBottom: 4 },
  sleepTipText: { fontSize: 12, lineHeight: 19 },

  // Edit modal
  editSafe: { flex: 1 },
  editHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  editHeaderBtn: { width: 40, alignItems: 'center' },
  editHeaderTitle: { fontSize: 17, fontFamily: fontFamily.bold },
  editHeaderDoneBtn: { minWidth: 48, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  editHeaderDoneText: { fontSize: 15, fontFamily: fontFamily.bold },

  // Wheel picker
  pickerContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, gap: 4,
  },

  // Settings panel
  settingsPanel: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingLabel: { fontSize: 15, fontFamily: fontFamily.medium },
  settingValue: { fontSize: 14 },
  settingDivider: { height: 1, marginHorizontal: 16 },

  // Sub-modals (Repeat, Snooze)
  subOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  subSheet: {
    backgroundColor: '#2A2A2A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 8, paddingHorizontal: 20,
  },
  subTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#fff', marginBottom: 12 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  checkLabel: { fontSize: 16, color: '#DDD' },
  checkbox: {
    width: 26, height: 26, borderRadius: 6,
    borderWidth: 2, borderColor: '#555',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BLUE, borderColor: BLUE },
  radioOuter: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#555',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: BLUE },
  radioInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: BLUE },
  subActions: { flexDirection: 'row', marginTop: 10, marginBottom: 6 },
  subActionBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  subActionDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 },
  subActionCancel: { fontSize: 16, color: '#888' },
  subActionDone: { fontSize: 16, color: BLUE, fontFamily: fontFamily.bold },

  // Sound modal
  soundSection: {
    fontSize: 13, fontFamily: fontFamily.bold, color: '#999',
    letterSpacing: 0.5, marginHorizontal: 20, marginTop: 24, marginBottom: 10,
  },
  soundScroll: { paddingBottom: 32 },
  soundHelpCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 16, padding: 14,
    borderRadius: 18, borderWidth: 1,
  },
  soundHelpIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  soundHelpCopy: { flex: 1 },
  soundHelpTitle: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.bold, marginBottom: 2 },
  soundHelpText: { fontSize: 14, lineHeight: 19 },
  soundPanel: {
    marginHorizontal: 20, borderRadius: 20, borderWidth: 1, overflow: 'hidden',
  },
  soundAddRow: {
    minHeight: 72, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  soundAddIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  soundRow: {
    minHeight: 72, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center',
  },
  soundLabelWrap: { flex: 1, minWidth: 0, paddingRight: 10 },
  soundRowTitle: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily.semibold },
  soundRowMeta: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  soundActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  previewBtn: {
    minWidth: 82, height: 40, borderRadius: 20,
    paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  previewBtnText: { fontSize: 13, fontFamily: fontFamily.bold },
  soundDivider: { height: 1, marginLeft: 16 },
  soundEmptyText: { fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 16 },

  // Label modal
  labelSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24,
  },
  labelInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
    marginBottom: 8,
  },
});
