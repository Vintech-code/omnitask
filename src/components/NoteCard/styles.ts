import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  noteCard: {
    minHeight: 104,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  noteIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteContent: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteCardTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  noteCardBody: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  metaRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteCardDate: { flexShrink: 1, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  checklistMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  checklistText: { fontSize: 10, fontWeight: '800' },
  noteCardTagsRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  noteCardTag: { minHeight: 22, borderRadius: 11, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagDot: { width: 5, height: 5, borderRadius: 3 },
  noteCardTagText: { fontSize: 9, fontWeight: '800' },
  moreTagsText: { fontSize: 10, fontWeight: '700' },
  noteCardImage: { width: 62, height: 62, borderRadius: 14 },
});
