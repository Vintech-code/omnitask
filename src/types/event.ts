/** Shared Event domain types — single source of truth. */

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  startDate: string;
  endTime: string;
  location: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  reminders: string[];
  alarmActive: boolean;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
}
