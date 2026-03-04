import { StyleSheet } from 'react-native';

export const pom = StyleSheet.create({
  scroll: { alignItems: 'center', paddingTop: 28, paddingHorizontal: 24 },
  modePills: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  modePill: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 20, backgroundColor: '#F0F0F0',
  },
  modePillText: { fontSize: 13, fontWeight: '600', color: '#888' },
  ringWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  modeLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  digits: { fontSize: 52, fontWeight: '800', letterSpacing: -1, lineHeight: 58 },
  runSub: { fontSize: 13, marginTop: 6, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 32, marginBottom: 36 },
  ctrlBtn: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', borderRadius: 16, borderWidth: 1,
    paddingVertical: 18, marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32 },
  statVal: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  linkRow: { width: '100%', alignItems: 'center', paddingBottom: 24, paddingTop: 4 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  linkBtnText: { fontSize: 14, fontWeight: '700' },
  linkedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 9,
    maxWidth: '90%',
  },
  linkedChipText: { fontSize: 14, fontWeight: '600', flex: 1 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32,
    maxHeight: '60%',
  },
  pickerTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1,
  },
  pickerRowText: { fontSize: 15, fontWeight: '500', flex: 1 },
});


export const sw = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  displayWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 20 },
  digits: { fontSize: 64, fontWeight: '300', letterSpacing: -1, fontVariant: ['tabular-nums'] as any },
  lapHint: { fontSize: 16, marginTop: 10 },
  btnRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 48, paddingVertical: 32,
  },
  sideBtn: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  sideBtnText: { fontSize: 17, fontWeight: '600' },
  mainBtn: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  mainBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  lapList: { width: '100%', flex: 1 },
  lapRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 13,
    borderTopWidth: 1,
  },
  lapNum: { width: 60, fontSize: 15 },
  lapSplit: { flex: 1, fontSize: 15, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] as any },
  lapTotal: { width: 90, fontSize: 14, textAlign: 'right', fontVariant: ['tabular-nums'] as any },
});


export const main = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20, marginVertical: 12,
    borderRadius: 14, padding: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 11,
  },
  tabBtnActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },
  tabTextActive: {},
});