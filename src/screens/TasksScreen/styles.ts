import { StyleSheet } from 'react-native';
import { BRAND_BLUE as BLUE } from '@/theme/colors';

export const styles = StyleSheet.create({
  safe: { flex: 1 },

  // -- Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    gap: 12,
  },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 27, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { marginTop: 2, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  floatingAddBtn: {
    position: 'absolute', right: 20,
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20,
  },

  // -- Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 20, marginTop: 8, marginBottom: 2,
    paddingHorizontal: 14, minHeight: 52,
  },
  searchInput: { flex: 1, fontSize: 15 },

  // -- Category chips
  catChipsScroll: { flexGrow: 0 },
  catChipsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10, gap: 8,
  },
  catChip: {
    minHeight: 38, paddingHorizontal: 15,
    borderRadius: 19, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 164 },
  columns: { flexDirection: 'row', gap: 8 },
  column: { flex: 1, gap: 8 },
  listColumn: { gap: 10 },
  listHeading: { marginHorizontal: 4, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  listCount: { fontSize: 12, fontWeight: '700' },
  notesGroup: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },

  // -- Note card
  noteCard: {
    borderRadius: 14, padding: 12,
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

  // -- Editor
  editorSafe: { flex: 1 },
  editorTopBar: {
    minHeight: 68,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    gap: 12,
  },
  editorIconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  editorHeading: { flex: 1 },
  editorHeadingTitle: { fontSize: 19, lineHeight: 24, fontWeight: '800' },
  editorHeadingSub: { marginTop: 1, fontSize: 10, lineHeight: 14, fontWeight: '600' },
  editorTopRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editorMoreBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  editorDoneBtn: { minWidth: 64, minHeight: 40, borderRadius: 20, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  editorDoneText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  optionsPanel: { marginHorizontal: 20, marginBottom: 8, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  colorPickerRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  optionsLabel: { width: 48, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  colorSwatch: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: 'transparent',
  },
  optionActions: { minHeight: 46, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  optionAction: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  optionActionText: { fontSize: 13, fontWeight: '700' },
  editorFlex: { flex: 1 },
  editorScroll: { flex: 1 },
  editorBody: { paddingHorizontal: 20, paddingBottom: 20 },
  editorPaper: { minHeight: 260, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderTopWidth: 4, padding: 18 },
  editorMetaWrap: {
    position: 'relative',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  editorMeta: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 8,
  },
  editorDatePill: { minHeight: 34, borderRadius: 17, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
  editorDate: { fontSize: 11, fontWeight: '600' },
  catSelector: {
    minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 17,
    paddingHorizontal: 11,
  },
  catSelectorText: { fontSize: 12, fontWeight: '700' },
  catDropdown: {
    position: 'absolute',
    right: 20,
    top: 46,
    width: 230,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    zIndex: 999,
  },
  catDropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.18)',
  },
  catDropdownText: { fontSize: 14, fontWeight: '600' },
  editorTitle: {
    fontSize: 28, fontWeight: '800',
    marginBottom: 12, lineHeight: 32,
  },
  editorText: {
    fontSize: 15, lineHeight: 24,
    minHeight: 170, textAlignVertical: 'top',
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
    flexDirection: 'row', alignItems: 'center', gap: 5,
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

  // Toolbar dock sits at the bottom of the flex column.
  toolbarDock: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  // -- Bottom editor bar
  editorBottomBar: {
    paddingVertical: 6,
  },
  editorBottomContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 },
  editorBarBtn: { minWidth: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toolbarDivider: { width: StyleSheet.hairlineWidth, height: 22, marginHorizontal: 2 },

  // -- Manage categories
  manageSafe: { flex: 1 },
  manageHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  manageBackBtn: { marginRight: 14 },
  manageTitle: { fontSize: 18, fontWeight: '700' },
  manageScroll: { flex: 1 },
  manageScrollContent: { padding: 20 },
  manageGroup: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    minHeight: 44,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 3,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 4,
  },
  editorTabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    minHeight: 36, gap: 6, borderRadius: 13,
  },
  editorTabTxt: { fontSize: 13, fontWeight: '700' },

  // -- Todo checklist
  todoAddRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 14,
  },
  todoAddInput: {
    flex: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15,
  },
  todoAddBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
  },
  todoEmptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', paddingVertical: 24 },
  todoItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  todoCheckbox: { padding: 2 },
  todoItemText: { flex: 1, fontSize: 15 },
  todoItemDone: { textDecorationLine: 'line-through', color: '#aaa' },
  todoRemoveBtn: { padding: 4 },

  // -- Format popover (bold / italic / headings)
  formatPopover: {
    borderRadius: 16,
    margin: 8,
    borderWidth: StyleSheet.hairlineWidth,
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
    justifyContent: 'center',
    minHeight: 38,
    paddingVertical: 8,
    borderRadius: 10,
  },
  formatBtnText: { fontSize: 15 },

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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fontChipActive: {
    backgroundColor: '#E6F0FB',
    borderColor: BLUE,
  },
  fontChipText: { fontSize: 13 },
  fontChipTextActive: { color: BLUE, fontWeight: '700' },

  // -- Emoji picker
  emojiPicker: {
    borderRadius: 16,
    margin: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
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
  savedTagsRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  savedTagText: { fontSize: 10, fontWeight: '800' },
  tagColorMark: { width: 6, height: 6, borderRadius: 3 },
  tagComposer: { margin: 8, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagComposerInput: { minWidth: 100, flex: 1, minHeight: 40, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 11, fontSize: 13 },
  tagPalette: { alignItems: 'center', gap: 5 },
  tagColorChoice: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  tagAddConfirm: { minHeight: 40, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  tagAddConfirmText: { color: '#fff', fontSize: 12, fontWeight: '800' },

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
