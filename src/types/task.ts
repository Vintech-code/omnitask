export const TASK_SCHEMA_VERSION = 1;

export type TaskStatus = 'inbox' | 'planned' | 'in-progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskRecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

export interface TaskRecurrenceRule {
  frequency: TaskRecurrenceFrequency;
  interval: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: number;
  scheduledStart?: number;
  estimateMinutes?: number;
  actualFocusMinutes?: number;
  recurrence: TaskRecurrenceRule;
  reminderMinutes: number[];
  reminderIds: string[];
  projectId?: string;
  noteId?: string;
  checklistItemId?: string;
  eventId?: string;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'reminderIds'> & {
  id?: string;
};

export function isTaskComplete(task: Task): boolean {
  return task.status === 'completed';
}

export function nextTaskDueAt(task: Task): number | undefined {
  if (!task.dueAt || task.recurrence.frequency === 'none') return undefined;
  const next = new Date(task.dueAt);
  const interval = Math.max(1, task.recurrence.interval);
  if (task.recurrence.frequency === 'daily') next.setDate(next.getDate() + interval);
  if (task.recurrence.frequency === 'weekly') next.setDate(next.getDate() + 7 * interval);
  if (task.recurrence.frequency === 'monthly') next.setMonth(next.getMonth() + interval);
  return next.getTime();
}

export function taskOccursOnDate(task: Task, date: Date): boolean {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [task.scheduledStart, task.dueAt].some(value => (
    typeof value === 'number' && value >= start.getTime() && value < end.getTime()
  ));
}
