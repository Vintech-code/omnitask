import { fontFamily } from '@/theme/typography';
import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';

export const calS = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 17, fontFamily: fontFamily.extrabold },
  dayNamesRow: { flexDirection: 'row', marginBottom: 4 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: fontFamily.bold, paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%` as any, alignItems: 'center', paddingVertical: 6, minHeight: 44 },
  dayNum: { fontSize: 14, fontFamily: fontFamily.medium },
  todayNum: { color: BLUE, fontFamily: fontFamily.extrabold },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dayEventsTitle: { fontSize: 12, fontFamily: fontFamily.extrabold, letterSpacing: 1, marginBottom: 8 },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  eventRowTitle: { fontSize: 14, fontFamily: fontFamily.semibold, marginBottom: 2 },
  eventRowTime: { fontSize: 12 },
});


export const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0,
  },
  topBarTitle: { flex: 1, fontSize: 25, fontFamily: fontFamily.bold, textAlign: 'left', marginLeft: 14, letterSpacing: -0.4 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 124 },

  statRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  statCard: { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1 },
  statCardBlue: {},
  statCardWhite: {},
  statLabel: { fontSize: 10, fontFamily: fontFamily.extrabold, letterSpacing: 0.8, marginBottom: 3 },
  statValueBlue: { fontSize: 22, fontFamily: fontFamily.extrabold },
  statValueDark: { fontSize: 13, fontFamily: fontFamily.bold, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  sectionTitle: { flex: 1, fontSize: 11, fontFamily: fontFamily.extrabold, letterSpacing: 1 },
  manageAllBtn: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
  manageAllText: { fontSize: 12, color: BLUE, fontFamily: fontFamily.semibold },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontFamily: fontFamily.bold },
  emptySub: { fontSize: 12 },
  emptyAddBtn: {
    backgroundColor: BLUE, borderRadius: 999,
    minHeight: 48, paddingHorizontal: 22, justifyContent: 'center', marginTop: 8,
  },
  emptyAddText: { color: '#fff', fontSize: 14, fontFamily: fontFamily.bold },

  alarmCard: {
    flexDirection: 'row', borderRadius: 22, borderWidth: 1,
    marginBottom: 10, overflow: 'hidden',
  },
  alarmCardBody: { flex: 1, paddingHorizontal: 16, paddingVertical: 14 },

  alarmTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  alarmTimeBlock: { flexDirection: 'row', alignItems: 'flex-end' },
  alarmTime: { fontSize: 22, fontFamily: fontFamily.bold, lineHeight: 26 },
  alarmPeriod: { fontSize: 12, fontFamily: fontFamily.semibold, marginBottom: 2 },
  alarmTimeInactive: { color: '#CCC' },
  alarmTopActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  alarmTitle: { fontSize: 16, fontFamily: fontFamily.bold, marginBottom: 5 },
  alarmTitleInactive: { color: '#BBB' },

  alarmEventRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  alarmEventText: { fontSize: 12, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusGoing: { backgroundColor: '#E9F7EF' },
  statusText: { fontSize: 10, fontFamily: fontFamily.bold, textTransform: 'capitalize' },
  statusTextGoing: { color: '#27AE60' },

  alarmMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7, flexWrap: 'wrap' },
  alarmMetaBlue: { fontSize: 11, color: BLUE, fontFamily: fontFamily.semibold, maxWidth: 120 },
  alarmMetaText: { fontSize: 11 },
  alarmMetaDot: { fontSize: 11 },
  repeatBadge: {
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  repeatBadgeText: { fontSize: 10, fontFamily: fontFamily.bold },

  alarmBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  chipText: { fontSize: 11, fontFamily: fontFamily.semibold },
  categoryChip: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  categoryChipText: { fontSize: 11, color: BLUE, fontFamily: fontFamily.bold },
  priorityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  priorityBadgeText: { fontSize: 11, fontFamily: fontFamily.bold },

});
