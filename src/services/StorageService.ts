import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalStorageDiagnostic {
  id: string;
  operation: 'read' | 'write' | 'remove';
  key: string;
  message: string;
  createdAt: number;
}

type StorageDiagnosticListener = (diagnostic: LocalStorageDiagnostic) => void;
const diagnosticListeners = new Set<StorageDiagnosticListener>();
const storageDiagnostics: LocalStorageDiagnostic[] = [];

function reportStorageFailure(
  operation: LocalStorageDiagnostic['operation'],
  key: string,
  error: unknown,
) {
  const diagnostic: LocalStorageDiagnostic = {
    id: `storage_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    operation,
    key,
    message: error instanceof Error ? error.message : 'Local device storage is unavailable.',
    createdAt: Date.now(),
  };
  storageDiagnostics.unshift(diagnostic);
  storageDiagnostics.splice(30);
  diagnosticListeners.forEach(listener => listener(diagnostic));
}

export function subscribeStorageDiagnostics(listener: StorageDiagnosticListener): () => void {
  diagnosticListeners.add(listener);
  return () => diagnosticListeners.delete(listener);
}

export function currentStorageDiagnostics(): LocalStorageDiagnostic[] {
  return [...storageDiagnostics];
}

export const KEYS = {
  EVENTS:           'omnitask_events',
  EVENT_CATEGORIES: 'omnitask_event_categories',
  EVENT_WEATHER_WARNINGS: 'omnitask_event_weather_warnings',
  WEATHER_CACHE:     'omnitask_weather_cache_v1',
  WEATHER_LOCATION:  'omnitask_weather_location_v1',
  TASKS:            'omnitask_tasks',
  UNIFIED_TASKS:    'omnitask_unified_tasks_v1',
  TASK_MIGRATION_VERSION: 'omnitask_task_migration_version',
  TASK_CATEGORIES:  'omnitask_task_categories',
  CANVAS_NOTES:     'omnitask_canvas_notes',
  ALARMS:           'omnitask_alarms',
  EXACT_ALARM_PROMPTED: 'omnitask_exact_alarm_prompted',
  THEME:            'omnitask_theme',
  SYSTEM_THEME:     'omnitask_system_theme',
  USER:             'omnitask_user',
  PROFILE_PHOTO:    'omnitask_profile_photo',
  ATTACHMENTS:      'omnitask_attachments_v1',
  ATTACHMENT_MIGRATION_VERSION: 'omnitask_attachment_migration_version',
  ONBOARDING_DONE:  'omnitask_onboarding_done',
  SESSIONS:         'omnitask_sessions',
  FOCUS_STATS:      'omnitask_focus_stats',
  FOCUS_SESSIONS:   'omnitask_focus_sessions_v1',
  FOCUS_PREFERENCES: 'omnitask_focus_preferences_v1',
  FOCUS_LEGACY_SUMMARY: 'omnitask_focus_legacy_summary_v1',
  FOCUS_MIGRATION_VERSION: 'omnitask_focus_migration_version',
  LINKED_NOTE:      'omnitask_linked_note',
  LINKED_TASK:      'omnitask_linked_task',
};

export const Storage = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      reportStorageFailure('read', key, error);
      return null;
    }
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      reportStorageFailure('write', key, error);
    }
  },

  remove: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      reportStorageFailure('remove', key, error);
    }
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
