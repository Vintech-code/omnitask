import { fontFamily } from '@/theme/typography';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/context/ThemeContext';
import { useTaskStore } from '@/context/TaskStore';
import type { Note, StandardNoteType } from '@/types/note';
import { CARD_COLORS } from '@/theme/colors';
import { formatDate } from '@/utils/date';
import { StandardNoteEditor } from './StandardNoteEditor';
import { NewNoteSheet } from './NewNoteSheet';

type SortMode = 'updated' | 'created' | 'category' | 'favorites';
const createDraft = (type: StandardNoteType): Note => { const now = Date.now(); return { id: `${now}_${Math.random().toString(36).slice(2, 6)}`, title: '', body: '', date: formatDate(now), timestamp: now, createdAt: now, updatedAt: now, category: 'Personal', cardColor: CARD_COLORS[0], tags: [], todos: [], images: [], type, pinned: false, archived: false }; };

function NoteRow({ note, onOpen, onMenu }: { note: Note; onOpen: () => void; onMenu: () => void }) {
  const { theme } = useTheme(); const total = note.todos?.length ?? 0; const done = note.todos?.filter(item => item.done).length ?? 0;
  return <TouchableOpacity style={[styles.noteRow, { borderBottomColor: theme.divider }]} onPress={onOpen} onLongPress={onMenu} delayLongPress={350}><View style={[styles.noteMark, { backgroundColor: note.pinned ? theme.accent.soft : theme.glass.secondary }]}><MaterialCommunityIcons name={note.type === 'checklist' ? 'checkbox-marked-outline' : note.type === 'rich' ? 'file-document-edit-outline' : 'note-text-outline'} size={21} color={note.pinned ? theme.accent.base : theme.content.secondary} /></View><View style={styles.noteCopy}><View style={styles.noteTitleRow}><Text style={[styles.noteTitle, { color: theme.content.primary }]} numberOfLines={1}>{note.title.trim() || 'Untitled'}</Text>{note.pinned ? <Ionicons name="pin" size={13} color={theme.accent.base} /> : null}</View><Text style={[styles.previewText, { color: theme.content.secondary }]} numberOfLines={1}>{note.body.trim() || (total ? `${done} of ${total} checklist items complete` : 'Empty note')}</Text><View style={styles.noteMeta}><Text style={[styles.metaText, { color: theme.content.muted }]}>{note.category} · {new Date(note.updatedAt ?? note.timestamp).toLocaleDateString()}</Text>{total ? <View style={[styles.progressMini, { backgroundColor: theme.divider }]}><View style={{ height: 3, borderRadius: 2, width: `${total ? done / total * 100 : 0}%`, backgroundColor: theme.accent.base }} /></View> : null}</View></View>{note.images?.[0] ? <Image source={{ uri: note.images[0] }} style={styles.thumb} /> : <Ionicons name="chevron-forward" size={17} color={theme.content.muted} />}</TouchableOpacity>;
}

export function StandardNotesWorkspace({ initialNoteId, openRequest, createType, createRequest }: { initialNoteId?: string; openRequest?: number; createType?: StandardNoteType; createRequest?: number } = {}) {
  const { theme } = useTheme();
  const { notes, categories, isLoading, addNote, updateNote, removeNote, addCategory } = useTaskStore();
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('All'); const [sort, setSort] = useState<SortMode>('updated'); const [archived, setArchived] = useState(false); const [active, setActive] = useState<Note | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const handledOpenRequest = useRef<string | null>(null);
  const handledCreateRequest = useRef<number | null>(null);
  useEffect(() => {
    if (!initialNoteId) return;
    const requestKey = `${initialNoteId}:${openRequest ?? 0}`;
    if (handledOpenRequest.current === requestKey) return;
    const requested = notes.find(note => note.id === initialNoteId);
    if (requested) {
      handledOpenRequest.current = requestKey;
      setArchived(Boolean(requested.archived));
      setActive(requested);
    }
  }, [initialNoteId, notes, openRequest]);
  const filtered = useMemo(() => notes.filter(note => Boolean(note.archived) === archived).filter(note => category === 'All' || note.category === category).filter(note => `${note.title} ${note.body} ${note.tags.map(tag => tag.label).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === 'created' ? (b.createdAt ?? b.timestamp) - (a.createdAt ?? a.timestamp) : sort === 'category' ? a.category.localeCompare(b.category) : sort === 'favorites' ? Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) : (b.updatedAt ?? b.timestamp) - (a.updatedAt ?? a.timestamp)), [archived, category, notes, query, sort]);
  const pinned = filtered.filter(note => note.pinned); const recent = filtered.filter(note => !note.pinned);
  const create = (type: StandardNoteType) => { const note = createDraft(type); addNote(note); setActive(note); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
  useEffect(() => {
    if (!createType || !createRequest || handledCreateRequest.current === createRequest) return;
    handledCreateRequest.current = createRequest;
    create(createType);
  }, [createRequest, createType]);
  const save = (note: Note) => { updateNote(note); if (!categories.includes(note.category)) addCategory(note.category); setActive(note); };
  const close = () => { if (active && !active.title.trim() && !active.body.trim() && !(active.todos?.length) && !(active.images?.length)) removeNote(active.id); setActive(null); };
  const menu = (note: Note) => Alert.alert(note.title || 'Untitled', undefined, [{ text: note.pinned ? 'Unpin' : 'Pin', onPress: () => updateNote({ ...note, pinned: !note.pinned }) }, { text: note.archived ? 'Restore' : 'Archive', onPress: () => updateNote({ ...note, archived: !note.archived }) }, { text: 'Delete', style: 'destructive', onPress: () => removeNote(note.id) }, { text: 'Cancel', style: 'cancel' }]);
  if (isLoading) return <View style={styles.center}><Text style={{ color: theme.content.secondary }}>Loading notes…</Text></View>;
  const renderSection = (label: string, items: Note[]) => items.length ? <View style={styles.section}><Text style={[styles.sectionLabel, { color: theme.content.muted }]}>{label}</Text><View style={[styles.group, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>{items.map(note => <NoteRow key={note.id} note={note} onOpen={() => setActive(note)} onMenu={() => menu(note)} />)}</View></View> : null;

  return <View style={styles.root}><View style={[styles.search, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}><Ionicons name="search-outline" size={18} color={theme.content.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search titles, text, and tags" placeholderTextColor={theme.content.muted} style={[styles.searchInput, { color: theme.content.primary }]} />{query ? <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={18} color={theme.content.muted} /></TouchableOpacity> : null}</View><View style={styles.controlRow}><ScrollView style={{ flex: 1 }} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{['All', ...categories].map(value => <TouchableOpacity key={value} style={[styles.chip, { backgroundColor: category === value ? theme.accent.soft : 'transparent', borderColor: category === value ? theme.glass.highlight : theme.divider }]} onPress={() => setCategory(value)}><Text style={{ color: category === value ? theme.accent.base : theme.content.secondary, fontSize: 12, fontFamily: fontFamily.bold }}>{value}</Text></TouchableOpacity>)}</ScrollView><TouchableOpacity accessibilityLabel="Change note sorting" style={[styles.control, { borderColor: theme.glass.border }]} onPress={() => Alert.alert('Sort notes', undefined, [{ text: 'Recently updated', onPress: () => setSort('updated') }, { text: 'Created date', onPress: () => setSort('created') }, { text: 'Category', onPress: () => setSort('category') }, { text: 'Favorites first', onPress: () => setSort('favorites') }, { text: 'Cancel', style: 'cancel' }])}><Ionicons name="swap-vertical" size={18} color={theme.content.primary} /></TouchableOpacity><TouchableOpacity accessibilityLabel={archived ? 'Show active notes' : 'Show archived notes'} style={[styles.control, { borderColor: theme.glass.border, backgroundColor: archived ? theme.accent.soft : 'transparent' }]} onPress={() => setArchived(value => !value)}><Ionicons name={archived ? 'albums' : 'archive-outline'} size={18} color={archived ? theme.accent.base : theme.content.primary} /></TouchableOpacity></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>{filtered.length ? <>{renderSection('PINNED', pinned)}{renderSection(archived ? 'ARCHIVED' : 'RECENTLY EDITED', recent)}</> : <View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: theme.accent.soft }]}><MaterialCommunityIcons name="note-plus-outline" size={29} color={theme.accent.base} /></View><Text style={[styles.emptyTitle, { color: theme.content.primary }]}>{archived ? 'Archive is clear' : 'A clear space for your thinking'}</Text><Text style={[styles.emptyText, { color: theme.content.secondary }]}>{archived ? 'Archived notes will appear here.' : 'Capture a thought, build a checklist, or compose a richer document.'}</Text></View>}</ScrollView>
    {!archived ? <TouchableOpacity style={[styles.create, { backgroundColor: theme.accent.base }]} onPress={() => setCreateOpen(true)}><Ionicons name="add" size={24} color="#FFF" /><Text style={styles.createText}>New</Text></TouchableOpacity> : null}
    <NewNoteSheet visible={createOpen} onClose={() => setCreateOpen(false)} onCreateNote={() => create('text')} onCreateChecklist={() => create('checklist')} />
    {active ? <StandardNoteEditor note={active} onSave={save} onClose={close} onDelete={() => { removeNote(active.id); setActive(null); }} /> : null}
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, search: { minHeight: 50, marginHorizontal: 20, borderWidth: 1, borderRadius: 17, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 }, searchInput: { flex: 1, fontSize: 14 }, controlRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingRight: 20 }, chips: { paddingHorizontal: 20, gap: 7, alignItems: 'center' }, chip: { minHeight: 34, borderRadius: 17, borderWidth: 1, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' }, control: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 6 }, content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 174 }, section: { marginBottom: 18 }, sectionLabel: { marginLeft: 4, marginBottom: 8, fontSize: 10, fontFamily: fontFamily.black, letterSpacing: 1.1 }, group: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' }, noteRow: { minHeight: 84, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 }, noteMark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, noteCopy: { flex: 1 }, noteTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, noteTitle: { flexShrink: 1, fontSize: 15, fontFamily: fontFamily.extrabold }, previewText: { marginTop: 3, fontSize: 12 }, noteMeta: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }, metaText: { fontSize: 10, fontFamily: fontFamily.semibold }, progressMini: { width: 44, height: 3, borderRadius: 2, overflow: 'hidden' }, thumb: { width: 52, height: 52, borderRadius: 13 }, empty: { paddingTop: 72, alignItems: 'center' }, emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { marginTop: 15, fontSize: 18, fontFamily: fontFamily.extrabold }, emptyText: { maxWidth: 290, marginTop: 6, fontSize: 13, lineHeight: 19, textAlign: 'center' }, create: { position: 'absolute', right: 20, bottom: 132, minHeight: 52, borderRadius: 26, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 7 }, createText: { color: '#FFF', fontSize: 14, fontFamily: fontFamily.extrabold } });
