import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';

export const s = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0,
  },
  topTitle: { flex: 1, fontSize: 20, fontWeight: '700', marginHorizontal: 4 },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8 },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36 },
  heroCard: {
    borderRadius: 26, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden', marginBottom: 10,
  },
  heroAccent: { height: 5 },
  heroBody: { padding: 16 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 22, fontWeight: '800', marginBottom: 14, lineHeight: 28 },
  datetimeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  datetimeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  datetimeText: { fontSize: 13, fontWeight: '700' },
  card: {
    borderRadius: 22, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10, overflow: 'hidden',
  },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  alarmRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  alarmIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  alarmLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  alarmSub: { fontSize: 12, fontWeight: '500' },
  notesText: { paddingHorizontal: 16, paddingBottom: 16, fontSize: 14, lineHeight: 22 },
  mapBox: {
    height: 130, marginHorizontal: 16, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden',
  },
  mapGrid: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-around', padding: 10,
  },
  mapLine: { height: 1 },
  directionsChip: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  directionsText: { fontSize: 12, fontWeight: '700', color: BLUE },
  locationLabel: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14 },
  locationText: { flex: 1, fontSize: 14, fontWeight: '600' },
  reminderItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  reminderDot: { width: 8, height: 8, borderRadius: 4 },
  reminderText: { fontSize: 14, fontWeight: '500' },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { fontSize: 13, flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '700', marginRight: 8 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 16, borderWidth: 1, marginTop: 4,
  },
  deleteTxt: { fontSize: 15, fontWeight: '700' },
});
