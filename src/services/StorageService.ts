import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  EVENTS:           'omnitask_events',
  EVENT_CATEGORIES: 'omnitask_event_categories',
  EVENT_WEATHER_WARNINGS: 'omnitask_event_weather_warnings',
  WEATHER_CACHE:     'omnitask_weather_cache_v1',
  WEATHER_LOCATION:  'omnitask_weather_location_v1',
  TASKS:            'omnitask_tasks',
  TASK_CATEGORIES:  'omnitask_task_categories',
  CANVAS_NOTES:     'omnitask_canvas_notes',
  ALARMS:           'omnitask_alarms',
  EXACT_ALARM_PROMPTED: 'omnitask_exact_alarm_prompted',
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

  userKey: (key: string, uid: string): string => `${key}:${uid}`,

  getForUser: async <T>(key: string, uid: string): Promise<T | null> => {
    return Storage.get<T>(Storage.userKey(key, uid));
  },

  setForUser: async <T>(key: string, uid: string, value: T): Promise<void> => {
    await Storage.set(Storage.userKey(key, uid), value);
  },

  removeForUser: async (key: string, uid: string): Promise<void> => {
    await Storage.remove(Storage.userKey(key, uid));
  },
};
