import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
  FlatList,
  Animated,
  RefreshControl,
  Share,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { BurgerMenu } from '@/components/BurgerMenu';
import { OrganizerSwitch, OrganizerSection } from '@/components/OrganizerSwitch';
import { NoteCard } from '@/components/NoteCard';
import { useTaskStore } from '@/context/TaskStore';
import { Note, NoteTag, ChecklistItem } from '@/types/note';
import { BRAND_BLUE as BLUE, CARD_COLORS, TAG_PALETTE } from '@/theme/colors';
import { FONT_FAMILIES } from '@/theme/typography';
import { formatDate } from '@/utils/date';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { styles } from './styles';
import { AppBackground, ScreenSkeleton } from '@/components/ui';
import EventAlarmsScreen from '@/screens/EventAlarmsScreen';

const EMOJI_LIST = [
  '😀','😂','😍','🥰','😎','🤩','🥳','😜','🤔','😇','🙃','😴',
  '😢','😡','🤯','😱','🥶','🔥','💯','✅','❌','⭐','💡','📌',
  '🎉','🎯','🚀','💪','🙏','👏','🤝','👀','💬','📝','📅','⏰',
  '🌟','🌈','☕','🍕','🎵','🎮','📚','💻','🏆','❤️','💙','💚',
];

export default function TasksScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { notes, categories, isLoading, addNote, updateNote, removeNote, addCategory: storeAddCat, renameCategory: storeRenameCat, removeCategory: storeRemoveCat } = useTaskStore();
  const [refreshing, setRefreshing] = useState(false);
  const [organizerSection, setOrganizerSection] = useState<OrganizerSection>('notes');
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 700); };

  useEffect(() => {
    const requestedSection = route?.params?.section;
    if (requestedSection === 'notes' || requestedSection === 'events') {
      setOrganizerSection(requestedSection);
    }
  }, [route?.params?.section]);

  // -- Notes state (now from TaskStore) ------------------------------------
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // -- Search --------------------------------------------------------------
  const [searchQuery, setSearchQuery]     = useState('');

  // -- Editor modal state ---------------------------------------------------
  const [editorVisible, setEditorVisible]         = useState(false);
  const [editNote, setEditNote]                   = useState<Note | null>(null);
  const [edTitle, setEdTitle]                     = useState('');
  const [edBody, setEdBody]                       = useState('');
  const [edCategory, setEdCategory]               = useState('Personal');
  const [edCardColor, setEdCardColor]             = useState<string>(CARD_COLORS[0]);
  const [edTags, setEdTags]                       = useState<NoteTag[]>([]);
  const [edTodos, setEdTodos]                     = useState<ChecklistItem[]>([]);
  const [editorTab, setEditorTab]                 = useState<'note' | 'todos'>('note');
  const [newTodoText, setNewTodoText]             = useState('');
  const [catPickerVisible, setCatPickerVisible]   = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [addTagMode, setAddTagMode]               = useState(false);
  const [newTagName, setNewTagName]               = useState('');
  const [newTagColor, setNewTagColor]             = useState<string>(TAG_PALETTE[0]);
  const [edImages, setEdImages]                   = useState<string[]>([]);

  // -- Undo / Redo history -------------------------------------------------
  const undoStack      = useRef<string[]>([]);
  const redoStack      = useRef<string[]>([]);
  const lastUndoPushTs = useRef(0);

  // -- Body cursor tracking -------------------------------------------------
  const bodyRef  = useRef<TextInput>(null);
  const [bodySel, setBodySel] = useState({ start: 0, end: 0 });

  // -- Formatting toolbar extra state --------------------------------------
  const [emojiPickerVisible,  setEmojiPickerVisible]  = useState(false);
  const [formatPopoverVisible, setFormatPopoverVisible] = useState(false);
  const [linkModalVisible,    setLinkModalVisible]    = useState(false);
  const [linkUrl,  setLinkUrl]  = useState('');
  const [linkText, setLinkText] = useState('');
  const [fontPickerVisible, setFontPickerVisible] = useState(false);
  const [edFontFamily, setEdFontFamily] = useState<string | undefined>(undefined);

  // -- Keyboard height tracker (Android Modal workaround) ------------------
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const [manageCatVisible, setManageCatVisible] = useState(false);
  const [newCatName, setNewCatName]               = useState('');
  const [renamingCategory, setRenamingCategory]   = useState<string | null>(null);
  const [renameCategoryValue, setRenameCategoryValue] = useState('');

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    storeAddCat(name);
    setNewCatName('');
  };

  const filteredNotes = useMemo(() => {
    let list = activeCategory === 'All' ? notes : notes.filter(n => n.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [notes, activeCategory, searchQuery]);

  // -- Open editor ----------------------------------------------------------
  const openNew = () => {
    setEditNote(null);
    setEdTitle('');
    setEdBody('');
    setEdTodos([]);
    setEditorTab('note');
    setEdCategory(activeCategory !== 'All' ? activeCategory : 'Personal');
    setEdCardColor(CARD_COLORS[0]);
    setEdTags([]);
    setAddTagMode(false);
    setEdImages([]);
    setEdFontFamily(undefined);
    undoStack.current = [];
    redoStack.current = [];
    setEmojiPickerVisible(false);
    setFormatPopoverVisible(false);
    setEditorVisible(true);
  };

  const openEdit = (note: Note) => {
    setEditNote(note);
    setEdTitle(note.title);
    setEdBody(note.body);
    setEdTodos(note.todos ? [...note.todos] : []);
    setEditorTab('note');
    setEdCategory(note.category);
    setEdCardColor(note.cardColor);
    setEdTags([...note.tags]);
    setAddTagMode(false);
    setEdImages(note.images ? [...note.images] : []);
    setEdFontFamily(note.fontFamily);
    undoStack.current = [];
    redoStack.current = [];
    setEmojiPickerVisible(false);
    setFormatPopoverVisible(false);
    setEditorVisible(true);
  };

  // -- Save note ------------------------------------------------------------
  const saveNote = () => {
    if (!edTitle.trim() && !edBody.trim() && edTodos.length === 0) {
      setEditorVisible(false);
      return;
    }
    const now = Date.now();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editNote) {
      updateNote({ ...editNote, title: edTitle, body: edBody, category: edCategory, cardColor: edCardColor, tags: edTags, date: formatDate(editNote.timestamp), todos: edTodos, images: edImages, fontFamily: edFontFamily });
    } else {
      const newNote: Note = {
        id: now.toString(),
        title: edTitle.trim() || 'Untitled',
        body: edBody,
        date: formatDate(now),
        timestamp: now,
        category: edCategory,
        cardColor: edCardColor,
        tags: edTags,
        todos: edTodos,
        images: edImages,
        fontFamily: edFontFamily,
      };
      addNote(newNote);
      if (!categories.includes(edCategory)) storeAddCat(edCategory);
    }
    setEditorVisible(false);
  };

  // -- Share note ------------------------------------------------------------
  const shareNote = async () => {
    const title = edTitle.trim() || 'Note';
    const todoText = edTodos.length > 0
      ? '\n\nChecklist:\n' + edTodos.map(t => `${t.done ? '?' : '?'} ${t.text}`).join('\n')
      : '';
    const message = `${title}\n\n${edBody}${todoText}`.trim();
    try {
      await Share.share({ title, message });
    } catch {}
  };

  // -- Todo helpers ----------------------------------------------------------
  const addTodo = () => {
    const text = newTodoText.trim();
    if (!text) return;
    setEdTodos(prev => [...prev, { id: Date.now().toString(), text, done: false }]);
    setNewTodoText('');
  };
  const toggleTodo = (id: string) => setEdTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const removeTodo = (id: string) => setEdTodos(prev => prev.filter(t => t.id !== id));

  // -- Delete note ----------------------------------------------------------
  const deleteNote = (id: string) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        removeNote(id);
        setEditorVisible(false);
      }},
    ]);
  };

  // -- Tag helpers ----------------------------------------------------------
  const addTag = () => {
    const label = newTagName.trim().toUpperCase();
    if (!label) return;
    setEdTags(prev => [...prev, { label, color: newTagColor }]);
    setNewTagName('');
    setNewTagColor(TAG_PALETTE[0]);
    setAddTagMode(false);
  };

  // -- Category helpers ------------------------------------------------------
  const deleteCategory = (cat: string) => {
    Alert.alert('Delete Category', `Delete "${cat}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => storeRemoveCat(cat) },
    ]);
  };

  // -- Undo / Redo -----------------------------------------------------------
  const handleBodyChange = (text: string) => {
    const now = Date.now();
    if (now - lastUndoPushTs.current > 600) {
      undoStack.current = [...undoStack.current.slice(-49), edBody];
      redoStack.current = [];
      lastUndoPushTs.current = now;
    }
    setEdBody(text);
  };

  const undo = () => {
    if (!undoStack.current.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    redoStack.current = [edBody, ...redoStack.current.slice(0, 49)];
    setEdBody(undoStack.current.pop()!);
  };

  const redo = () => {
    if (!redoStack.current.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    undoStack.current = [...undoStack.current.slice(-49), edBody];
    const next = redoStack.current.shift()!;
    setEdBody(next);
  };

  // -- Text insertion helpers ------------------------------------------------
  const insertAtCursor = (text: string) => {
    const { start, end } = bodySel;
    const newBody = edBody.slice(0, start) + text + edBody.slice(end);
    handleBodyChange(newBody);
    const newPos = start + text.length;
    setTimeout(() => {
      bodyRef.current?.focus();
      (bodyRef.current as any)?.setNativeProps({ selection: { start: newPos, end: newPos } });
    }, 60);
  };

  const insertLinePrefix = (prefix: string) => {
    const { start } = bodySel;
    const before = edBody.slice(0, start);
    const lineStart = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    insertAtCursor(lineStart + prefix);
  };

  const wrapText = (open: string, close: string = open) => {
    const { start, end } = bodySel;
    if (start !== end) {
      // wrap selection
      const selected = edBody.slice(start, end);
      const newBody = edBody.slice(0, start) + open + selected + close + edBody.slice(end);
      handleBodyChange(newBody);
      setTimeout(() => bodyRef.current?.focus(), 60);
    } else {
      // insert markers and place cursor between them
      const newBody = edBody.slice(0, start) + open + close + edBody.slice(start);
      handleBodyChange(newBody);
      const newPos = start + open.length;
      setTimeout(() => {
        bodyRef.current?.focus();
        (bodyRef.current as any)?.setNativeProps({ selection: { start: newPos, end: newPos } });
      }, 60);
    }
  };

  // -- Image pick & insert ---------------------------------------------------
  const pickAndInsertImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to insert images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setEdImages(prev => [...prev, result.assets[0].uri]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // -- Note Card -------------------------------------------------------------
  // -- Render ----------------------------------------------------------------
  const allCatTabs = ['All', ...categories];

  if (organizerSection === 'events') {
    return (
      <EventAlarmsScreen
        navigation={navigation}
        organizerSection={organizerSection}
        onOrganizerSectionChange={setOrganizerSection}
      />
    );
  }

  if (isLoading) {
    return <ScreenSkeleton variant="list" />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
      <AppBackground />
      <View style={styles.header}>
        <BurgerMenu navigation={navigation} />
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notes</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textDim }]}>
            {notes.length === 0 ? 'Capture ideas and action items' : `${notes.length} note${notes.length === 1 ? '' : 's'} in your workspace`}
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Manage note categories"
            style={[styles.iconBtn, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}
            onPress={() => setManageCatVisible(true)}
          >
            <MaterialCommunityIcons name="shape-outline" size={21} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <OrganizerSwitch value={organizerSection} onChange={setOrganizerSection} />

      <View style={[styles.searchBar, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
          <Ionicons name="search-outline" size={16} color={theme.textDim} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search notes..."
            placeholderTextColor={theme.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textDim} />
            </TouchableOpacity>
          )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catChipsRow}
        style={[styles.catChipsScroll, { backgroundColor: 'transparent' }]}
      >
        {allCatTabs.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, { backgroundColor: activeCategory === cat ? theme.accent.soft : theme.glass.secondary, borderColor: theme.glass.border }]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.catChipText, { color: activeCategory === cat ? theme.accent.base : theme.textSub }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={[styles.scroll, { backgroundColor: 'transparent' }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textDim} />}>
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={theme.textDim} />
            <Text style={[styles.emptyTitle, { color: theme.textDim }]}>No notes yet</Text>
      <Text style={[styles.emptySub, { color: theme.textDim }]}>Use the orange add button to capture your first idea.</Text>
          </View>
        ) : (
          <View>
            <View style={styles.listHeading}>
              <Text style={[styles.listTitle, { color: theme.textDim }]}>
                {activeCategory === 'All' ? 'RECENT NOTES' : activeCategory.toUpperCase()}
              </Text>
              <Text style={[styles.listCount, { color: theme.textDim }]}>{filteredNotes.length}</Text>
            </View>
            <View style={[styles.notesGroup, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>
              {filteredNotes.map((note, index) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onPress={openEdit}
                  onDelete={deleteNote}
                  isLast={index === filteredNotes.length - 1}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Create note"
        activeOpacity={0.82}
        style={[
          styles.floatingAddBtn,
          {
            bottom: Math.max(insets.bottom, 8) + 92,
            backgroundColor: theme.accent.base,
          },
        ]}
        onPress={openNew}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ----------------------------------------------------------
          NOTE EDITOR MODAL
      ---------------------------------------------------------- */}
      <Modal
        visible={editorVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={saveNote}
      >
        <SafeAreaView style={[styles.editorSafe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
          <AppBackground />
          <View style={styles.editorTopBar}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close and save note"
              onPress={saveNote}
              style={[styles.editorIconBtn, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}
            >
              <Ionicons name="close" size={21} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.editorHeading}>
              <Text style={[styles.editorHeadingTitle, { color: theme.text }]}>{editNote ? 'Edit note' : 'New note'}</Text>
              <Text style={[styles.editorHeadingSub, { color: theme.textDim }]}>Saved to {edCategory}</Text>
            </View>
            <View style={styles.editorTopRight}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="More note options"
                onPress={() => setColorPickerVisible(value => !value)}
                style={styles.editorMoreBtn}
              >
                <Ionicons name="ellipsis-horizontal" size={21} color={theme.textSub} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editorDoneBtn, { backgroundColor: theme.accent.base }]} onPress={saveNote}>
                <Text style={styles.editorDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          {colorPickerVisible && (
            <View style={[styles.optionsPanel, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
              <View style={styles.colorPickerRow}>
                <Text style={[styles.optionsLabel, { color: theme.textDim }]}>COLOR</Text>
                {CARD_COLORS.map(color => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Change note color"
                    key={color}
                    style={[styles.colorSwatch, { backgroundColor: color }, edCardColor === color && { borderColor: theme.accent.base }]}
                    onPress={() => setEdCardColor(color)}
                  />
                ))}
              </View>
              <View style={[styles.optionActions, { borderTopColor: theme.divider }]}>
                <TouchableOpacity style={styles.optionAction} onPress={shareNote}>
                  <Ionicons name="share-outline" size={19} color={theme.textSub} />
                  <Text style={[styles.optionActionText, { color: theme.textSub }]}>Share</Text>
                </TouchableOpacity>
                {editNote ? (
                  <TouchableOpacity style={styles.optionAction} onPress={() => deleteNote(editNote.id)}>
                    <Ionicons name="trash-outline" size={19} color={theme.semantic.danger} />
                    <Text style={[styles.optionActionText, { color: theme.semantic.danger }]}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          <View style={styles.editorMetaWrap}>
            <View style={styles.editorMeta}>
              <View style={[styles.editorDatePill, { backgroundColor: theme.glass.secondary }]}>
                <Ionicons name="time-outline" size={14} color={theme.textDim} />
                <Text style={[styles.editorDate, { color: theme.textDim }]}>{editNote ? editNote.date : formatDate(Date.now())}</Text>
              </View>
              <TouchableOpacity style={[styles.catSelector, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]} onPress={() => setCatPickerVisible(v => !v)}>
                <MaterialCommunityIcons name="notebook-outline" size={15} color={theme.accent.base} />
                <Text style={[styles.catSelectorText, { color: theme.textSub }]}>{edCategory}</Text>
                <Ionicons name={catPickerVisible ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textDim} />
              </TouchableOpacity>
            </View>

            {/* Category dropdown overlay */}
            {catPickerVisible && (
              <View style={[styles.catDropdown, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
                <TouchableOpacity style={styles.catDropdownItem} onPress={() => { setManageCatVisible(true); setCatPickerVisible(false); }}>
                  <Ionicons name="add-circle-outline" size={16} color={BLUE} style={{ marginRight: 10 }} />
                  <Text style={[styles.catDropdownText, { color: BLUE }]}>Add</Text>
                </TouchableOpacity>
                {[...new Set([...categories, 'Uncategorized'])].map(c => (
                  <TouchableOpacity
                    key={c}
                    style={styles.catDropdownItem}
                    onPress={() => { setEdCategory(c); setCatPickerVisible(false); }}
                  >
                    <MaterialCommunityIcons name="notebook-outline" size={16} color={theme.textSub} style={{ marginRight: 10 }} />
                    <Text style={[styles.catDropdownText, { color: theme.text }]}>{c}</Text>
                    {edCategory === c && <Ionicons name="checkmark" size={16} color={BLUE} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={[styles.editorTabBar, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>
            <TouchableOpacity
              style={[styles.editorTabBtn, editorTab === 'note' && { backgroundColor: theme.glass.solid }]}
              onPress={() => setEditorTab('note')}
            >
              <Ionicons name="create-outline" size={15} color={editorTab === 'note' ? theme.accent.base : theme.textDim} />
              <Text style={[styles.editorTabTxt, { color: editorTab === 'note' ? theme.accent.base : theme.textDim }]}>Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editorTabBtn, editorTab === 'todos' && { backgroundColor: theme.glass.solid }]}
              onPress={() => setEditorTab('todos')}
            >
              <MaterialCommunityIcons name="checkbox-marked-outline" size={15} color={editorTab === 'todos' ? theme.accent.base : theme.textDim} />
              <Text style={[styles.editorTabTxt, { color: editorTab === 'todos' ? theme.accent.base : theme.textDim }]}>
                {edTodos.length > 0 ? `Checklist (${edTodos.filter(t => t.done).length}/${edTodos.length})` : 'Checklist'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.editorFlex}>
            <ScrollView
              style={styles.editorScroll}
              contentContainerStyle={[styles.editorBody, { paddingBottom: 20 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.editorPaper, { backgroundColor: theme.glass.primary, borderColor: theme.glass.border, borderTopColor: edCardColor }]}>
                <TextInput
                  style={[styles.editorTitle, { color: theme.text }]}
                  placeholder="Title"
                  placeholderTextColor={theme.textDim}
                  value={edTitle}
                  onChangeText={setEdTitle}
                  multiline
                  maxLength={120}
                />

                {editorTab === 'note' && (
                <>
                  <TextInput
                    ref={bodyRef}
                    style={[styles.editorText, { color: theme.textSub }, edFontFamily ? { fontFamily: edFontFamily } : null]}
                    placeholder="Write notes, ideas, meeting points..."
                    placeholderTextColor={theme.textDim}
                    value={edBody}
                    onChangeText={handleBodyChange}
                    onSelectionChange={e => setBodySel(e.nativeEvent.selection)}
                    multiline
                    textAlignVertical="top"
                    scrollEnabled={false}
                  />
                  {edImages.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      style={styles.imageStrip}
                      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                    >
                      {edImages.map((uri, idx) => (
                        <View key={idx} style={styles.imageThumbWrap}>
                          <Image source={{ uri }} style={styles.imageThumb} />
                          <TouchableOpacity
                            style={styles.imageDeleteBtn}
                            onPress={() => setEdImages(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Ionicons name="close-circle" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}

                {editorTab === 'todos' && (
                <View style={{ paddingBottom: 12 }}>
                  <View style={styles.todoAddRow}>
                    <TextInput
                      style={[styles.todoAddInput, { color: theme.text, backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}
                      placeholder="Add item…"
                      placeholderTextColor={theme.textDim}
                      value={newTodoText}
                      onChangeText={setNewTodoText}
                      onSubmitEditing={addTodo}
                      returnKeyType="done"
                    />
                    <TouchableOpacity style={styles.todoAddBtn} onPress={addTodo}>
                      <Ionicons name="add" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {edTodos.length === 0 && (
                    <Text style={[styles.todoEmptyText, { color: theme.textDim }]}>Add tasks, study steps, or meeting follow-ups.</Text>
                  )}
                  {edTodos.map(item => (
                    <View key={item.id} style={styles.todoItem}>
                      <TouchableOpacity onPress={() => toggleTodo(item.id)} style={styles.todoCheckbox}>
                        {item.done
                          ? <MaterialCommunityIcons name="checkbox-marked" size={22} color={BLUE} />
                          : <MaterialCommunityIcons name="checkbox-blank-outline" size={22} color="#aaa" />
                        }
                      </TouchableOpacity>
                      <Text style={[styles.todoItemText, { color: theme.text }, item.done && { color: theme.textDim, textDecorationLine: 'line-through' }]}>{item.text}</Text>
                      <TouchableOpacity onPress={() => removeTodo(item.id)} style={styles.todoRemoveBtn}>
                        <Ionicons name="close" size={18} color="#bbb" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                )}
              </View>

              {edTags.length > 0 ? (
                <View style={styles.savedTagsRow}>
                  {edTags.map((tag, index) => (
                    <TouchableOpacity
                      key={`${tag.label}-${index}`}
                      style={[styles.editorTag, { backgroundColor: `${tag.color}25` }]}
                      onLongPress={() => setEdTags(items => items.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <View style={[styles.tagColorMark, { backgroundColor: tag.color }]} />
                      <Text style={[styles.savedTagText, { color: theme.textSub }]}>{tag.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </ScrollView>

            {/* ---------------------------------------------------
                TOOLBAR — pinned above keyboard
            --------------------------------------------------- */}
            <View style={[styles.toolbarDock, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>

              {/* Format + font popover */}
              {formatPopoverVisible && (
                <View style={[styles.formatPopover, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
                  <View style={styles.formatRow}>
                    <TouchableOpacity style={[styles.formatBtn, { backgroundColor: theme.glass.secondary }]} onPress={() => { wrapText('**'); setFormatPopoverVisible(false); }}>
                      <Text style={[styles.formatBtnText, { color: theme.text, fontWeight: 'bold' }]}>B</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.formatBtn, { backgroundColor: theme.glass.secondary }]} onPress={() => { wrapText('_'); setFormatPopoverVisible(false); }}>
                      <Text style={[styles.formatBtnText, { color: theme.text, fontStyle: 'italic' }]}>I</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.formatBtn, { backgroundColor: theme.glass.secondary }]} onPress={() => { wrapText('~~', '~~'); setFormatPopoverVisible(false); }}>
                      <Text style={[styles.formatBtnText, { color: theme.text, textDecorationLine: 'line-through' }]}>S</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.formatBtn, { backgroundColor: theme.glass.secondary }]} onPress={() => { insertLinePrefix('# '); setFormatPopoverVisible(false); }}>
                      <Text style={[styles.formatBtnText, { color: theme.text }]}>H1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.formatBtn, { backgroundColor: theme.glass.secondary }]} onPress={() => { insertLinePrefix('• '); setFormatPopoverVisible(false); }}>
                      <Ionicons name="list-outline" size={18} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.formatRow}>
                    <TouchableOpacity style={[styles.formatBtn, { backgroundColor: theme.glass.secondary }]} onPress={() => { insertLinePrefix('## '); setFormatPopoverVisible(false); }}>
                      <Text style={[styles.formatBtnText, { color: theme.text }]}>H2</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.formatBtn, { backgroundColor: theme.glass.secondary }]} onPress={() => { insertLinePrefix('1. '); setFormatPopoverVisible(false); }}>
                      <MaterialCommunityIcons name="format-list-numbered" size={18} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.formatBtn, { backgroundColor: theme.glass.secondary }]} onPress={() => { wrapText('==', '=='); setFormatPopoverVisible(false); }}>
                      <Ionicons name="brush-outline" size={18} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.fontRow} keyboardShouldPersistTaps="handled">
                    {FONT_FAMILIES.map(f => (
                      <TouchableOpacity key={f.label}
                        style={[styles.fontChip, { backgroundColor: theme.glass.secondary }, edFontFamily === f.value && styles.fontChipActive]}
                        onPress={() => { setEdFontFamily(f.value); bodyRef.current?.focus(); }}>
                        <Text style={[
                          styles.fontChipText,
                          f.value ? { fontFamily: f.value } : null,
                          { color: edFontFamily === f.value ? theme.accent.base : theme.textSub },
                        ]}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Emoji picker */}
              {emojiPickerVisible && (
                <View style={[styles.emojiPicker, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
                  <View style={styles.emojiGrid}>
                    {EMOJI_LIST.map((em, i) => (
                      <TouchableOpacity key={i} style={styles.emojiBtn}
                        onPress={() => { insertAtCursor(em); setEmojiPickerVisible(false); }}>
                        <Text style={styles.emojiText}>{em}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {addTagMode ? (
                <View style={[styles.tagComposer, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
                  <TextInput
                    style={[styles.tagComposerInput, { color: theme.text, borderColor: theme.glass.border, backgroundColor: theme.glass.secondary }]}
                    placeholder="Tag name"
                    placeholderTextColor={theme.textDim}
                    value={newTagName}
                    onChangeText={setNewTagName}
                    maxLength={20}
                    autoFocus
                    onSubmitEditing={addTag}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagPalette}>
                    {TAG_PALETTE.map(color => (
                      <TouchableOpacity key={color} style={[styles.tagColorChoice, { backgroundColor: color }, newTagColor === color && { borderColor: theme.text }]} onPress={() => setNewTagColor(color)} />
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={[styles.tagAddConfirm, { backgroundColor: theme.accent.base }]} onPress={addTag}>
                    <Text style={styles.tagAddConfirmText}>Add tag</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Toolbar row */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.editorBottomBar}
                contentContainerStyle={styles.editorBottomContent}
                keyboardShouldPersistTaps="handled"
              >
                <TouchableOpacity style={styles.editorBarBtn} onPress={undo}>
                  <Ionicons name="arrow-undo-outline" size={21} color={theme.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn} onPress={redo}>
                  <Ionicons name="arrow-redo-outline" size={21} color={theme.textSub} />
                </TouchableOpacity>
                <View style={[styles.toolbarDivider, { backgroundColor: theme.divider }]} />
                <TouchableOpacity style={styles.editorBarBtn}
                  onPress={() => { setFormatPopoverVisible(v => !v); setEmojiPickerVisible(false); }}>
                  <MaterialCommunityIcons name="format-font" size={22} color={formatPopoverVisible ? theme.accent.base : theme.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn} onPress={pickAndInsertImage}>
                  <Ionicons name="image-outline" size={22} color={theme.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn}
                  onPress={() => { setEmojiPickerVisible(v => !v); setFormatPopoverVisible(false); }}>
                  <Ionicons name="happy-outline" size={22} color={emojiPickerVisible ? theme.accent.base : theme.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn}
                  onPress={() => { setLinkText(''); setLinkUrl(''); setLinkModalVisible(true); }}>
                  <Ionicons name="link-outline" size={22} color={theme.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn} onPress={() => setAddTagMode(value => !value)}>
                  <Ionicons name="pricetag-outline" size={22} color={addTagMode ? theme.accent.base : theme.textSub} />
                </TouchableOpacity>
              </ScrollView>

            </View>

          </View>

          {/* -- Link insert sheet -- */}
          <Modal
            visible={linkModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setLinkModalVisible(false)}
          >
            <Pressable style={styles.linkOverlay} onPress={() => setLinkModalVisible(false)}>
              <Pressable style={[styles.linkSheet, { backgroundColor: theme.glass.solid }]} onPress={e => e.stopPropagation()}>
                <Text style={[styles.linkSheetTitle, { color: theme.text }]}>Insert link</Text>
                <TextInput
                  style={[styles.linkInput, { color: theme.text, backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}
                  placeholder="Display text (optional)"
                  placeholderTextColor={theme.textDim}
                  value={linkText}
                  onChangeText={setLinkText}
                />
                <TextInput
                  style={[styles.linkInput, { color: theme.text, backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}
                  placeholder="https://..."
                  placeholderTextColor={theme.textDim}
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <View style={styles.linkActions}>
              <TouchableOpacity style={[styles.linkCancel, { backgroundColor: theme.glass.secondary }]} onPress={() => setLinkModalVisible(false)}>
                    <Text style={{ color: '#888', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.linkConfirm, { backgroundColor: theme.accent.base }]} onPress={() => {
                    if (!linkUrl.trim()) { Alert.alert('URL required', 'Please enter a URL.'); return; }
                    const display = linkText.trim() || linkUrl.trim();
                    insertAtCursor(`[${display}](${linkUrl.trim()})`);
                    setLinkModalVisible(false);
                  }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Insert</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

        </SafeAreaView>
      </Modal>

      {/* ----------------------------------------------------------
          MANAGE CATEGORIES MODAL
      ---------------------------------------------------------- */}
      <Modal
        visible={manageCatVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setManageCatVisible(false)}
      >
        <SafeAreaView style={[styles.manageSafe, { backgroundColor: theme.bg2 }]} edges={['top']}>
          <View style={[styles.manageHeader, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setManageCatVisible(false)} style={styles.manageBackBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.manageTitle, { color: theme.text }]}>Categories</Text>
          </View>

          <ScrollView style={styles.manageScroll} contentContainerStyle={styles.manageScrollContent}>
            <View style={[styles.manageGroup, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>
            <View style={[styles.manageCatRow, { borderBottomColor: theme.divider }]}>
              <MaterialCommunityIcons name="book-multiple-outline" size={20} color={theme.textDim} style={{ marginRight: 12 }} />
              <Text style={[styles.manageCatName, { color: theme.text }]}>
                {`All (${notes.length})`}
              </Text>
            </View>

            {categories.map(cat => {
              const count = notes.filter(n => n.category === cat).length;
              return (
                <View key={cat} style={[styles.manageCatRow, { borderBottomColor: theme.divider }]}>
                  <MaterialCommunityIcons name="notebook-outline" size={20} color={theme.textDim} style={{ marginRight: 12 }} />
                  <Text style={[styles.manageCatName, { color: theme.text }]}>
                    {`${cat} (${count})`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginLeft: 'auto' }}>
                    <TouchableOpacity onPress={() =>
                      Alert.alert(cat, undefined, [
                        { text: 'Rename', onPress: () => { setRenamingCategory(cat); setRenameCategoryValue(cat); } },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(cat) },
                        { text: 'Cancel', style: 'cancel' },
                      ])
                    }>
                      <Ionicons name="ellipsis-vertical" size={18} color={theme.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            </View>
          </ScrollView>

          {/* -- Add Category bar -- */}
          <View style={[styles.addCatBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.addCatInput, { color: theme.text, backgroundColor: theme.bg2, borderColor: theme.border }]}
              placeholder="New category name…"
              placeholderTextColor={theme.textDim}
              value={newCatName}
              onChangeText={setNewCatName}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleAddCategory}
            />
            <TouchableOpacity
              style={styles.addCatBtn}
              onPress={handleAddCategory}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.addCatBtnText}>Add category</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={Boolean(renamingCategory)} transparent animationType="fade" onRequestClose={() => setRenamingCategory(null)}>
        <Pressable style={styles.linkOverlay} onPress={() => setRenamingCategory(null)}>
          <Pressable style={[styles.linkSheet, { backgroundColor: theme.glass.solid }]} onPress={event => event.stopPropagation()}>
            <Text style={[styles.linkSheetTitle, { color: theme.text }]}>Rename category</Text>
            <TextInput
              autoFocus
              style={[styles.linkInput, { color: theme.text, backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}
              placeholder="Category name"
              placeholderTextColor={theme.textDim}
              value={renameCategoryValue}
              onChangeText={setRenameCategoryValue}
              maxLength={30}
            />
            <View style={styles.linkActions}>
              <TouchableOpacity style={[styles.linkCancel, { backgroundColor: theme.glass.secondary }]} onPress={() => setRenamingCategory(null)}>
                <Text style={{ color: theme.textSub, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.linkConfirm, { backgroundColor: theme.accent.base }]} onPress={() => {
                if (renamingCategory && renameCategoryValue.trim()) storeRenameCat(renamingCategory, renameCategoryValue);
                setRenamingCategory(null);
              }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Rename</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
