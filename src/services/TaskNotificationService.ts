import * as Notifications from 'expo-notifications';

import { requestNotificationPermission } from '@/services/NotificationService';
import type { Task } from '@/types/task';

interface TaskNotificationDependencies {
  getAllScheduled: typeof Notifications.getAllScheduledNotificationsAsync;
  cancelScheduled: typeof Notifications.cancelScheduledNotificationAsync;
  schedule: typeof Notifications.scheduleNotificationAsync;
  requestPermission: typeof requestNotificationPermission;
  now: () => Date;
}

const dependencies: TaskNotificationDependencies = {
  getAllScheduled: Notifications.getAllScheduledNotificationsAsync,
  cancelScheduled: Notifications.cancelScheduledNotificationAsync,
  schedule: Notifications.scheduleNotificationAsync,
  requestPermission: requestNotificationPermission,
  now: () => new Date(),
};

const prefixFor = (taskId: string) => `task_${taskId}`;

async function cancelWith(taskId: string, source: TaskNotificationDependencies): Promise<void> {
  const prefix = prefixFor(taskId);
  const scheduled = await source.getAllScheduled();
  await Promise.all(scheduled
    .filter(request => request.identifier === prefix || request.identifier.startsWith(`${prefix}_`))
    .map(request => source.cancelScheduled(request.identifier)));
}

export async function cancelTaskNotifications(taskId: string): Promise<void> {
  await cancelWith(taskId, dependencies);
}

export function buildTaskNotificationRequests(task: Task, now = new Date()): Notifications.NotificationRequestInput[] {
  if (task.status === 'completed' || !task.dueAt || task.reminderMinutes.length === 0) return [];
  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) return [];

  return [...new Set(task.reminderMinutes)].flatMap(minutesBefore => {
    const triggerDate = new Date(due.getTime() - Math.max(0, minutesBefore) * 60_000);
    if (task.recurrence.frequency === 'none' && triggerDate.getTime() <= now.getTime()) return [];
    const identifier = `${prefixFor(task.id)}_${minutesBefore}`;
    const content: Notifications.NotificationContentInput = {
      title: `Task due: ${task.title}`,
      body: minutesBefore === 0
        ? 'This task is due now.'
        : minutesBefore < 60
          ? `Due in ${minutesBefore} minutes.`
          : `Due in ${minutesBefore / 60} hour${minutesBefore === 60 ? '' : 's'}.`,
      sound: true,
      data: { type: 'task', taskId: task.id },
    };

    let trigger: Notifications.NotificationTriggerInput;
    if (task.recurrence.frequency === 'daily') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        repeats: true,
      };
    } else if (task.recurrence.frequency === 'weekly') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        weekday: triggerDate.getDay() + 1,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        repeats: true,
      };
    } else if (task.recurrence.frequency === 'monthly') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: triggerDate.getDate(),
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        repeats: true,
      };
    } else {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      };
    }

    return [{ identifier, content, trigger }];
  });
}

export async function scheduleTaskNotifications(
  task: Task,
  overrides: Partial<TaskNotificationDependencies> = {},
): Promise<string[]> {
  const source = { ...dependencies, ...overrides };
  await cancelWith(task.id, source);
  const requests = buildTaskNotificationRequests(task, source.now());
  if (requests.length === 0) return [];
  if (!await source.requestPermission()) {
    throw new Error('Task saved, but notification permission is required for its reminder.');
  }

  const identifiers: string[] = [];
  try {
    for (const request of requests) {
      await source.schedule(request);
      if (request.identifier) identifiers.push(request.identifier);
    }
    return identifiers;
  } catch (error) {
    await cancelWith(task.id, source);
    throw error;
  }
}

