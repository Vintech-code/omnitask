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
  ActivityIndicator,
  Share,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { BurgerMenu, PulsingFAB } from '@/components/BurgerMenu';
import { NoteCard } from '@/components/NoteCard';
import { useTaskStore } from '@/context/TaskStore';
import { Note, NoteTag, ChecklistItem } from '@/types/note';
import { BRAND_BLUE as BLUE, CARD_COLORS, TAG_PALETTE } from '@/theme/colors';
import { FONT_FAMILIES } from '@/theme/typography';
import { formatDate } from '@/utils/date';
import { splitColumns } from '@/utils/array';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { styles } from './styles';

const EMOJI_LIST = [
  '😀','😂','😍','🥰','😎','🤩','🥳','😜','🤔','😇','🙃','😴',
  '😢','😡','🤯','😱','🥶','🔥','💯','✅','❌','⭐','💡','📌',
  '🎉','🎯','🚀','💪','🙏','👏','🤝','👀','💬','📝','📅','⏰',
  '🌟','🌈','☕','🍕','🎵','🎮','📚','💻','🏆','❤️','💙','💚',
];

export default function TasksScreen({ navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { notes, categories, isLoading, addNote, updateNote, removeNote, addCategory: storeAddCat, removeCategory: storeRemoveCat } = useTaskStore();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 700); };

  // -- Notes state (now from TaskStore) ------------------------------------
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // -- Search --------------------------------------------------------------
  const [searchVisible, setSearchVisible] = useState(false);
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
  const [newTagColor, setNewTagColor]             = useState(TAG_PALETTE[0]);
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
  const [leftCol, rightCol] = splitColumns(filteredNotes);
  const allCatTabs = ['All', ...categories];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* -- Header -- */}
      <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <BurgerMenu navigation={navigation} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notes</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { setSearchVisible(v => !v); setSearchQuery(''); }}>
            <Ionicons name="search-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setManageCatVisible(true)}>
            <MaterialCommunityIcons name="view-grid-plus-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Options', undefined, [
            { text: 'Manage Categories', onPress: () => setManageCatVisible(true) },
            { text: 'Cancel', style: 'cancel' },
          ])}>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* -- Search bar -- */}
      {searchVisible && (
        <View style={[styles.searchBar, { backgroundColor: theme.bg2 }]}>
          <Ionicons name="search-outline" size={16} color={theme.textDim} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search notes..."
            placeholderTextColor={theme.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textDim} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* -- Category chips -- */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catChipsRow}
        style={[styles.catChipsScroll, { backgroundColor: theme.bg }]}
      >
        {allCatTabs.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, { backgroundColor: activeCategory === cat ? BLUE : theme.bg2 }]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.catChipText, { color: activeCategory === cat ? '#fff' : theme.textSub }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* -- Notes grid -- */}
      <ScrollView style={[styles.scroll, { backgroundColor: theme.bg2 }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textDim} />}>
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={theme.textDim} />
            <Text style={[styles.emptyTitle, { color: theme.textDim }]}>No notes yet</Text>
            <Text style={[styles.emptySub, { color: theme.textDim }]}>Tap + to create your first note</Text>
          </View>
        ) : (
          <View style={styles.columns}>
            <View style={styles.column}>
              {leftCol.map(note => <NoteCard key={note.id} note={note} onPress={openEdit} onDelete={deleteNote} />)}
            </View>
            <View style={styles.column}>
              {rightCol.map(note => <NoteCard key={note.id} note={note} onPress={openEdit} onDelete={deleteNote} />)}
            </View>
          </View>
        )}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* -- FAB (pulsing) -- */}
      <View style={styles.fab}>
        <PulsingFAB onPress={openNew} />
      </View>

      {/* ----------------------------------------------------------
          NOTE EDITOR MODAL
      ---------------------------------------------------------- */}
      <Modal
        visible={editorVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={saveNote}
      >
        <SafeAreaView style={[styles.editorSafe, { backgroundColor: edCardColor }]} edges={['top']}>
          {/* Editor top bar */}
          <View style={[styles.editorTopBar, { backgroundColor: edCardColor }]}>
            <TouchableOpacity onPress={saveNote} style={styles.editorIconBtn}>
              <Ionicons name="checkmark" size={24} color="#333" />
            </TouchableOpacity>
            <View style={styles.editorTopCenter}>
              <TouchableOpacity onPress={undo}>
                <Ionicons name="arrow-undo-outline" size={20} color="#555" />
              </TouchableOpacity>
              <TouchableOpacity onPress={redo}>
                <Ionicons name="arrow-redo-outline" size={20} color="#555" />
              </TouchableOpacity>
            </View>
            <View style={styles.editorTopRight}>
              <TouchableOpacity onPress={() => setColorPickerVisible(v => !v)} style={styles.editorIconBtn}>
                <Ionicons name="color-palette-outline" size={20} color="#555" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.editorIconBtn} onPress={shareNote}>
                <Ionicons name="share-outline" size={20} color="#555" />
              </TouchableOpacity>
              {editNote && (
                <TouchableOpacity style={styles.editorIconBtn} onPress={() => deleteNote(editNote.id)}>
                  <Ionicons name="trash-outline" size={20} color="#E05252" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Card color picker */}
          {colorPickerVisible && (
            <View style={[styles.colorPickerRow, { backgroundColor: edCardColor }]}>
              {CARD_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, edCardColor === c && styles.colorSwatchActive]}
                  onPress={() => { setEdCardColor(c); setColorPickerVisible(false); }}
                />
              ))}
            </View>
          )}

          {/* -- Date + category row (fixed, outside ScrollView) -- */}
          <View style={[styles.editorMetaWrap, { backgroundColor: edCardColor }]}>
            <View style={styles.editorMeta}>
              <Text style={styles.editorDate}>{editNote ? editNote.date : formatDate(Date.now())}</Text>
              <TouchableOpacity style={styles.catSelector} onPress={() => setCatPickerVisible(v => !v)}>
                <MaterialCommunityIcons name="notebook-outline" size={15} color="#777" style={{ marginRight: 5 }} />
                <Text style={styles.catSelectorText}>{edCategory}</Text>
                <Ionicons name={catPickerVisible ? 'chevron-up' : 'chevron-down'} size={14} color="#777" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>

            {/* Category dropdown � absolute overlay */}
            {catPickerVisible && (
              <View style={styles.catDropdown}>
                <TouchableOpacity style={styles.catDropdownItem} onPress={() => { setManageCatVisible(true); setCatPickerVisible(false); }}>
                  <Ionicons name="add-circle-outline" size={16} color={BLUE} style={{ marginRight: 10 }} />
                  <Text style={[styles.catDropdownText, { color: BLUE }]}>Add</Text>
                </TouchableOpacity>
                {[...categories, 'Uncategorized'].map(c => (
                  <TouchableOpacity
                    key={c}
                    style={styles.catDropdownItem}
                    onPress={() => { setEdCategory(c); setCatPickerVisible(false); }}
                  >
                    <MaterialCommunityIcons name="notebook-outline" size={16} color="#555" style={{ marginRight: 10 }} />
                    <Text style={styles.catDropdownText}>{c}</Text>
                    {edCategory === c && <Ionicons name="checkmark" size={16} color={BLUE} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* -- Note/Todos tab bar -- */}
          <View style={[styles.editorTabBar, { backgroundColor: edCardColor, borderBottomColor: 'rgba(0,0,0,0.07)' }]}>
            <TouchableOpacity
              style={[styles.editorTabBtn, editorTab === 'note' && styles.editorTabBtnActive]}
              onPress={() => setEditorTab('note')}
            >
              <Ionicons name="create-outline" size={15} color={editorTab === 'note' ? BLUE : '#888'} />
              <Text style={[styles.editorTabTxt, { color: editorTab === 'note' ? BLUE : '#888' }]}>Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editorTabBtn, editorTab === 'todos' && styles.editorTabBtnActive]}
              onPress={() => setEditorTab('todos')}
            >
              <MaterialCommunityIcons name="checkbox-marked-outline" size={15} color={editorTab === 'todos' ? BLUE : '#888'} />
              <Text style={[styles.editorTabTxt, { color: editorTab === 'todos' ? BLUE : '#888' }]}>
                {edTodos.length > 0 ? `Checklist (${edTodos.filter(t => t.done).length}/${edTodos.length})` : 'Checklist'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            {/* -- Scrollable content area -- */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[styles.editorBody, { paddingBottom: 20 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* -- Title (always visible) -- */}
              <TextInput
                style={styles.editorTitle}
                placeholder="Title"
                placeholderTextColor="#C0C0C0"
                value={edTitle}
                onChangeText={setEdTitle}
                multiline
                maxLength={120}
              />

              {/* -- Note tab -- */}
              {editorTab === 'note' && (
                <>
                  <TextInput
                    ref={bodyRef}
                    style={[styles.editorText, edFontFamily ? { fontFamily: edFontFamily } : null]}
                    placeholder="Note here"
                    placeholderTextColor="#C0C0C0"
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

              {/* -- Checklist tab -- */}
              {editorTab === 'todos' && (
                <View style={{ paddingBottom: 12 }}>
                  <View style={styles.todoAddRow}>
                    <TextInput
                      style={styles.todoAddInput}
                      placeholder="Add item�"
                      placeholderTextColor="#bbb"
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
                    <Text style={styles.todoEmptyText}>No checklist items yet</Text>
                  )}
                  {edTodos.map(item => (
                    <View key={item.id} style={styles.todoItem}>
                      <TouchableOpacity onPress={() => toggleTodo(item.id)} style={styles.todoCheckbox}>
                        {item.done
                          ? <MaterialCommunityIcons name="checkbox-marked" size={22} color={BLUE} />
                          : <MaterialCommunityIcons name="checkbox-blank-outline" size={22} color="#aaa" />
                        }
                      </TouchableOpacity>
                      <Text style={[styles.todoItemText, item.done && styles.todoItemDone]}>{item.text}</Text>
                      <TouchableOpacity onPress={() => removeTodo(item.id)} style={styles.todoRemoveBtn}>
                        <Ionicons name="close" size={18} color="#bbb" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* ---------------------------------------------------
                TOOLBAR � absolutely pinned above keyboard
            --------------------------------------------------- */}
            <View style={[styles.toolbarDock, { backgroundColor: edCardColor }]}>

              {/* Format + font popover */}
              {formatPopoverVisible && (
                <View style={[styles.formatPopover, { backgroundColor: edCardColor }]}>
                  <View style={styles.formatRow}>
                    <TouchableOpacity style={styles.formatBtn} onPress={() => { wrapText('**'); setFormatPopoverVisible(false); }}>
                      <Text style={[styles.formatBtnText, { fontWeight: 'bold' }]}>B</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn} onPress={() => { wrapText('_'); setFormatPopoverVisible(false); }}>
                      <Text style={[styles.formatBtnText, { fontStyle: 'italic' }]}>I</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn} onPress={() => { wrapText('~~', '~~'); setFormatPopoverVisible(false); }}>
                      <Text style={[styles.formatBtnText, { textDecorationLine: 'line-through' }]}>S</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn} onPress={() => { insertLinePrefix('# '); setFormatPopoverVisible(false); }}>
                      <Text style={styles.formatBtnText}>H1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn} onPress={() => { insertLinePrefix('## '); setFormatPopoverVisible(false); }}>
                      <Text style={styles.formatBtnText}>H2</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.fontRow} keyboardShouldPersistTaps="handled">
                    {FONT_FAMILIES.map(f => (
                      <TouchableOpacity key={f.label}
                        style={[styles.fontChip, edFontFamily === f.value && styles.fontChipActive]}
                        onPress={() => { setEdFontFamily(f.value); bodyRef.current?.focus(); }}>
                        <Text style={[
                          styles.fontChipText,
                          f.value ? { fontFamily: f.value } : null,
                          edFontFamily === f.value && styles.fontChipTextActive,
                        ]}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Emoji picker */}
              {emojiPickerVisible && (
                <View style={[styles.emojiPicker, { backgroundColor: edCardColor }]}>
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

              {/* Toolbar row */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.editorBottomBar}
                contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}
                keyboardShouldPersistTaps="handled"
              >
                <TouchableOpacity style={styles.editorBarBtn}
                  onPress={() => { setFormatPopoverVisible(v => !v); setEmojiPickerVisible(false); }}>
                  <MaterialCommunityIcons name="format-font" size={22} color={formatPopoverVisible ? BLUE : '#555'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn} onPress={() => insertLinePrefix('? ')}>
                  <MaterialCommunityIcons name="checkbox-marked-outline" size={22} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn} onPress={() => {
                  bodyRef.current?.focus();
                  Alert.alert('Voice Input', 'Tap the microphone on your keyboard to dictate.');
                }}>
                  <Ionicons name="mic-outline" size={22} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn} onPress={() => wrapText('==', '==')}>
                  <Ionicons name="brush-outline" size={22} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn} onPress={pickAndInsertImage}>
                  <Ionicons name="image-outline" size={22} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn}
                  onPress={() => { setEmojiPickerVisible(v => !v); setFormatPopoverVisible(false); }}>
                  <Ionicons name="happy-outline" size={22} color={emojiPickerVisible ? BLUE : '#555'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn} onPress={() => wrapText('~~', '~~')}>
                  <MaterialCommunityIcons name="format-strikethrough" size={22} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn} onPress={() => insertLinePrefix('� ')}>
                  <Ionicons name="list-outline" size={22} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn} onPress={() => insertLinePrefix('1. ')}>
                  <MaterialCommunityIcons name="format-list-numbered" size={22} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editorBarBtn}
                  onPress={() => { setLinkText(''); setLinkUrl(''); setLinkModalVisible(true); }}>
                  <Ionicons name="link-outline" size={22} color="#555" />
                </TouchableOpacity>
              </ScrollView>

            </View> {/* end toolbarDock */}

          </View> {/* end flex:1 container */}

          {/* -- Link insert sheet -- */}
          <Modal
            visible={linkModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setLinkModalVisible(false)}
          >
            <Pressable style={styles.linkOverlay} onPress={() => setLinkModalVisible(false)}>
              <Pressable style={styles.linkSheet} onPress={e => e.stopPropagation()}>
                <Text style={styles.linkSheetTitle}>Insert Link</Text>
                <TextInput
                  style={styles.linkInput}
                  placeholder="Display text (optional)"
                  placeholderTextColor="#aaa"
                  value={linkText}
                  onChangeText={setLinkText}
                />
                <TextInput
                  style={styles.linkInput}
                  placeholder="https://..."
                  placeholderTextColor="#aaa"
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <View style={styles.linkActions}>
                  <TouchableOpacity style={styles.linkCancel} onPress={() => setLinkModalVisible(false)}>
                    <Text style={{ color: '#888', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.linkConfirm} onPress={() => {
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
            <Text style={[styles.manageTitle, { color: theme.text }]}>Manage Category</Text>
          </View>

          {/* Info banner */}
          <View style={styles.manageBanner}>
            <Ionicons name="megaphone-outline" size={18} color="#E09C52" style={{ marginRight: 8 }} />
            <Text style={styles.manageBannerText}>You can rename or delete categories here.</Text>
            <TouchableOpacity style={{ padding: 2 }}>
              <Ionicons name="close" size={16} color="#E09C52" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {/* All row */}
            <View style={[styles.manageCatRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <MaterialCommunityIcons name="drag" size={20} color={theme.textDim} style={{ marginRight: 12 }} />
              <Text style={[styles.manageCatName, { color: theme.text }]}>
                {`All (${notes.length})`}
              </Text>
            </View>

            {categories.map(cat => {
              const count = notes.filter(n => n.category === cat).length;
              return (
                <View key={cat} style={[styles.manageCatRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                  <MaterialCommunityIcons name="drag" size={20} color={theme.textDim} style={{ marginRight: 12 }} />
                  <Text style={[styles.manageCatName, { color: theme.text }]}>
                    {`${cat} (${count})`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginLeft: 'auto' }}>
                    <Ionicons name="lock-open-outline" size={18} color={theme.textDim} />
                    <TouchableOpacity onPress={() =>
                      Alert.alert(cat, undefined, [
                        { text: 'Rename', onPress: () => Alert.prompt?.('Rename', '', (name: string) => {
                          if (name?.trim()) { storeRemoveCat(cat); storeAddCat(name.trim()); }
                        })},
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

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* -- Add Category bar -- */}
          <View style={[styles.addCatBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.addCatInput, { color: theme.text, backgroundColor: theme.bg2, borderColor: theme.border }]}
              placeholder="New category name�"
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
              <Text style={styles.addCatBtnText}>ADD CATEGORY</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}