import { StyleSheet } from 'react-native';

export const sr = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  backBtn: { padding: 6 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  filtersRow: {
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },

  // Empty / tips
  emptyHeading: { fontSize: 14, fontWeight: '700', marginBottom: 16, letterSpacing: 0.3 },
  tipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10,
  },
  tipIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },

  // No results
  noResultsWrap: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32, gap: 12 },
  noResultsIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  noResultsTitle: { fontSize: 18, fontWeight: '800' },
  noResultsSub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },

  // Results header
  countTxt: { fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Section headers (grouped view)
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  sectionCount: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 2 },
  sectionCountText: { fontSize: 11, fontWeight: '800' },

  // Result card
  resultCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 14, marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  resultIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  resultSub: { fontSize: 12, lineHeight: 17 },
});