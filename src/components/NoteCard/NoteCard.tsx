import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { Note } from '../../types/note';
import { BRAND_BLUE } from '../../theme/colors';
import { styles } from './styles';

interface Props {
  note: Note;
  onPress:  (note: Note) => void;
  onDelete: (id: string) => void;
}

export function NoteCard({ note, onPress, onDelete }: Props) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.noteCard, { backgroundColor: note.cardColor }]}
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
      activeOpacity={0.85}
    >
      {note.title.length > 0 && (
        <Text style={[styles.noteCardTitle, { color: theme.text }]} numberOfLines={2}>
          {note.title}
        </Text>
      )}

      {note.body.length > 0 && (
        <Text style={[styles.noteCardBody, { color: theme.textSub }]} numberOfLines={5}>
          {note.body}
        </Text>
      )}

      {note.tags && note.tags.length > 0 && (
        <View style={[styles.noteCardTagsRow, { flexDirection: 'row', flexWrap: 'wrap' }]}>
          {note.tags.map((tag, i) => (
            <View
              key={i}
              style={[styles.noteCardTag, { borderColor: tag.color, backgroundColor: `${tag.color}22` }]}
            >
              <Text style={[styles.noteCardTagText, { color: tag.color }]}>{tag.label}</Text>
            </View>
          ))}
        </View>
      )}

      {note.todos && note.todos.length > 0 && (
        <View style={styles.noteCardTodoBadge}>
          <MaterialCommunityIcons
            name="checkbox-marked-outline"
            size={12}
            color={BRAND_BLUE}
          />
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
}
