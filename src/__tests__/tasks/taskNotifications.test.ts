import {
  buildTaskNotificationRequests,
  scheduleTaskNotifications,
} from '@/services/TaskNotificationService';
import type { Task } from '@/types/task';

const dueAt = new Date('2026-07-25T17:00:00').getTime();
const task: Task = {
  id: 'task-1',
  title: 'Submit report',
  status: 'planned',
  priority: 'high',
  dueAt,
  recurrence: { frequency: 'none', interval: 1 },
  reminderMinutes: [60, 15],
  reminderIds: [],
  createdAt: 1,
  updatedAt: 1,
  version: 1,
};

describe('Task notifications', () => {
  it('builds stable reminder identifiers with task deep-link data', () => {
    const requests = buildTaskNotificationRequests(task, new Date('2026-07-24T10:00:00'));

    expect(requests.map(request => request.identifier)).toEqual(['task_task-1_60', 'task_task-1_15']);
    expect(requests[0].content.data).toEqual({ type: 'task', taskId: 'task-1' });
  });

  it('cancels old reminders before scheduling replacements', async () => {
    const cancelScheduled = jest.fn(async () => undefined);
    const schedule = jest.fn(async request => request.identifier ?? 'generated');
    const identifiers = await scheduleTaskNotifications(task, {
      getAllScheduled: jest.fn(async () => [
        { identifier: 'task_task-1_old' },
        { identifier: 'another-notification' },
      ] as never),
      cancelScheduled,
      schedule,
      requestPermission: jest.fn(async () => true),
      now: () => new Date('2026-07-24T10:00:00'),
    });

    expect(cancelScheduled).toHaveBeenCalledWith('task_task-1_old');
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(identifiers).toEqual(['task_task-1_60', 'task_task-1_15']);
  });

  it('does not schedule reminders for completed Tasks', () => {
    expect(buildTaskNotificationRequests({ ...task, status: 'completed' })).toEqual([]);
  });
});
