import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';

export const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: 1,
  },
  topBarTitle: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconBtn: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },

  // Next Alarm banner
  nextAlarmBanner: {
    backgroundColor: BLUE, borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22,
    shadowColor: BLUE, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  nextAlarmLeft: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  nextAlarmBody: { flex: 1 },
  nextAlarmLabel: {
    color: 'rgba(255,255,255,0.75)', fontSize: 10,
    fontWeight: '800', letterSpacing: 1.2, marginBottom: 4,
  },
  nextAlarmTime: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 2 },
  nextAlarmSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1.1 },
  sectionBadge: {
    backgroundColor: '#E6F0FB', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, color: BLUE, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15, color: '#bbb', fontWeight: '600' },
  emptyBtn: {
    backgroundColor: BLUE, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 11, marginTop: 2,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Alarm list item
  alarmRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16,
  },
  alarmLeft: { flex: 1 },
  alarmTimeRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 6 },
  alarmTime: { fontSize: 40, fontWeight: '300', lineHeight: 44 },
  alarmPeriod: { fontSize: 18, fontWeight: '400', marginBottom: 4 },
  alarmLabel: { fontSize: 15, marginBottom: 4, flexShrink: 1 },
  alarmSub: { fontSize: 12, marginTop: 4 },
  alarmRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBtn: { padding: 6 },
  dimText: { color: '#CCC' },
  divider: { height: 1, marginHorizontal: 16 },

  // Sleep tip
  sleepTipCard: {
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 18,
  },
  sleepTipIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(74,144,217,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  sleepTipTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  sleepTipText: { fontSize: 12, lineHeight: 19 },

  // Edit modal
  editSafe: { flex: 1 },
  editHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  editHeaderBtn: { width: 40, alignItems: 'center' },
  editHeaderTitle: { fontSize: 17, fontWeight: '700' },

  // Wheel picker
  pickerContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, gap: 4,
  },

  // Settings panel
  settingsPanel: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingValue: { fontSize: 14 },
  settingDivider: { height: 1, marginHorizontal: 16 },

  // Sub-modals (Repeat, Snooze)
  subOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  subSheet: {
    backgroundColor: '#2A2A2A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 8, paddingHorizontal: 20,
  },
  subTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
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
  subActionDone: { fontSize: 16, color: BLUE, fontWeight: '700' },

  // Sound modal
  soundSection: {
    fontSize: 12, fontWeight: '700', color: '#999',
    letterSpacing: 0.8, marginHorizontal: 24, marginTop: 20, marginBottom: 6,
  },

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