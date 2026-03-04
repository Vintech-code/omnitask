import { StyleSheet } from 'react-native';
import { BRAND_BLUE } from '@/theme/colors';

export const styles = StyleSheet.create({
  noteCard: {
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
    lineHeight: 20,
  },
  noteCardBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  noteCardTagsRow: { marginBottom: 8 },
  noteCardTag: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 5,
  },
  noteCardTagText: { fontSize: 10, fontWeight: '700' },
  noteCardDate: { fontSize: 11, marginTop: 2 },
  noteCardTodoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74,144,217,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  noteCardTodoBadgeTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_BLUE,
  },
  noteCardImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginTop: 8,
  },
});
