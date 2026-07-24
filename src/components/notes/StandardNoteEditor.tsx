import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppAlert as Alert } from '@/components/ui/AppDialog';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
import { useTaskStore } from '@/context/TaskStore';
import { useTheme } from '@/context/ThemeContext';
import { fontFamily } from '@/theme/typography';
import type { ChecklistItem, Note } from '@/types/note';
import { AttachmentImage } from '@/components/attachments';
import { useAttachments } from '@/context/AttachmentContext';

type Props = {
  note: Note;
  onSave: (note: Note) => void;
  onClose: () => void;
  onDelete: () => void;
  onOpenTask?: (taskId: string) => void;
};

const updated = (note: Note, changes: Partial<Note>): Note => ({ ...note, ...changes, updatedAt: Date.now() });

function ChecklistDragHandle({ onMove }: { onMove: (direction: -1 | 1) => void }) {
  const latest = useRef(onMove);
  latest.current = onMove;
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -24) latest.current(-1);
      if (gesture.dy > 24) latest.current(1);
    },
  }), []);
  return (
    <View accessibilityLabel="Drag to reorder item" style={styles.dragHandle} {...responder.panHandlers}>
      <MaterialCommunityIcons name="drag-horizontal" size={20} color="#92938F" />
    </View>
  );
}

export function StandardNoteEditor({ note, onSave, onClose, onDelete, onOpenTask }: Props) {
  const { theme } = useTheme();
  const { tasks, promoteChecklistItem, linkChecklistItem, unlinkChecklistItem } = useTaskStore();
  const { importImage, remove: removeAttachment } = useAttachments();
  const [draft, setDraft] = useState(note);
  const [newItem, setNewItem] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
  const first = useRef(true);
  const bodyRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const selection = useRef({ start: 0, end: 0 });

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => onSave(draft), 550);
    return () => clearTimeout(timer);
  }, [draft, onSave]);

  const patch = (changes: Partial<Note>) => setDraft(current => updated(current, changes));
  const prefix = (value: string) => {
    const position = selection.current.start;
    const lineStart = draft.body.lastIndexOf('\n', Math.max(0, position - 1)) + 1;
    patch({ body: `${draft.body.slice(0, lineStart)}${value}${draft.body.slice(lineStart)}` });
    setTimeout(() => bodyRef.current?.focus(), 30);
  };

  const addChecklistItem = () => {
    const text = newItem.trim();
    if (!text) return;
    const item: ChecklistItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      done: false,
      createdAt: Date.now(),
    };
    patch({ todos: [...(draft.todos ?? []), item], type: 'checklist' });
    setNewItem('');
  };

  const toggle = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    patch({
      todos: (draft.todos ?? []).map(item => item.id === id
        ? { ...item, done: !item.done, completedAt: !item.done ? Date.now() : undefined }
        : item),
    });
  };

  const move = (id: string, direction: -1 | 1) => {
    const items = [...(draft.todos ?? [])];
    const index = items.findIndex(item => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    patch({ todos: items });
  };

  const makeSubtask = (id: string) => {
    const items = draft.todos ?? [];
    const index = items.findIndex(item => item.id === id);
    if (index <= 0) return;
    patch({
      todos: items.map(item => item.id === id
        ? { ...item, parentId: item.parentId ? undefined : items[index - 1].id }
        : item),
    });
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      try {
        const attachment = await importImage({
          uri: asset.uri,
          purpose: 'note',
          parentId: draft.id,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
        });
        patch({ attachmentIds: [...(draft.attachmentIds ?? []), attachment.id], type: 'rich' });
      } catch (error) {
        Alert.alert('Could not attach image', error instanceof Error ? error.message : 'Please try another image.');
      }
    }
  };

  const removeImageAttachment = (attachmentId: string) => {
    patch({ attachmentIds: (draft.attachmentIds ?? []).filter(id => id !== attachmentId) });
    void removeAttachment(attachmentId);
  };

  const openTaskActions = (item: ChecklistItem) => {
    const linked = item.linkedTaskId ? tasks.find(task => task.id === item.linkedTaskId) : null;
    if (linked) {
      Alert.alert('Linked task', 'This checklist item stays synchronized with its real Task.', [
        { text: 'Open task', onPress: () => onOpenTask?.(linked.id) },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => void unlinkChecklistItem(draft.id, item.id).then(() => {
            patch({
              todos: (draft.todos ?? []).map(value => {
                if (value.id !== item.id) return value;
                const { linkedTaskId: _linkedTaskId, ...unlinked } = value;
                return unlinked;
              }),
            });
          }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    Alert.alert('Make this actionable', 'Promote this checklist item or link it to an existing Task.', [
      {
        text: 'Promote to task',
        onPress: () => {
          onSave(draft);
          void promoteChecklistItem(draft.id, item.id).then(task => {
            if (!task) return;
            patch({ todos: (draft.todos ?? []).map(value => value.id === item.id ? { ...value, linkedTaskId: task.id } : value) });
            onOpenTask?.(task.id);
          });
        },
      },
      {
        text: 'Link existing task',
        onPress: () => {
          onSave(draft);
          setLinkingItemId(item.id);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const linkExisting = async (taskId: string) => {
    if (!linkingItemId) return;
    await linkChecklistItem(taskId, draft.id, linkingItemId);
    const linked = tasks.find(task => task.id === taskId);
    patch({
      todos: (draft.todos ?? []).map(value => value.id === linkingItemId
        ? {
            ...value,
            linkedTaskId: taskId,
            text: linked?.title ?? value.text,
            done: linked?.status === 'completed',
          }
        : value),
    });
    setLinkingItemId(null);
  };

  const incomplete = (draft.todos ?? []).filter(item => !item.done);
  const complete = (draft.todos ?? []).filter(item => item.done);
  const progress = draft.todos?.length ? complete.length / draft.todos.length : 0;

  const renderItem = (item: ChecklistItem) => (
    <View key={item.id} style={[styles.checkRow, item.parentId && styles.subtask]}>
      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.done }}
        accessibilityLabel={`${item.done ? 'Reopen' : 'Complete'} ${item.text}`}
        style={styles.checkHit}
        onPress={() => toggle(item.id)}
      >
        <MaterialCommunityIcons name={item.done ? 'checkbox-marked' : 'checkbox-blank-outline'} size={25} color={item.done ? theme.accent.base : theme.content.muted} />
      </TouchableOpacity>
      <TextInput
        value={item.text}
        onChangeText={text => patch({ todos: (draft.todos ?? []).map(value => value.id === item.id ? { ...value, text } : value) })}
        style={[styles.checkText, { color: item.done ? theme.content.muted : theme.content.primary }, item.done && styles.done]}
      />
      <TouchableOpacity accessibilityLabel={item.linkedTaskId ? 'Open linked task options' : 'Promote or link task'} style={styles.miniAction} onPress={() => openTaskActions(item)}>
        <Ionicons name={item.linkedTaskId ? 'link' : 'link-outline'} size={17} color={item.linkedTaskId ? theme.accent.base : theme.content.muted} />
      </TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Toggle subtask" style={styles.miniAction} onPress={() => makeSubtask(item.id)}>
        <MaterialCommunityIcons name="format-indent-increase" size={17} color={theme.content.muted} />
      </TouchableOpacity>
      <ChecklistDragHandle onMove={direction => move(item.id, direction)} />
    </View>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background.base }]}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.header, { borderBottomColor: theme.divider }]}>
            <TouchableOpacity accessibilityLabel="Close note" style={styles.icon} onPress={onClose}>
              <Ionicons name="chevron-back" size={24} color={theme.content.primary} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={[styles.kind, { color: theme.accent.base }]}>{draft.type === 'checklist' ? 'Checklist' : 'Note'}</Text>
              <Text style={[styles.saved, { color: theme.content.muted }]}>Autosaved · {new Date(draft.updatedAt ?? draft.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
            <TouchableOpacity accessibilityLabel={draft.pinned ? 'Unpin note' : 'Pin note'} style={styles.icon} onPress={() => patch({ pinned: !draft.pinned })}>
              <Ionicons name={draft.pinned ? 'pin' : 'pin-outline'} size={21} color={draft.pinned ? theme.accent.base : theme.content.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doneButton, { backgroundColor: theme.accent.base }]} onPress={onClose}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <TextInput value={draft.title} onChangeText={title => patch({ title })} placeholder="Title" placeholderTextColor={theme.content.muted} multiline style={[styles.title, { color: theme.content.primary }]} />
            <View style={styles.metaRow}>
              <View style={[styles.metaField, { borderColor: theme.glass.border, backgroundColor: theme.glass.secondary }]}>
                <Ionicons name="folder-outline" size={16} color={theme.content.muted} />
                <TextInput value={draft.category} onChangeText={category => patch({ category })} placeholder="Category" placeholderTextColor={theme.content.muted} style={[styles.metaInput, { color: theme.content.primary }]} />
              </View>
              <View style={[styles.metaField, { borderColor: theme.glass.border, backgroundColor: theme.glass.secondary }]}>
                <Ionicons name="pricetag-outline" size={16} color={theme.content.muted} />
                <TextInput value={draft.tags.map(tag => tag.label).join(', ')} onChangeText={value => patch({ tags: value.split(',').map(label => label.trim()).filter(Boolean).map(label => ({ label, color: theme.accent.base })) })} placeholder="Tags" placeholderTextColor={theme.content.muted} style={[styles.metaInput, { color: theme.content.primary }]} />
              </View>
            </View>

            {draft.type !== 'checklist' ? (
              <>
                <TextInput
                  ref={bodyRef}
                  value={draft.body}
                  onChangeText={body => patch({ body })}
                  onSelectionChange={event => { selection.current = event.nativeEvent.selection; }}
                  placeholder="Start writing..."
                  placeholderTextColor={theme.content.muted}
                  multiline
                  textAlignVertical="top"
                  style={[styles.body, { color: theme.content.primary }]}
                />
                {draft.attachmentIds?.length || draft.images?.length ? (
                  <ScrollView horizontal contentContainerStyle={styles.images}>
                    {(draft.attachmentIds ?? []).map(attachmentId => <View key={attachmentId}><AttachmentImage attachmentId={attachmentId} style={styles.image} showStatus /><TouchableOpacity accessibilityLabel="Remove image" style={styles.removeImage} onPress={() => removeImageAttachment(attachmentId)}><Ionicons name="close" size={16} color="#FFF" /></TouchableOpacity></View>)}
                    {(draft.images ?? []).slice(draft.attachmentIds?.length ?? 0).map((uri, offset) => {
                      const index = offset + (draft.attachmentIds?.length ?? 0);
                      return <View key={`${uri}_${index}`}><AttachmentImage fallbackUri={uri} style={styles.image} /><TouchableOpacity accessibilityLabel="Remove image" style={styles.removeImage} onPress={() => patch({ images: draft.images?.filter((_, value) => value !== index) })}><Ionicons name="close" size={16} color="#FFF" /></TouchableOpacity></View>;
                    })}
                  </ScrollView>
                ) : null}
              </>
            ) : (
              <View>
                <View style={styles.progressRow}>
                  <View style={[styles.track, { backgroundColor: theme.divider }]}><View style={[styles.fillProgress, { backgroundColor: theme.accent.base, width: `${progress * 100}%` }]} /></View>
                  <Text style={[styles.progressText, { color: theme.content.secondary }]}>{complete.length}/{draft.todos?.length ?? 0}</Text>
                </View>
                <View style={[styles.addRow, { borderColor: theme.glass.border }]}>
                  <TextInput value={newItem} onChangeText={setNewItem} onSubmitEditing={addChecklistItem} placeholder="Add an item" placeholderTextColor={theme.content.muted} style={[styles.addInput, { color: theme.content.primary }]} />
                  <TouchableOpacity accessibilityLabel="Add checklist item" style={[styles.addButton, { backgroundColor: theme.accent.base }]} onPress={addChecklistItem}><Ionicons name="add" size={21} color="#FFF" /></TouchableOpacity>
                </View>
                {incomplete.map(renderItem)}
                {complete.length ? (
                  <>
                    <TouchableOpacity style={styles.completedHeader} onPress={() => setCompletedOpen(value => !value)}>
                      <Text style={[styles.completedTitle, { color: theme.content.secondary }]}>Completed · {complete.length}</Text>
                      <Ionicons name={completedOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.content.muted} />
                    </TouchableOpacity>
                    {completedOpen ? complete.map(renderItem) : null}
                  </>
                ) : null}
              </View>
            )}
          </ScrollView>

          {draft.type !== 'checklist' ? (
            <View style={[styles.toolbar, { borderTopColor: theme.divider, backgroundColor: theme.glass.solid }]}>
              <ToolbarButton icon="list" label="Bullets" onPress={() => prefix('• ')} />
              <ToolbarButton icon="list-outline" label="Numbers" onPress={() => prefix('1. ')} />
              <ToolbarButton icon="image-outline" label="Photo" onPress={() => void pickImage()} />
            </View>
          ) : null}
          <TouchableOpacity style={styles.delete} onPress={() => Alert.alert('Delete note?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: onDelete }])}>
            <Ionicons name="trash-outline" size={18} color={theme.semantic.danger} />
            <Text style={{ color: theme.semantic.danger, fontFamily: fontFamily.bold }}>Delete note</Text>
          </TouchableOpacity>

          <Modal visible={Boolean(linkingItemId)} transparent animationType="fade" onRequestClose={() => setLinkingItemId(null)}>
            <View style={styles.linkModalLayer}>
              <TouchableOpacity accessibilityLabel="Close task picker" activeOpacity={1} onPress={() => setLinkingItemId(null)} style={styles.linkBackdrop} />
              <View style={[styles.linkDialog, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border }]}>
                <Text style={[styles.linkTitle, { color: theme.content.primary }]}>Link existing task</Text>
                <Text style={[styles.linkCopy, { color: theme.content.secondary }]}>Choose a Task to synchronize with this checklist item.</Text>
                <ScrollView style={styles.linkList} showsVerticalScrollIndicator={false}>
                  {tasks.filter(task => task.status !== 'completed').map(task => (
                    <TouchableOpacity key={task.id} accessibilityRole="button" onPress={() => void linkExisting(task.id)} style={[styles.linkRow, { borderBottomColor: theme.divider }]}>
                      <View style={[styles.linkIcon, { backgroundColor: theme.iconTile.teal }]}><Ionicons name="checkbox-outline" size={18} color={theme.iconTile.foreground} /></View>
                      <View style={styles.linkRowCopy}><Text style={[styles.linkRowTitle, { color: theme.content.primary }]} numberOfLines={1}>{task.title}</Text><Text style={[styles.linkRowMeta, { color: theme.content.secondary }]}>{task.projectId || task.status}</Text></View>
                      <Ionicons name="chevron-forward" size={17} color={theme.content.muted} />
                    </TouchableOpacity>
                  ))}
                  {!tasks.some(task => task.status !== 'completed') ? <Text style={[styles.linkEmpty, { color: theme.content.secondary }]}>No open Tasks yet. Promote this item instead.</Text> : null}
                </ScrollView>
                <TouchableOpacity onPress={() => setLinkingItemId(null)} style={[styles.linkCancel, { backgroundColor: theme.glass.secondary }]}><Text style={[styles.linkCancelText, { color: theme.content.primary }]}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function ToolbarButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return <TouchableOpacity accessibilityLabel={label} style={styles.tool} onPress={onPress}><Ionicons name={icon} size={20} color={theme.content.primary} /><Text style={[styles.toolText, { color: theme.content.primary }]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  kind: { fontSize: 13, fontFamily: fontFamily.extrabold },
  saved: { marginTop: 1, fontSize: 10 },
  doneButton: { minHeight: 40, borderRadius: 20, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: '#FFF', fontFamily: fontFamily.extrabold },
  content: { padding: 20, paddingBottom: 120 },
  title: { minHeight: 52, fontSize: 30, lineHeight: 36, fontFamily: fontFamily.extrabold, letterSpacing: -0.7 },
  metaRow: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  metaField: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaInput: { flex: 1, fontSize: 12 },
  body: { minHeight: 360, fontSize: 16, lineHeight: 26, paddingTop: 14 },
  images: { gap: 10, paddingTop: 14 },
  image: { width: 180, height: 130, borderRadius: 16 },
  removeImage: { position: 'absolute', right: 6, top: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,.58)', alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fillProgress: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, fontFamily: fontFamily.extrabold },
  addRow: { minHeight: 50, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  addInput: { flex: 1, fontSize: 15 },
  addButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  checkRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  subtask: { marginLeft: 28 },
  checkHit: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  checkText: { flex: 1, fontSize: 15 },
  done: { textDecorationLine: 'line-through' },
  miniAction: { width: 28, height: 40, alignItems: 'center', justifyContent: 'center' },
  dragHandle: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  completedHeader: { minHeight: 48, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  completedTitle: { fontSize: 13, fontFamily: fontFamily.extrabold },
  toolbar: { minHeight: 58, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tool: { minWidth: 92, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  toolText: { fontSize: 12, fontFamily: fontFamily.bold },
  delete: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  linkModalLayer: { flex: 1, justifyContent: 'center', padding: 24 },
  linkBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,20,22,.54)' },
  linkDialog: { maxHeight: '72%', borderRadius: 22, borderWidth: 1, padding: 18 },
  linkTitle: { fontSize: 19, fontFamily: fontFamily.extrabold },
  linkCopy: { marginTop: 3, fontSize: 12, lineHeight: 17 },
  linkList: { marginTop: 12, maxHeight: 330 },
  linkRow: { minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  linkRowCopy: { flex: 1 },
  linkRowTitle: { fontSize: 14, fontFamily: fontFamily.extrabold },
  linkRowMeta: { marginTop: 2, fontSize: 11 },
  linkEmpty: { paddingVertical: 28, textAlign: 'center', fontSize: 13 },
  linkCancel: { minHeight: 46, marginTop: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  linkCancelText: { fontSize: 14, fontFamily: fontFamily.extrabold },
});
