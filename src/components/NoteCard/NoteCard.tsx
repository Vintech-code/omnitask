import React from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { Note } from '../../types/note';
import { styles } from './styles';

interface Props {
  note: Note;
  onPress:  (note: Note) => void;
  onDelete: (id: string) => void;
  isLast?: boolean;
}

export function NoteCard({ note, onPress, onDelete, isLast = false }: Props) {
  const { theme } = useTheme();
  const completed = note.todos?.filter(item => item.done).length ?? 0;
  const checklistTotal = note.todos?.length ?? 0;
  const title = note.title.trim() || 'Untitled note';

  return (
    <TouchableOpacity
      style={[
        styles.noteCard,
        !isLast && { borderBottomColor: theme.divider, borderBottomWidth: 1 },
      ]}
      onPress={() => onPress(note)}
      onLongPress={() => {
        if (!note.id.startsWith('ev-')) {
          Alert.alert(note.title, undefined, [
            { text: 'Edit',   onPress: () => onPress(note) },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(note.id) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }
      }}
      delayLongPress={500}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
    >
      <View style={[styles.noteIcon, { backgroundColor: note.cardColor }]}>
        <Ionicons
          name={checklistTotal > 0 ? 'checkbox-outline' : 'document-text-outline'}
          size={20}
          color="#4A4A46"
        />
      </View>

      <View style={styles.noteContent}>
        <View style={styles.titleRow}>
          <Text style={[styles.noteCardTitle, { color: theme.text }]} numberOfLines={1}>{title}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </View>
        {note.body.length > 0 ? (
          <Text style={[styles.noteCardBody, { color: theme.textSub }]} numberOfLines={2}>{note.body}</Text>
        ) : checklistTotal === 0 ? (
          <Text style={[styles.noteCardBody, { color: theme.textDim }]} numberOfLines={1}>Empty note</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={[styles.noteCardDate, { color: theme.textDim }]} numberOfLines={1}>
            {note.category} · {note.date}
          </Text>
          {checklistTotal > 0 ? (
            <View style={[styles.checklistMeta, { backgroundColor: theme.accent.soft }]}>
              <MaterialCommunityIcons name="check-circle-outline" size={12} color={theme.accent.base} />
              <Text style={[styles.checklistText, { color: theme.accent.base }]}>{completed}/{checklistTotal}</Text>
            </View>
          ) : null}
        </View>

        {note.tags && note.tags.length > 0 ? (
          <View style={styles.noteCardTagsRow}>
            {note.tags.slice(0, 2).map((tag, index) => (
              <View key={`${tag.label}-${index}`} style={[styles.noteCardTag, { backgroundColor: `${tag.color}20` }]}>
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <Text style={[styles.noteCardTagText, { color: theme.textSub }]}>{tag.label}</Text>
              </View>
            ))}
            {note.tags.length > 2 ? <Text style={[styles.moreTagsText, { color: theme.textDim }]}>+{note.tags.length - 2}</Text> : null}
          </View>
        ) : null}
      </View>

      {note.images && note.images.length > 0 ? (
        <Image source={{ uri: note.images[0] }} style={styles.noteCardImage} resizeMode="cover" />
      ) : null}
    </TouchableOpacity>
  );
}
