import { buildCanvasReferenceItems, resolveCanvasReference } from '@/utils/canvasReferences';
import type { AppEvent } from '@/types/event';
import type { CanvasObject, Note } from '@/types/note';
import type { Task } from '@/types/task';

const note: Note = {
  id: 'note-1', title: 'Launch plan', body: 'Review the release checklist', date: 'Today', timestamp: 10,
  category: 'Work', cardColor: '#fff', tags: [], todos: [{ id: 'task-1', text: 'Ship update', done: false }],
};
const event: AppEvent = {
  id: 'event-1', title: 'Demo', description: '', startDate: '2026-07-23', startTime: '09:00', endTime: '10:00', location: '', category: 'Work', priority: 'High', reminders: [], alarmActive: false, recurrence: 'none',
};
const task: Task = {
  id: 'real-task-1', title: 'Ship update', status: 'inbox', priority: 'high',
  recurrence: { frequency: 'none', interval: 1 }, reminderMinutes: [], reminderIds: [],
  noteId: 'note-1', checklistItemId: 'task-1', createdAt: 1, updatedAt: 10, version: 1,
};

describe('Canvas live references', () => {
  it('builds task, event, and note items from the live stores', () => {
    const items = buildCanvasReferenceItems([task], [note], [event]);
    expect(items.filter(item => !item.legacy).map(item => item.kind)).toEqual(['task', 'event', 'note']);
    expect(items[0]).toMatchObject({ id: 'real-task-1', taskId: 'real-task-1', title: 'Ship update', completed: false });
  });

  it('keeps legacy checklist references live without duplicating them in the picker', () => {
    const object: CanvasObject = { id: 'ref', type: 'reference', reference: { kind: 'task', id: 'task-1', parentId: 'note-1' }, position: { x: 0, y: 0 }, size: { width: 200, height: 100 }, rotation: 0, style: { color: '#000' }, layer: 1 };
    expect(resolveCanvasReference(object, buildCanvasReferenceItems([task], [note], [event]))).toMatchObject({
      title: 'Ship update',
      taskId: 'real-task-1',
      legacy: true,
    });
    expect(resolveCanvasReference(object, buildCanvasReferenceItems([{ ...task, title: 'Ship safely', status: 'completed' }], [note], [event]))).toMatchObject({ title: 'Ship safely', completed: true });
  });
});
