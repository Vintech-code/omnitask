import { buildCanvasReferenceItems, resolveCanvasReference } from '@/utils/canvasReferences';
import type { AppEvent } from '@/types/event';
import type { CanvasObject, Note } from '@/types/note';

const note: Note = {
  id: 'note-1', title: 'Launch plan', body: 'Review the release checklist', date: 'Today', timestamp: 10,
  category: 'Work', cardColor: '#fff', tags: [], todos: [{ id: 'task-1', text: 'Ship update', done: false }],
};
const event: AppEvent = {
  id: 'event-1', title: 'Demo', description: '', startDate: '2026-07-23', startTime: '09:00', endTime: '10:00', location: '', category: 'Work', priority: 'High', reminders: [], alarmActive: false, recurrence: 'none',
};

describe('Canvas live references', () => {
  it('builds task, event, and note items from the live stores', () => {
    const items = buildCanvasReferenceItems([note], [event]);
    expect(items.map(item => item.kind)).toEqual(['task', 'event', 'note']);
    expect(items[0]).toMatchObject({ id: 'task-1', parentId: 'note-1', title: 'Ship update', completed: false });
  });

  it('resolves a stored reference without copying stale source data', () => {
    const object: CanvasObject = { id: 'ref', type: 'reference', reference: { kind: 'task', id: 'task-1', parentId: 'note-1' }, position: { x: 0, y: 0 }, size: { width: 200, height: 100 }, rotation: 0, style: { color: '#000' }, layer: 1 };
    expect(resolveCanvasReference(object, buildCanvasReferenceItems([note], [event]))?.title).toBe('Ship update');
    expect(resolveCanvasReference(object, buildCanvasReferenceItems([{ ...note, todos: [{ id: 'task-1', text: 'Ship safely', done: true }] }], [event]))).toMatchObject({ title: 'Ship safely', completed: true });
  });
});
