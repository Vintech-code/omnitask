import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  EVENTS:           'omnitask_events',
  TASKS:            'omnitask_tasks',
  TASK_CATEGORIES:  'omnitask_task_categories',
  ALARMS:           'omnitask_alarms',
  THEME:            'omnitask_theme',
  SYSTEM_THEME:     'omnitask_system_theme',
  USER:             'omnitask_user',
  PROFILE_PHOTO:    'omnitask_profile_photo',
  ONBOARDING_DONE:  'omnitask_onboarding_done',
  SESSIONS:         'omnitask_sessions',
  FOCUS_STATS:      'omnitask_focus_stats',
  LINKED_NOTE:      'omnitask_linked_note',
};

export const Storage = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },

  remove: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};
