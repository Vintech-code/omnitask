/**
 * useNoteEditor
 * ─────────────────────────────────────────────────────────────────────────────
 * Contains ALL state and business logic for the note editor modal.
 * The screen component only handles JSX; this hook owns everything else.
 */
import { useState, useRef, useEffect } from 'react';
import { TextInput, Alert, Share, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { Note, NoteTag, ChecklistItem } from '../types/note';
import { CARD_COLORS, TAG_PALETTE } from '../theme/colors';
import { formatDate } from '../utils/date';

interface UseNoteEditorOptions {
  notes: Note[];
  categories: string[];
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  removeNote: (id: string) => void;
  addCategory: (name: string) => void;
  activeCategory: string;
}

// ─── Exported shape ───────────────────────────────────────────────────────────
export interface NoteEditorState {
  // visibility
  editorVisible:        boolean;
  setEditorVisible:     (v: boolean) => void;
  linkModalVisible:     boolean;
  setLinkModalVisible:  (v: boolean) => void;
  colorPickerVisible:   boolean;
  setColorPickerVisible: (v: boolean) => void;
  catPickerVisible:     boolean;
  setCatPickerVisible:  (v: boolean) => void;
  formatPopoverVisible: boolean;
  setFormatPopoverVisible: (v: boolean) => void;
  emojiPickerVisible:   boolean;
  setEmojiPickerVisible: (v: boolean) => void;

  // which note is being edited (null = new)
  editNote: Note | null;

  // editor field state
  edTitle:       string;
  setEdTitle:    (v: string) => void;
  edBody:        string;
  edCategory:    string;
  setEdCategory: (v: string) => void;
  edCardColor:   string;
  setEdCardColor: (v: string) => void;
  edTags:        NoteTag[];
  setEdTags:     (v: NoteTag[]) => void;
  edTodos:       ChecklistItem[];
  setEdTodos:    React.Dispatch<React.SetStateAction<ChecklistItem[]>>;
  edImages:      string[];
  setEdImages:   React.Dispatch<React.SetStateAction<string[]>>;
  edFontFamily:  string | undefined;
  setEdFontFamily: (v: string | undefined) => void;

  // checklist
  newTodoText:    string;
  setNewTodoText: (v: string) => void;
  editorTab:      'note' | 'todos';
  setEditorTab:   (v: 'note' | 'todos') => void;

  // tag form
  addTagMode:    boolean;
  setAddTagMode: (v: boolean) => void;
  newTagName:    string;
  setNewTagName: (v: string) => void;
  newTagColor:   string;
  setNewTagColor: (v: string) => void;

  // link form
  linkUrl:    string;
  setLinkUrl: (v: string) => void;
  linkText:   string;
  setLinkText: (v: string) => void;

  // keyboard
  kbHeight: number;

  // refs
  bodyRef:  React.RefObject<TextInput | null>;
  bodySel:  { start: number; end: number };
  setBodySel: (v: { start: number; end: number }) => void;

  // actions
  openNew:   () => void;
  openEdit:  (note: Note) => void;
  saveNote:  () => void;
  shareNote: () => Promise<void>;

  handleBodyChange:   (text: string) => void;
  undo:               () => void;
  redo:               () => void;
  insertAtCursor:     (text: string) => void;
  insertLinePrefix:   (prefix: string) => void;
  wrapText:           (open: string, close?: string) => void;
  pickAndInsertImage: () => Promise<void>;

  addTodo:    () => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;

  addTag:    () => void;
  deleteNote: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
export function useNoteEditor({
  notes,
  categories,
  addNote,
  updateNote,
  removeNote,
  addCategory,
  activeCategory,
}: UseNoteEditorOptions): NoteEditorState {

  // ── Modal / popover visibility ─────────────────────────────────────────────
  const [editorVisible,         setEditorVisible]         = useState(false);
  const [linkModalVisible,      setLinkModalVisible]      = useState(false);
  const [colorPickerVisible,    setColorPickerVisible]    = useState(false);
  const [catPickerVisible,      setCatPickerVisible]      = useState(false);
  const [formatPopoverVisible,  setFormatPopoverVisible]  = useState(false);
  const [emojiPickerVisible,    setEmojiPickerVisible]    = useState(false);

  // ── which note is being edited ─────────────────────────────────────────────
  const [editNote, setEditNote] = useState<Note | null>(null);

  // ── editor fields ──────────────────────────────────────────────────────────
  const [edTitle,      setEdTitle]      = useState('');
  const [edBody,       setEdBody]       = useState('');
  const [edCategory,   setEdCategory]   = useState('Personal');
  const [edCardColor,  setEdCardColor]  = useState<string>(CARD_COLORS[0]);
  const [edTags,       setEdTags]       = useState<NoteTag[]>([]);
  const [edTodos,      setEdTodos]      = useState<ChecklistItem[]>([]);
  const [edImages,     setEdImages]     = useState<string[]>([]);
  const [edFontFamily, setEdFontFamily] = useState<string | undefined>(undefined);
  const [editorTab,    setEditorTab]    = useState<'note' | 'todos'>('note');
  const [newTodoText,  setNewTodoText]  = useState('');

  // ── tag form ───────────────────────────────────────────────────────────────
  const [addTagMode,   setAddTagMode]   = useState(false);
  const [newTagName,   setNewTagName]   = useState('');
  const [newTagColor,  setNewTagColor]  = useState<string>(TAG_PALETTE[0]);

  // ── link form ──────────────────────────────────────────────────────────────
  const [linkUrl,  setLinkUrl]  = useState('');
  const [linkText, setLinkText] = useState('');

  // ── keyboard height (Android Modal workaround) ─────────────────────────────
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e =>
      setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── text-input refs ────────────────────────────────────────────────────────
  const bodyRef  = useRef<TextInput>(null);
  const [bodySel, setBodySel] = useState({ start: 0, end: 0 });

  // ── undo / redo ────────────────────────────────────────────────────────────
  const undoStack      = useRef<string[]>([]);
  const redoStack      = useRef<string[]>([]);
  const lastUndoPushTs = useRef(0);

  // ── helpers ────────────────────────────────────────────────────────────────
  const resetEditorState = () => {
    setEdTitle('');
    setEdBody('');
    setEdTodos([]);
    setEditorTab('note');
    setEdTags([]);
    setAddTagMode(false);
    setEdImages([]);
    setEdFontFamily(undefined);
    undoStack.current = [];
    redoStack.current = [];
    setEmojiPickerVisible(false);
    setFormatPopoverVisible(false);
  };

  // ── open / save ────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditNote(null);
    resetEditorState();
    setEdCategory(activeCategory !== 'All' ? activeCategory : 'Personal');
    setEdCardColor(CARD_COLORS[0]);
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

  const saveNote = () => {
    if (!edTitle.trim() && !edBody.trim() && edTodos.length === 0) {
      setEditorVisible(false);
      return;
    }
    const now = Date.now();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editNote) {
      updateNote({
        ...editNote,
        title:     edTitle,
        body:      edBody,
        category:  edCategory,
        cardColor: edCardColor,
        tags:      edTags,
        date:      formatDate(editNote.timestamp),
        todos:     edTodos,
        images:    edImages,
        fontFamily: edFontFamily,
      });
    } else {
      const newNote: Note = {
        id:        now.toString(),
        title:     edTitle.trim() || 'Untitled',
        body:      edBody,
        date:      formatDate(now),
        timestamp: now,
        category:  edCategory,
        cardColor: edCardColor,
        tags:      edTags,
        todos:     edTodos,
        images:    edImages,
        fontFamily: edFontFamily,
      };
      addNote(newNote);
      if (!categories.includes(edCategory)) addCategory(edCategory);
    }
    setEditorVisible(false);
  };

  const shareNote = async () => {
    const title = edTitle.trim() || 'Note';
    const todoText = edTodos.length > 0
      ? '\n\nChecklist:\n' + edTodos.map(t => `${t.done ? '✓' : '☐'} ${t.text}`).join('\n')
      : '';
    try {
      await Share.share({ title, message: `${title}\n\n${edBody}${todoText}`.trim() });
    } catch { /* user cancelled */ }
  };

  // ── checklist ──────────────────────────────────────────────────────────────
  const addTodo = () => {
    const text = newTodoText.trim();
    if (!text) return;
    setEdTodos(prev => [...prev, { id: Date.now().toString(), text, done: false }]);
    setNewTodoText('');
  };

  const toggleTodo = (id: string) =>
    setEdTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const removeTodo = (id: string) =>
    setEdTodos(prev => prev.filter(t => t.id !== id));

  // ── delete note ────────────────────────────────────────────────────────────
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

  // ── tag helpers ────────────────────────────────────────────────────────────
  const addTag = () => {
    const label = newTagName.trim().toUpperCase();
    if (!label) return;
    setEdTags(prev => [...prev, { label, color: newTagColor }]);
    setNewTagName('');
    setNewTagColor(TAG_PALETTE[0]);
    setAddTagMode(false);
  };

  // ── undo / redo ────────────────────────────────────────────────────────────
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
    setEdBody(redoStack.current.shift()!);
  };

  // ── text insertion helpers ─────────────────────────────────────────────────
  const insertAtCursor = (text: string) => {
    const { start, end } = bodySel;
    const newBody = edBody.slice(0, start) + text + edBody.slice(end);
    handleBodyChange(newBody);
    const newPos = start + text.length;
    setTimeout(() => {
      bodyRef.current?.focus();
      (bodyRef.current as any)?.setNativeProps({
        selection: { start: newPos, end: newPos },
      });
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
      const selected = edBody.slice(start, end);
      handleBodyChange(
        edBody.slice(0, start) + open + selected + close + edBody.slice(end),
      );
      setTimeout(() => bodyRef.current?.focus(), 60);
    } else {
      const newBody = edBody.slice(0, start) + open + close + edBody.slice(start);
      handleBodyChange(newBody);
      const newPos = start + open.length;
      setTimeout(() => {
        bodyRef.current?.focus();
        (bodyRef.current as any)?.setNativeProps({
          selection: { start: newPos, end: newPos },
        });
      }, 60);
    }
  };

  // ── image picker ───────────────────────────────────────────────────────────
  const pickAndInsertImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow photo library access to insert images.',
      );
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

  // ─────────────────────────────────────────────────────────────────────────
  return {
    // visibility
    editorVisible,        setEditorVisible,
    linkModalVisible,     setLinkModalVisible,
    colorPickerVisible,   setColorPickerVisible,
    catPickerVisible,     setCatPickerVisible,
    formatPopoverVisible, setFormatPopoverVisible,
    emojiPickerVisible,   setEmojiPickerVisible,
    // note being edited
    editNote,
    // fields
    edTitle,      setEdTitle,
    edBody,
    edCategory,   setEdCategory,
    edCardColor,  setEdCardColor,
    edTags,       setEdTags,
    edTodos,      setEdTodos,
    edImages,     setEdImages,
    edFontFamily, setEdFontFamily,
    editorTab,    setEditorTab,
    newTodoText,  setNewTodoText,
    // tag form
    addTagMode,   setAddTagMode,
    newTagName,   setNewTagName,
    newTagColor,  setNewTagColor,
    // link form
    linkUrl,  setLinkUrl,
    linkText, setLinkText,
    // keyboard
    kbHeight,
    // refs
    bodyRef, bodySel, setBodySel,
    // actions
    openNew, openEdit, saveNote, shareNote,
    handleBodyChange, undo, redo,
    insertAtCursor, insertLinePrefix, wrapText,
    pickAndInsertImage,
    addTodo, toggleTodo, removeTodo,
    addTag, deleteNote,
  };
}
