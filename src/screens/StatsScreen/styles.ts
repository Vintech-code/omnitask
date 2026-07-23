import { fontFamily } from '@/theme/typography';
import { StyleSheet } from 'react-native';

export const mb = StyleSheet.create({
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E8E8E8', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

export const st = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: 'transparent', borderBottomWidth: 0,
  },
  backBtn: { padding: 4, width: 38 },
  headerTitle: { fontSize: 25, fontFamily: fontFamily.bold, textAlign: 'left', flex: 1, marginLeft: 12, letterSpacing: -0.4 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 12 },

  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1, borderRadius: 20, padding: 12, alignItems: 'center', gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kpiIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  kpiVal: { fontSize: 20, fontFamily: fontFamily.extrabold },
  kpiLabel: { fontSize: 10, fontFamily: fontFamily.bold, letterSpacing: 0.4 },

  section: {
    borderRadius: 22, padding: 16, borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  sectionTitle: { flex: 1, fontSize: 14, fontFamily: fontFamily.bold },
  sectionRight: { fontSize: 12, fontFamily: fontFamily.semibold },

  focusRow: { flexDirection: 'row', alignItems: 'center' },
  focusTimeLabel: { fontSize: 11, fontFamily: fontFamily.semibold, marginBottom: 3 },
  focusTimeVal: { fontSize: 17, fontFamily: fontFamily.extrabold, marginBottom: 5 },

  todoProgressRow: { flexDirection: 'row', alignItems: 'center' },
  statLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLineLabel: { fontSize: 12, fontFamily: fontFamily.medium },
  statLineVal: { fontSize: 14, fontFamily: fontFamily.bold },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  barLabel: { width: 80, fontSize: 12, fontFamily: fontFamily.semibold },
  barCount: { width: 24, fontSize: 12, fontFamily: fontFamily.bold, textAlign: 'right' },

  alarmStatusRow: { flexDirection: 'row', gap: 10 },
  alarmBadge: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 3 },
  alarmBadgeNum: { fontSize: 22, fontFamily: fontFamily.extrabold },
  alarmBadgeLbl: { fontSize: 11, fontFamily: fontFamily.semibold },
});
