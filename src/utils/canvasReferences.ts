import type { AppEvent } from '@/types/event';
import type { CanvasObject, CanvasReferenceKind, Note } from '@/types/note';
import type { Task } from '@/types/task';

export interface CanvasReferenceItem {
  key: string;
  kind: CanvasReferenceKind;
  id: string;
  parentId?: string;
  title: string;
  subtitle: string;
  completed?: boolean;
  taskId?: string;
  legacy?: boolean;
}

export function buildCanvasReferenceItems(tasks: Task[], notes: Note[], events: AppEvent[]): CanvasReferenceItem[] {
  const taskItems = tasks.map(task => ({
    key: `task:${task.id}`,
    kind: 'task' as const,
    id: task.id,
    taskId: task.id,
    title: task.title.trim() || 'Untitled task',
    subtitle: task.projectId || (task.noteId ? 'Linked checklist task' : 'Task'),
    completed: task.status === 'completed',
  })).sort((left, right) => Number(left.completed) - Number(right.completed) || left.title.localeCompare(right.title));
  // Keep legacy checklist reference identities resolvable for canvases created
  // before checklist items became real Task documents. These aliases are not
  // shown in the insertion picker.
  const legacyTaskItems = notes.flatMap(note => (note.todos ?? []).map(todo => {
    const task = tasks.find(value => value.id === todo.linkedTaskId)
      ?? tasks.find(value => value.noteId === note.id && value.checklistItemId === todo.id);
    return {
      key: `legacy-task:${note.id}:${todo.id}`,
      kind: 'task' as const,
      id: todo.id,
      parentId: note.id,
      taskId: task?.id,
      title: task?.title ?? (todo.text.trim() || 'Untitled task'),
      subtitle: task?.projectId || note.title.trim() || note.category || 'Checklist',
      completed: task ? task.status === 'completed' : todo.done,
      legacy: true,
    };
  }));
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
  return [...taskItems, ...legacyTaskItems, ...eventItems, ...noteItems];
}

export function resolveCanvasReference(object: CanvasObject, items: CanvasReferenceItem[]): CanvasReferenceItem | null {
  const reference = object.reference;
  if (object.type !== 'reference' || !reference) return null;
  return items.find(item => item.kind === reference.kind && item.id === reference.id && item.parentId === reference.parentId) ?? null;
}
