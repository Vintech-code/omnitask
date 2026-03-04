import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';

export const calS = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 17, fontWeight: '800' },
  dayNamesRow: { flexDirection: 'row', marginBottom: 4 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%` as any, alignItems: 'center', paddingVertical: 6, minHeight: 44 },
  dayNum: { fontSize: 14, fontWeight: '500' },
  todayNum: { color: BLUE, fontWeight: '800' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dayEventsTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  eventRowTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  eventRowTime: { fontSize: 12 },
});


export const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 14 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20 },

  statRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 12, padding: 10 },
  statCardBlue: {},
  statCardWhite: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 3 },
  statValueBlue: { fontSize: 22, fontWeight: '800' },
  statValueDark: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4,
  },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  sectionTitle: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  manageAllBtn: {},
  manageAllText: { fontSize: 12, color: BLUE, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 12 },
  emptyAddBtn: {
    backgroundColor: BLUE, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 8,
  },
  emptyAddText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  alarmCard: {
    flexDirection: 'row', borderRadius: 12,
    marginBottom: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  alarmLeftBorder: { width: 4, backgroundColor: BLUE },
  alarmCardBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },

  alarmTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  alarmTimeBlock: { flexDirection: 'row', alignItems: 'flex-end' },
  alarmTime: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  alarmPeriod: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  alarmTimeInactive: { color: '#CCC' },
  alarmTopActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  alarmTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  alarmTitleInactive: { color: '#BBB' },

  alarmEventRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  alarmEventText: { fontSize: 12, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusGoing: { backgroundColor: '#E9F7EF' },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  statusTextGoing: { color: '#27AE60' },

  alarmMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7, flexWrap: 'wrap' },
  alarmMetaBlue: { fontSize: 11, color: BLUE, fontWeight: '600', maxWidth: 120 },
  alarmMetaText: { fontSize: 11 },
  alarmMetaDot: { fontSize: 11 },
  repeatBadge: {
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  repeatBadgeText: { fontSize: 10, fontWeight: '700' },

  alarmBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  categoryChip: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  categoryChipText: { fontSize: 11, color: BLUE, fontWeight: '700' },
  priorityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  priorityBadgeText: { fontSize: 11, fontWeight: '700' },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
  },
});