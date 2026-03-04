import { StyleSheet } from 'react-native';

export const mb = StyleSheet.create({
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E8E8E8', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

export const st = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, width: 38 },
  headerTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 12 },

  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  kpiVal: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  section: {
    borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  sectionRight: { fontSize: 12, fontWeight: '600' },

  focusRow: { flexDirection: 'row', alignItems: 'center' },
  focusTimeLabel: { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  focusTimeVal: { fontSize: 17, fontWeight: '800', marginBottom: 5 },

  todoProgressRow: { flexDirection: 'row', alignItems: 'center' },
  statLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLineLabel: { fontSize: 12, fontWeight: '500' },
  statLineVal: { fontSize: 14, fontWeight: '700' },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  barLabel: { width: 80, fontSize: 12, fontWeight: '600' },
  barCount: { width: 24, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  alarmStatusRow: { flexDirection: 'row', gap: 10 },
  alarmBadge: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 3 },
  alarmBadgeNum: { fontSize: 22, fontWeight: '800' },
  alarmBadgeLbl: { fontSize: 11, fontWeight: '600' },
});