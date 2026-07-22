import { fontFamily } from '@/theme/typography';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import { useCanvasNotes } from '@/context/CanvasNoteStore';
import { CANVAS_DOCUMENT_VERSION, type InfiniteCanvasNote } from '@/types/note';
import { CanvasNoteEditor } from './CanvasNoteEditor';
import { joinCanvasCollaboration } from '@/services/CanvasCollaborationService';

const createBoard = (): InfiniteCanvasNote => {
  const now = Date.now();
  return { id: `${now}_${Math.random().toString(36).slice(2, 7)}`, documentVersion: CANVAS_DOCUMENT_VERSION, title: 'Untitled board', objects: [], canvasPosition: { x: -240, y: -330 }, zoomLevel: 0.8, gridEnabled: true, snapEnabled: true, background: '#F8F8F5', canvasTheme: 'system', tags: [], createdAt: now, updatedAt: now };
};

export function CanvasNotesWorkspace() {
  const { theme } = useTheme();
  const { canvasNotes, isLoading, addCanvasNote, updateCanvasNote, removeCanvasNote } = useCanvasNotes();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<InfiniteCanvasNote | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const filtered = useMemo(() => canvasNotes.filter(note => note.title.toLowerCase().includes(query.trim().toLowerCase())), [canvasNotes, query]);

  const create = () => { const note = createBoard(); addCanvasNote(note); setActive(note); };
  const confirmDelete = (note: InfiniteCanvasNote) => Alert.alert('Delete board?', `“${note.title}” will be permanently deleted.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete board', style: 'destructive', onPress: () => removeCanvasNote(note.id) },
  ]);
  const join = async () => {
    if (joining || !joinCode.trim()) return;
    setJoining(true);
    try {
      const shared = await joinCanvasCollaboration(joinCode);
      const existing = canvasNotes.find(note => note.collaborationId === shared.collaborationId);
      const local = existing ? { ...shared, id: existing.id } : shared;
      if (existing) updateCanvasNote(local); else addCanvasNote(local);
      setActive(local);
      setJoinCode('');
      setJoinOpen(false);
    } catch (error) {
      Alert.alert('Could not join canvas', error instanceof Error ? error.message : 'Check the code and try again.');
    } finally {
      setJoining(false);
    }
  };
  if (isLoading) return <View style={styles.center}><Text style={{ color: theme.content.secondary }}>Loading boards…</Text></View>;

  return (
    <View style={styles.container}>
      <View style={[styles.search, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.content.muted} />
        <TextInput style={[styles.searchInput, { color: theme.content.primary }]} value={query} onChangeText={setQuery} placeholder="Search canvas boards" placeholderTextColor={theme.content.muted} />
        {query ? <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={19} color={theme.content.muted} /></TouchableOpacity> : null}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headingRow}><View style={styles.headingCopy}><Text style={[styles.heading, { color: theme.content.primary }]}>Your boards</Text><Text style={[styles.subheading, { color: theme.content.secondary }]}>Ideas, lessons, plans, and visual thinking</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Join shared canvas" style={[styles.joinButton, { backgroundColor: theme.accent.soft }]} onPress={() => setJoinOpen(true)}><Ionicons name="people-outline" size={18} color={theme.accent.base} /><Text style={[styles.joinText, { color: theme.accent.base }]}>Join</Text></TouchableOpacity><Text style={[styles.count, { color: theme.content.muted }]}>{filtered.length}</Text></View>
        {filtered.length === 0 ? <View style={[styles.empty, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}><View style={[styles.emptyIcon, { backgroundColor: theme.accent.soft }]}><MaterialCommunityIcons name="vector-square" size={30} color={theme.accent.base} /></View><Text style={[styles.emptyTitle, { color: theme.content.primary }]}>{query ? 'No matching boards' : 'Start with an open canvas'}</Text><Text style={[styles.emptyCopy, { color: theme.content.secondary }]}>{query ? 'Try another board title.' : 'Arrange notes, images, sketches, and shapes in one flexible workspace.'}</Text>{!query ? <TouchableOpacity style={[styles.primary, { backgroundColor: theme.accent.base }]} onPress={create}><Ionicons name="add" size={20} color="#FFF" /><Text style={styles.primaryText}>Create canvas</Text></TouchableOpacity> : null}</View> : <View style={[styles.group, { backgroundColor: theme.glass.secondary, borderColor: theme.glass.border }]}>{filtered.map((note, index) => <View key={note.id} style={[styles.row, index < filtered.length - 1 && { borderBottomColor: theme.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${note.title}`} style={styles.rowMain} onPress={() => setActive(note)}><View style={[styles.preview, { backgroundColor: theme.dark ? '#1B1C1A' : '#F7F7F3', borderColor: theme.glass.border }]}><MaterialCommunityIcons name={note.objects.length ? 'vector-polyline' : 'vector-square'} size={23} color={theme.accent.base} /></View><View style={styles.copy}><Text style={[styles.title, { color: theme.content.primary }]} numberOfLines={1}>{note.title}</Text><Text style={[styles.meta, { color: theme.content.secondary }]}>{note.objects.length} object{note.objects.length === 1 ? '' : 's'} · Edited {new Date(note.updatedAt).toLocaleDateString()}</Text></View><Ionicons name="chevron-forward" size={18} color={theme.content.muted} /></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${note.title}`} style={styles.deleteBoardButton} onPress={() => confirmDelete(note)}><Ionicons name="trash-outline" size={20} color={theme.semantic.danger} /></TouchableOpacity></View>)}</View>}
      </ScrollView>
      {filtered.length > 0 ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Create infinite canvas" style={[styles.fab, { backgroundColor: theme.accent.base }]} onPress={create}><Ionicons name="add" size={28} color="#FFF" /></TouchableOpacity> : null}
      <Modal visible={Boolean(active)} animationType="slide" onRequestClose={() => setActive(null)}>{active ? <CanvasNoteEditor note={active} onSave={note => { updateCanvasNote(note); setActive(note); }} onClose={() => setActive(null)} /> : null}</Modal>
      <Modal visible={joinOpen} transparent animationType="fade" onRequestClose={() => !joining && setJoinOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalLayer, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.68)' : 'rgba(23,23,23,0.28)' }]}>
          <View style={[styles.joinSheet, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
            <View style={styles.joinHeader}><View><Text style={[styles.joinTitle, { color: theme.content.primary }]}>Join a shared canvas</Text><Text style={[styles.joinHint, { color: theme.content.secondary }]}>Enter the owner’s 10-character code. It is valid for 3 days.</Text></View><TouchableOpacity disabled={joining} accessibilityLabel="Close join canvas" style={styles.closeButton} onPress={() => setJoinOpen(false)}><Ionicons name="close" size={22} color={theme.content.primary} /></TouchableOpacity></View>
            <TextInput autoCapitalize="characters" autoCorrect={false} editable={!joining} maxLength={20} value={joinCode} onChangeText={value => setJoinCode(value.replace(/[^a-z0-9]/gi, '').toUpperCase())} placeholder="COLLAB CODE" placeholderTextColor={theme.content.muted} style={[styles.codeInput, { color: theme.content.primary, borderColor: theme.glass.border, backgroundColor: theme.glass.secondary }]} onSubmitEditing={join} />
            <View style={styles.joinActions}><TouchableOpacity disabled={joining} style={styles.cancelButton} onPress={() => setJoinOpen(false)}><Text style={[styles.cancelText, { color: theme.content.secondary }]}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={joining || !joinCode.trim()} style={[styles.joinPrimary, { backgroundColor: theme.accent.base, opacity: joining || !joinCode.trim() ? 0.55 : 1 }]} onPress={join}>{joining ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="enter-outline" size={19} color="#FFF" /><Text style={styles.joinPrimaryText}>Join canvas</Text></>}</TouchableOpacity></View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, search: { minHeight: 50, marginHorizontal: 20, marginTop: 2, borderRadius: 17, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 }, searchInput: { flex: 1, fontSize: 14 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 150 }, headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }, headingCopy: { flex: 1 }, heading: { fontSize: 19, fontFamily: fontFamily.extrabold }, subheading: { marginTop: 2, fontSize: 12 }, count: { minWidth: 18, textAlign: 'right', fontSize: 12, fontFamily: fontFamily.bold }, joinButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 }, joinText: { fontSize: 12, fontFamily: fontFamily.extrabold },
  group: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' }, row: { minHeight: 82, paddingLeft: 14, paddingRight: 6, flexDirection: 'row', alignItems: 'center' }, rowMain: { flex: 1, minHeight: 82, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, deleteBoardButton: { width: 44, height: 44, marginLeft: 2, alignItems: 'center', justifyContent: 'center' }, preview: { width: 58, height: 58, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, title: { fontSize: 15, fontFamily: fontFamily.extrabold }, meta: { marginTop: 4, fontSize: 11 },
  empty: { borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center' }, emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { marginTop: 14, fontSize: 18, fontFamily: fontFamily.extrabold }, emptyCopy: { marginTop: 5, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280 }, primary: { minHeight: 48, borderRadius: 24, paddingHorizontal: 20, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 7 }, primaryText: { color: '#FFF', fontSize: 14, fontFamily: fontFamily.extrabold },
  fab: { position: 'absolute', right: 20, bottom: 108, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  modalLayer: { flex: 1, justifyContent: 'center', padding: 20 }, joinSheet: { borderRadius: 24, borderWidth: 1, padding: 18 }, joinHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }, joinTitle: { fontSize: 19, fontFamily: fontFamily.extrabold }, joinHint: { marginTop: 3, fontSize: 12 }, closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -8, marginRight: -8 }, codeInput: { minHeight: 52, borderWidth: 1, borderRadius: 15, marginTop: 18, paddingHorizontal: 15, letterSpacing: 2, fontSize: 17, fontFamily: fontFamily.extrabold }, joinActions: { marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }, cancelButton: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }, cancelText: { fontSize: 14, fontFamily: fontFamily.bold }, joinPrimary: { minHeight: 46, borderRadius: 23, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, joinPrimaryText: { color: '#FFF', fontSize: 14, fontFamily: fontFamily.extrabold },
});
