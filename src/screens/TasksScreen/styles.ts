import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';

export const styles = StyleSheet.create({
  safe: { flex: 1 },

  // -- Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 19, fontWeight: '800', flex: 1, textAlign: 'center' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 16 },

  // -- Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 14, marginTop: 10, marginBottom: 2,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },

  // -- Category chips
  catChipsScroll: { flexGrow: 0 },
  catChipsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  catChipActive: {},
  catChipText: { fontSize: 13, fontWeight: '600' },
  catChipTextActive: {},
  catChipAdd: {
    width: 34, height: 34, borderRadius: 10,
    borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },

  // -- Grid
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 8, paddingTop: 10 },
  columns: { flexDirection: 'row', gap: 8 },
  column: { flex: 1, gap: 8 },

  // -- Note card
  noteCard: {
    borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  noteCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 5, lineHeight: 20 },
  noteCardBody: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  noteCardTagsRow: { marginBottom: 8 },
  noteCardTag: {
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2,
    marginRight: 5,
  },
  noteCardTagText: { fontSize: 10, fontWeight: '700' },
  noteCardDate: { fontSize: 11, marginTop: 2 },

  // -- Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13 },

  // -- FAB
  fab: {
    position: 'absolute', right: 20, bottom: 24,
  },
  fabInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
    shadowColor: BLUE, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },

  // -- Editor
  editorSafe: { flex: 1 },
  editorTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  editorIconBtn: { padding: 6 },
  editorTopCenter: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  editorTopRight: { flexDirection: 'row', alignItems: 'center' },
  colorPickerRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  colorSwatch: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorSwatchActive: { borderColor: '#555' },
  editorBody: { paddingHorizontal: 18, paddingBottom: 20 },
  editorMetaWrap: {
    position: 'relative',
    zIndex: 10,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  editorMeta: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
  },
  editorDate: { fontSize: 13, color: '#888' },
  catSelector: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#DDD', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.6)',
  },
  catSelectorText: { fontSize: 13, color: '#555', fontWeight: '600' },
  catDropdown: {
    position: 'absolute',
    right: 0,
    top: 46,
    width: 230,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E8E8E8',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, elevation: 20,
    zIndex: 999,
  },
  catDropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  catDropdownText: { fontSize: 15, color: '#333', fontWeight: '500' },
  editorTitle: {
    fontSize: 26, fontWeight: '700', color: '#111',
    marginBottom: 12, lineHeight: 32,
  },
  editorText: {
    fontSize: 15, color: '#333', lineHeight: 24,
    minHeight: 140, textAlignVertical: 'top',
  },

  // -- Floating tags bar
  floatingTagsBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.07)',
    paddingVertical: 8,
  },
  floatingTagsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 8,
  },
  // -- Add-tag overlay
  addTagOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    zIndex: 100,
  },
  addTagOverlayBg: {
    position: 'absolute',
    top: -9999, bottom: 0, left: 0, right: 0,
  },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  editorTag: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  editorTagText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  addTagBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1.5, borderColor: '#CCC', borderStyle: 'dashed',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  addTagBtnText: { fontSize: 11, color: '#888', fontWeight: '700' },
  addTagForm: {
    marginTop: 10, backgroundColor: '#F8F8F8', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  addTagInput: {
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: '#111', marginBottom: 10,
  },
  addTagColorLabel: { fontSize: 11, color: '#999', fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  addTagPalette: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  tagColorDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  tagColorDotActive: { borderWidth: 2.5, borderColor: '#555' },
  addTagActions: { flexDirection: 'row', gap: 10 },
  addTagCancel: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center',
  },
  addTagCancelText: { fontSize: 14, color: '#888', fontWeight: '600' },
  addTagConfirm: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: BLUE, alignItems: 'center',
  },
  addTagConfirmText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  // -- Toolbar dock � sits at bottom of the flex column (pan mode shifts window up automatically)
  toolbarDock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.07)',
  },

  // -- Bottom editor bar
  editorBottomBar: {
    paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.07)',
  },
  editorBarBtn: { padding: 8 },

  // -- Manage categories
  manageSafe: { flex: 1 },
  manageHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  manageBackBtn: { marginRight: 14 },
  manageTitle: { fontSize: 18, fontWeight: '700' },
  manageBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF8E1', borderRadius: 12,
    marginHorizontal: 14, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#FFE082',
  },
  manageBannerText: { flex: 1, fontSize: 13, color: '#9C6E00', lineHeight: 18 },
  manageCatRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  manageCatName: { fontSize: 16, fontWeight: '600' },
  manageCatCount: { fontSize: 14, fontWeight: '400' },
  addCatBar: {
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4,
    borderTopWidth: 1,
  },
  addCatInput: {
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15,
    borderWidth: 1,
  },
  addCatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: BLUE, borderRadius: 14,
    paddingVertical: 16, marginHorizontal: 14, marginBottom: 16, marginTop: 8,
  },
  addCatBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  // -- Note card todo badge
  noteCardTodoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(74,144,217,0.12)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  noteCardTodoBadgeTxt: { fontSize: 11, fontWeight: '700', color: BLUE },
  noteCardImage: {
    width: '100%', height: 100, borderRadius: 8, marginTop: 8,
  },

  // -- Editor image strip
  imageStrip: { marginTop: 10 },
  imageThumbWrap: { position: 'relative' },
  imageThumb: { width: 120, height: 90, borderRadius: 10 },
  imageDeleteBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12,
  },

  // -- Editor tab bar
  editorTabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  editorTabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11,
  },
  editorTabBtnActive: {
    borderBottomWidth: 2, borderBottomColor: BLUE,
  },
  editorTabTxt: { fontSize: 13, fontWeight: '700' },

  // -- Todo checklist
  todoAddRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 14,
  },
  todoAddInput: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#DDD',
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#111', backgroundColor: '#FAFAFA',
  },
  todoAddBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
  },
  todoEmptyText: { fontSize: 14, color: '#bbb', textAlign: 'center', paddingVertical: 20 },
  todoItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  todoCheckbox: { padding: 2 },
  todoItemText: { flex: 1, fontSize: 15, color: '#333' },
  todoItemDone: { textDecorationLine: 'line-through', color: '#aaa' },
  todoRemoveBtn: { padding: 4 },

  // -- Format popover (bold / italic / headings)
  formatPopover: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  formatBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  formatBtnText: { fontSize: 15, color: '#222' },

  // -- Font family picker row
  fontRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
  },
  fontChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fontChipActive: {
    backgroundColor: '#E6F0FB',
    borderColor: BLUE,
  },
  fontChipText: { fontSize: 13, color: '#444' },
  fontChipTextActive: { color: BLUE, fontWeight: '700' },

  // -- Emoji picker
  emojiPicker: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  emojiBtn: {
    width: '12%',
    alignItems: 'center',
    padding: 4,
  },
  emojiText: { fontSize: 22 },

  // -- Link insert modal
  linkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  linkSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 12,
  },
  linkSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  linkInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#FAFAFA',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  linkCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F0F0F5',
  },
  linkConfirm: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: BLUE,
  },
});