import type { AppEvent } from '@/types/event';
import type { CanvasObject, CanvasReferenceKind, Note } from '@/types/note';

export interface CanvasReferenceItem {
  key: string;
  kind: CanvasReferenceKind;
  id: string;
  parentId?: string;
  title: string;
  subtitle: string;
  completed?: boolean;
}

export function buildCanvasReferenceItems(notes: Note[], events: AppEvent[]): CanvasReferenceItem[] {
  const tasks = notes.flatMap(note => (note.todos ?? []).map(todo => ({
    key: `task:${note.id}:${todo.id}`,
    kind: 'task' as const,
    id: todo.id,
    parentId: note.id,
    title: todo.text.trim() || 'Untitled task',
    subtitle: note.title.trim() || note.category || 'Checklist',
    completed: todo.done,
  }))).sort((left, right) => Number(left.completed) - Number(right.completed) || left.title.localeCompare(right.title));
  const noteItems = notes.map(note => ({
    key: `note:${note.id}`,
    kind: 'note' as const,
    id: note.id,
    title: note.title.trim() || 'Untitled note',
    subtitle: note.body.trim().replace(/\s+/g, ' ').slice(0, 80) || note.category || 'Note',
  })).sort((left, right) => left.title.localeCompare(right.title));
  const eventItems = events.map(event => ({
    key: `event:${event.id}`,
    kind: 'event' as const,
    id: event.id,
    title: event.title.trim() || 'Untitled event',
    subtitle: `${event.startDate}${event.allDay ? ' · All day' : ` · ${event.startTime}`}`,
  })).sort((left, right) => left.subtitle.localeCompare(right.subtitle));
  return [...tasks, ...eventItems, ...noteItems];
}

export function resolveCanvasReference(object: CanvasObject, items: CanvasReferenceItem[]): CanvasReferenceItem | null {
  const reference = object.reference;
  if (object.type !== 'reference' || !reference) return null;
  return items.find(item => item.kind === reference.kind && item.id === reference.id && item.parentId === reference.parentId) ?? null;
}
