import React, { useState, useMemo, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Share,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BurgerMenu, PulsingFAB } from '../components/BurgerMenu';
import { useTaskStore, Note, NoteTag, ChecklistItem } from '../context/TaskStore';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

const BLUE = '#4A90D9';

const CARD_COLORS = [
  '#FFF9C4', '#FFFDE7', '#FFF3E0', '#F3E5F5',
  '#E8F5E9', '#E3F2FD', '#FCE4EC', '#E0F7FA', '#FFFFFF',
];

const TAG_PALETTE = [
  '#7C5CBF', '#2196F3', '#4CAF50', '#F44336',
  '#FF9800', '#009688', '#E91E63', '#607D8B',
];

const EMOJI_LIST = [
  '😀','😂','😍','😎','😢','😡','🥳','🤔','🙏','👍','👎','✌️',
  '❤️','🔥','⭐','✅','❌','⚡','🎉','🎯','💡','📝','💻','📚',
  '🚀','🌟','💯','🎶','🌈','🍕','☕','🎁','🏆','🌺','😴','🤝',
  '💪','🌙','☀️','🎨','📅','🔔','🛒','💰','🔑','🌍','🐶','🐱',
];

function formatDate(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── two-column masonry split ───────────────────────────────────────────────
function splitColumns<T>(items: T[]): [T[], T[]] {
  const left: T[] = [];
  const right: T[] = [];
  items.forEach((item, i) => (i % 2 === 0 ? left : right).push(item));
  return [left, right];
}

export default function TasksScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { notes, categories, isLoading, addNote, updateNote, removeNote, addCategory: storeAddCat, removeCategory: storeRemoveCat } = useTaskStore();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 700); };

  // ── Notes state (now from TaskStore) ────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // ── Search ──────────────────────────────────────────────────────────────
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');

  // ── Editor modal state ───────────────────────────────────────────────────
  const [editorVisible, setEditorVisible]         = useState(false);
  const [editNote, setEditNote]                   = useState<Note | null>(null);
  const [edTitle, setEdTitle]                     = useState('');
  const [edBody, setEdBody]                       = useState('');
  const [edCategory, setEdCategory]               = useState('Personal');
  const [edCardColor, setEdCardColor]             = useState(CARD_COLORS[0]);
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

  // ── Undo / Redo history ─────────────────────────────────────────────────
  const undoStack      = useRef<string[]>([]);
  const redoStack      = useRef<string[]>([]);
  const lastUndoPushTs = useRef(0);

  // ── Body cursor tracking ─────────────────────────────────────────────────
  const bodyRef  = useRef<TextInput>(null);
  const [bodySel, setBodySel] = useState({ start: 0, end: 0 });

  // ── Formatting toolbar extra state ──────────────────────────────────────
  const [emojiPickerVisible,  setEmojiPickerVisible]  = useState(false);
  const [formatPopoverVisible, setFormatPopoverVisible] = useState(false);
  const [linkModalVisible,    setLinkModalVisible]    = useState(false);
  const [linkUrl,  setLinkUrl]  = useState('');
  const [linkText, setLinkText] = useState('');

  // ── Manage categories modal ─────────────────────────────────────────────
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

  // ── Open editor ──────────────────────────────────────────────────────────
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
    undoStack.current = [];
    redoStack.current = [];
    setEmojiPickerVisible(false);
    setFormatPopoverVisible(false);
    setEditorVisible(true);
  };

  // ── Save note ────────────────────────────────────────────────────────────
  const saveNote = () => {
    if (!edTitle.trim() && !edBody.trim() && edTodos.length === 0) {
      setEditorVisible(false);
      return;
    }
    const now = Date.now();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editNote) {
      updateNote({ ...editNote, title: edTitle, body: edBody, category: edCategory, cardColor: edCardColor, tags: edTags, date: formatDate(editNote.timestamp), todos: edTodos, images: edImages });
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
      };
      addNote(newNote);
      if (!categories.includes(edCategory)) storeAddCat(edCategory);
    }
    setEditorVisible(false);
  };

  // ── Share note ────────────────────────────────────────────────────────────
  const shareNote = async () => {
    const title = edTitle.trim() || 'Note';
    const todoText = edTodos.length > 0
      ? '\n\nChecklist:\n' + edTodos.map(t => `${t.done ? '✓' : '☐'} ${t.text}`).join('\n')
      : '';
    const message = `${title}\n\n${edBody}${todoText}`.trim();
    try {
      await Share.share({ title, message });
    } catch {}
  };

  // ── Todo helpers ──────────────────────────────────────────────────────────
  const addTodo = () => {
    const text = newTodoText.trim();
    if (!text) return;
    setEdTodos(prev => [...prev, { id: Date.now().toString(), text, done: false }]);
    setNewTodoText('');
  };
  const toggleTodo = (id: string) => setEdTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const removeTodo = (id: string) => setEdTodos(prev => prev.filter(t => t.id !== id));

  // ── Delete note ──────────────────────────────────────────────────────────
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

  // ── Tag helpers ──────────────────────────────────────────────────────────
  const addTag = () => {
    const label = newTagName.trim().toUpperCase();
    if (!label) return;
    setEdTags(prev => [...prev, { label, color: newTagColor }]);
    setNewTagName('');
    setNewTagColor(TAG_PALETTE[0]);
    setAddTagMode(false);
  };

  // ── Category helpers ──────────────────────────────────────────────────────
  const deleteCategory = (cat: string) => {
    Alert.alert('Delete Category', `Delete "${cat}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => storeRemoveCat(cat) },
    ]);
  };

  // ── Undo / Redo ───────────────────────────────────────────────────────────
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

  // ── Text insertion helpers ────────────────────────────────────────────────
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

  // ── Image pick & insert ───────────────────────────────────────────────────
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

  // ── Note Card ─────────────────────────────────────────────────────────────
  const NoteCard = ({ note }: { note: Note }) => (
    <TouchableOpacity
      style={[styles.noteCard, { backgroundColor: note.cardColor }]}
      onPress={() => openEdit(note)}
      onLongPress={() => {
        if (!note.id.startsWith('ev-')) {
          Alert.alert(note.title, undefined, [
            { text: 'Edit',   onPress: () => openEdit(note) },
            { text: 'Delete', style: 'destructive', onPress: () => deleteNote(note.id) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }
      }}
      delayLongPress={500}
      activeOpacity={0.85}
    >
      {note.title.length > 0 && (
        <Text style={[styles.noteCardTitle, { color: theme.text }]} numberOfLines={2}>{note.title}</Text>
      )}
      {note.body.length > 0 && (
        <Text style={[styles.noteCardBody, { color: theme.textSub }]} numberOfLines={5}>{note.body}</Text>
      )}
      {note.todos && note.todos.length > 0 && (
        <View style={styles.noteCardTodoBadge}>
          <MaterialCommunityIcons name="checkbox-marked-outline" size={12} color={BLUE} />
          <Text style={styles.noteCardTodoBadgeTxt}>
            {note.todos.filter(t => t.done).length}/{note.todos.length}
          </Text>
        </View>
      )}
      {note.images && note.images.length > 0 && (
        <Image
          source={{ uri: note.images[0] }}
          style={styles.noteCardImage}
          resizeMode="cover"
        />
      )}
      <Text style={[styles.noteCardDate, { color: theme.textDim }]}>{note.date}</Text>
    </TouchableOpacity>
  );

  // ── Render ────────────────────────────────────────────────────────────────
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
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <BurgerMenu navigation={navigation} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>To-do List</Text>
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

      {/* ── Search bar ── */}
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

      {/* ── Category chips ── */}
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

      {/* ── Notes grid ── */}
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
              {leftCol.map(note => <NoteCard key={note.id} note={note} />)}
            </View>
            <View style={styles.column}>
              {rightCol.map(note => <NoteCard key={note.id} note={note} />)}
            </View>
          </View>
        )}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── FAB (pulsing) ── */}
      <View style={styles.fab}>
        <PulsingFAB onPress={openNew} />
      </View>

      {/* ══════════════════════════════════════════════════════════
          NOTE EDITOR MODAL
      ══════════════════════════════════════════════════════════ */}
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

          {/* ── Date + category row (fixed, outside ScrollView) ── */}
          <View style={[styles.editorMetaWrap, { backgroundColor: edCardColor }]}>
            <View style={styles.editorMeta}>
              <Text style={styles.editorDate}>{editNote ? editNote.date : formatDate(Date.now())}</Text>
              <TouchableOpacity style={styles.catSelector} onPress={() => setCatPickerVisible(v => !v)}>
                <MaterialCommunityIcons name="notebook-outline" size={15} color="#777" style={{ marginRight: 5 }} />
                <Text style={styles.catSelectorText}>{edCategory}</Text>
                <Ionicons name={catPickerVisible ? 'chevron-up' : 'chevron-down'} size={14} color="#777" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>

            {/* Category dropdown — absolute overlay */}
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

          {/* ── Note/Todos tab bar ── */}
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
                Checklist{edTodos.length > 0 ? ` (${edTodos.filter(t => t.done).length}/${edTodos.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.editorBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Title (always visible) ── */}
              <TextInput
                style={styles.editorTitle}
                placeholder="Title"
                placeholderTextColor="#C0C0C0"
                value={edTitle}
                onChangeText={setEdTitle}
                multiline
                maxLength={120}
              />

              {/* ── Note tab ── */}
              {editorTab === 'note' && (
                <>
                  <TextInput
                    ref={bodyRef}
                    style={styles.editorText}
                    placeholder="Note here"
                    placeholderTextColor="#C0C0C0"
                    value={edBody}
                    onChangeText={handleBodyChange}
                    onSelectionChange={e => setBodySel(e.nativeEvent.selection)}
                    multiline
                    textAlignVertical="top"
                    scrollEnabled={false}
                  />
                  {/* ── Inserted images strip ── */}
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

              {/* ── Checklist tab ── */}
              {editorTab === 'todos' && (
                <View style={{ paddingBottom: 12 }}>
                  {/* Add todo input */}
                  <View style={styles.todoAddRow}>
                    <TextInput
                      style={styles.todoAddInput}
                      placeholder="Add item…"
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

                  {/* Todo items */}
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

            {/* ── Add-tag floating overlay ── */}
            {addTagMode && (
              <View style={styles.addTagOverlay}>
                <Pressable style={styles.addTagOverlayBg} onPress={() => { setAddTagMode(false); setNewTagName(''); }} />
                <View style={styles.addTagForm}>
                  <TextInput
                    style={styles.addTagInput}
                    placeholder="Category name"
                    placeholderTextColor="#bbb"
                    value={newTagName}
                    onChangeText={setNewTagName}
                    autoFocus
                    maxLength={20}
                  />
                  <Text style={styles.addTagColorLabel}>Pick a color</Text>
                  <View style={styles.addTagPalette}>
                    {TAG_PALETTE.map(c => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.tagColorDot, { backgroundColor: c }, newTagColor === c && styles.tagColorDotActive]}
                        onPress={() => setNewTagColor(c)}
                      >
                        {newTagColor === c && <Ionicons name="checkmark" size={11} color="#fff" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.addTagActions}>
                    <TouchableOpacity style={styles.addTagCancel} onPress={() => { setAddTagMode(false); setNewTagName(''); }}>
                      <Text style={styles.addTagCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addTagConfirm} onPress={addTag}>
                      <Text style={styles.addTagConfirmText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ── Format popover (B / I / H1 / H2) ── */}
            {formatPopoverVisible && (
              <View style={styles.formatPopover}>
                <TouchableOpacity style={styles.formatBtn}
                  onPress={() => { wrapText('**'); setFormatPopoverVisible(false); }}>
                  <Text style={[styles.formatBtnText, { fontWeight: 'bold' }]}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatBtn}
                  onPress={() => { wrapText('_'); setFormatPopoverVisible(false); }}>
                  <Text style={[styles.formatBtnText, { fontStyle: 'italic' }]}>I</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatBtn}
                  onPress={() => { insertLinePrefix('# '); setFormatPopoverVisible(false); }}>
                  <Text style={styles.formatBtnText}>H1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatBtn}
                  onPress={() => { insertLinePrefix('## '); setFormatPopoverVisible(false); }}>
                  <Text style={styles.formatBtnText}>H2</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Emoji picker grid ── */}
            {emojiPickerVisible && (
              <View style={styles.emojiPicker}>
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

            {/* Bottom formatting bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.editorBottomBar, { backgroundColor: edCardColor }]}
              contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Aa — text format */}
              <TouchableOpacity style={styles.editorBarBtn}
                onPress={() => { setFormatPopoverVisible(v => !v); setEmojiPickerVisible(false); }}>
                <MaterialCommunityIcons name="format-font" size={21}
                  color={formatPopoverVisible ? '#4A90D9' : '#555'} />
              </TouchableOpacity>
              {/* Checkbox */}
              <TouchableOpacity style={styles.editorBarBtn}
                onPress={() => insertLinePrefix('☐ ')}>
                <MaterialCommunityIcons name="checkbox-marked-outline" size={21} color="#555" />
              </TouchableOpacity>
              {/* Mic */}
              <TouchableOpacity style={styles.editorBarBtn} onPress={() => {
                bodyRef.current?.focus();
                Alert.alert('Voice Input', 'Tap the microphone on your keyboard to dictate.');
              }}>
                <Ionicons name="mic-outline" size={21} color="#555" />
              </TouchableOpacity>
              {/* Highlight / brush */}
              <TouchableOpacity style={styles.editorBarBtn} onPress={() => wrapText('==', '==')}>
                <Ionicons name="brush-outline" size={21} color="#555" />
              </TouchableOpacity>
              {/* Image */}
              <TouchableOpacity style={styles.editorBarBtn} onPress={pickAndInsertImage}>
                <Ionicons name="image-outline" size={21} color="#555" />
              </TouchableOpacity>
              {/* Emoji */}
              <TouchableOpacity style={styles.editorBarBtn}
                onPress={() => { setEmojiPickerVisible(v => !v); setFormatPopoverVisible(false); }}>
                <Ionicons name="happy-outline" size={21}
                  color={emojiPickerVisible ? '#4A90D9' : '#555'} />
              </TouchableOpacity>
              {/* Strikethrough */}
              <TouchableOpacity style={styles.editorBarBtn} onPress={() => wrapText('~~', '~~')}>
                <MaterialCommunityIcons name="format-strikethrough" size={21} color="#555" />
              </TouchableOpacity>
              {/* Bullet list */}
              <TouchableOpacity style={styles.editorBarBtn} onPress={() => insertLinePrefix('• ')}>
                <Ionicons name="list-outline" size={21} color="#555" />
              </TouchableOpacity>
              {/* Numbered list */}
              <TouchableOpacity style={styles.editorBarBtn} onPress={() => insertLinePrefix('1. ')}>
                <MaterialCommunityIcons name="format-list-numbered" size={21} color="#555" />
              </TouchableOpacity>
              {/* Link */}
              <TouchableOpacity style={styles.editorBarBtn}
                onPress={() => { setLinkText(''); setLinkUrl(''); setLinkModalVisible(true); }}>
                <Ionicons name="link-outline" size={21} color="#555" />
              </TouchableOpacity>
            </ScrollView>

            {/* ── Link insert sheet ── */}
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
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          MANAGE CATEGORIES MODAL
      ══════════════════════════════════════════════════════════ */}
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
                All
                <Text style={[styles.manageCatCount, { color: theme.textDim }]}> ({notes.length})</Text>
              </Text>
            </View>

            {categories.map(cat => {
              const count = notes.filter(n => n.category === cat).length;
              return (
                <View key={cat} style={[styles.manageCatRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                  <MaterialCommunityIcons name="drag" size={20} color={theme.textDim} style={{ marginRight: 12 }} />
                  <Text style={[styles.manageCatName, { color: theme.text }]}>
                    {cat}
                    <Text style={[styles.manageCatCount, { color: theme.textDim }]}> ({count})</Text>
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

          {/* ── Add Category bar ── */}
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
              <Text style={styles.addCatBtnText}>ADD CATEGORY</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 19, fontWeight: '800', flex: 1, textAlign: 'center' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 16 },

  // ── Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 14, marginTop: 10, marginBottom: 2,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },

  // ── Category chips
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

  // ── Grid
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 8, paddingTop: 10 },
  columns: { flexDirection: 'row', gap: 8 },
  column: { flex: 1, gap: 8 },

  // ── Note card
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

  // ── Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13 },

  // ── FAB
  fab: {
    position: 'absolute', right: 20, bottom: 24,
  },
  fabInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
    shadowColor: BLUE, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },

  // ── Editor
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

  // ── Floating tags bar
  floatingTagsBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.07)',
    paddingVertical: 8,
  },
  floatingTagsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 8,
  },
  // ── Add-tag overlay
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

  // ── Bottom editor bar
  editorBottomBar: {
    paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.07)',
  },
  editorBarBtn: { padding: 8 },

  // ── Manage categories
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

  // ── Note card todo badge
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

  // ── Editor image strip
  imageStrip: { marginTop: 10 },
  imageThumbWrap: { position: 'relative' },
  imageThumb: { width: 120, height: 90, borderRadius: 10 },
  imageDeleteBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12,
  },

  // ── Editor tab bar
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

  // ── Todo checklist
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

  // ── Format popover (bold / italic / headings)
  formatPopover: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    gap: 6,
  },
  formatBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  formatBtnText: { fontSize: 15, color: '#222' },

  // ── Emoji picker
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

  // ── Link insert modal
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