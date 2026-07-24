import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { AppAlert as Alert } from '@/components/ui/AppDialog';
import { FirebaseError } from 'firebase/app';
import { useAuth } from './AuthContext';
import { Storage, KEYS } from '../services/StorageService';
import {
  flushCloudMutations,
  getPendingMutationPaths,
  recordCloudSnapshot,
  reportSyncDiagnostic,
  syncRevision,
  withoutSyncMetadata,
} from '../services/OfflineSyncService';
import {
  cancelAlarmNotifications,
  openExactAlarmSettings,
  reconcileAlarmNotifications,
  scheduleAlarmNotifications,
} from '../services/NotificationService';
import { createUserCollectionRepository } from '@/repositories';
import { migrateVersionedRecords } from '@/services/SchemaMigrationService';

export type Period = 'AM' | 'PM';
export const ALARM_SCHEMA_VERSION = 1;

export interface Alarm {
  id: string;
  hour: number;
  minute: number;
  period: Period;
  label: string;
  sound: string;
  days: boolean[];
  snooze: number;
  skipHolidays: boolean;
  vibrate: boolean;
  active: boolean;
  scheduledFor?: number;
  updatedAt?: number;
  version?: number;
}

interface AlarmContextType {
  alarms: Alarm[];
  isLoading: boolean;
  addAlarm: (alarm: Alarm) => Promise<void>;
  updateAlarm: (alarm: Alarm) => Promise<void>;
  removeAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string) => Promise<void>;
}

const AlarmContext = createContext<AlarmContextType>({
  alarms: [],
  isLoading: true,
  addAlarm: async () => {},
  updateAlarm: async () => {},
  removeAlarm: async () => {},
  toggleAlarm: async () => {},
});

const alarmRepository = createUserCollectionRepository<Alarm>('alarms');

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to schedule this alarm.';
}

function isFirestorePermissionError(error: unknown) {
  return error instanceof FirebaseError && error.code === 'permission-denied'
    || error instanceof Error && /missing or insufficient permissions/i.test(error.message);
}

function deactivateExpiredOneTimeAlarms(alarms: Alarm[]) {
  const now = Date.now();
  let changed = false;
  const normalized = alarms.map(alarm => {
    const oneTime = !alarm.days.some(Boolean);
    if (alarm.active && oneTime && alarm.scheduledFor && alarm.scheduledFor <= now) {
      changed = true;
      return { ...alarm, active: false };
    }
    return alarm;
  });
  return { normalized, changed };
}

const migrateAlarms = (alarms: Alarm[]) => migrateVersionedRecords(
  alarms,
  ALARM_SCHEMA_VERSION,
  alarm => ({
    ...alarm,
    days: Array.isArray(alarm.days) && alarm.days.length === 7
      ? alarm.days
      : Array.from({ length: 7 }, (_, index) => Boolean(alarm.days?.[index])),
    snooze: Math.max(0, alarm.snooze ?? 5),
    vibrate: alarm.vibrate ?? true,
    active: alarm.active ?? false,
  }),
);

export const AlarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const authenticatedUid = user?.id ?? null;
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const alarmsRef = useRef<Alarm[]>([]);
  const uidRef = useRef<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const hydratedRef = useRef(false);
  const cloudSyncBlockedRef = useRef(false);

  const handleCloudError = (context: string, error: unknown) => {
    if (isFirestorePermissionError(error)) {
      cloudSyncBlockedRef.current = true;
      unsubRef.current?.();
      unsubRef.current = null;
      return;
    }
    console.warn(context, errorMessage(error));
  };

  const persist = (updated: Alarm[]) => {
    alarmsRef.current = updated;
    setAlarms(updated);
    if (uidRef.current) void Storage.setForUser(KEYS.ALARMS, uidRef.current, updated);
  };

  const maybeOfferExactAlarmAccess = async () => {
    if (Platform.OS !== 'android' || Platform.Version < 31) return;
    const prompted = await Storage.get<boolean>(KEYS.EXACT_ALARM_PROMPTED);
    if (prompted) return;
    await Storage.set(KEYS.EXACT_ALARM_PROMPTED, true);

    Alert.alert(
      'Allow precise alarms',
      'Android requires Alarms & reminders access to deliver alarms at the exact minute, including while the phone is idle.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Open settings',
          onPress: () => {
            openExactAlarmSettings()
              .then(() => reconcileAlarmNotifications(alarmsRef.current))
              .catch(error => Alert.alert('Settings unavailable', errorMessage(error)));
          },
        },
      ],
    );
  };

  useEffect(() => {
    let disposed = false;

    const startSession = async () => {
      unsubRef.current?.();
      unsubRef.current = null;
      if (authLoading) return;
      if (!authenticatedUid) {
        uidRef.current = null;
        cloudSyncBlockedRef.current = false;
        alarmsRef.current = [];
        setAlarms([]);
        setIsLoading(false);
        return;
      }
      const uid = authenticatedUid;
      uidRef.current = uid;
      cloudSyncBlockedRef.current = false;
      setIsLoading(true);
      const stored = await Storage.getForUser<Alarm[]>(KEYS.ALARMS, uid) ?? [];
      if (disposed || uidRef.current !== uid) return;
      const localMigration = migrateAlarms(stored);
      const { normalized: hydrated } = deactivateExpiredOneTimeAlarms(localMigration.records);
      persist(hydrated);
      localMigration.changedIds.forEach(id => {
        const alarm = hydrated.find(item => item.id === id);
        if (alarm) void alarmRepository.set(uid, id, alarm);
      });
      hydratedRef.current = true;
      setIsLoading(false);
      if (hydrated.some(alarm => alarm.active)) {
        void reconcileAlarmNotifications(hydrated).catch(error =>
          console.warn('Alarm reconciliation failed:', errorMessage(error))
        );
      }
      void flushCloudMutations(uid);
      unsubRef.current = alarmRepository.subscribe(
        uid,
        async documents => {
          if (uidRef.current !== uid) return;
          const pendingPaths = await getPendingMutationPaths(uid);
          await Promise.all(documents.map(document =>
            recordCloudSnapshot(
              uid,
              alarmRepository.path(uid, document.id),
              document.raw,
            )
          ));
          const fetchedRaw = documents
            .map(document => withoutSyncMetadata<Alarm>(document.data))
            .filter(alarm => !pendingPaths.has(`users/${uid}/alarms/${alarm.id}`));
          const merged = new Map(fetchedRaw.map(alarm => [alarm.id, alarm]));
          for (const local of alarmsRef.current) {
            const remote = merged.get(local.id);
            const path = `users/${uid}/alarms/${local.id}`;
            const rawRemote = documents.find(document => document.id === local.id)?.raw;
            const keepLocal = pendingPaths.has(path)
              || !remote
              || syncRevision(rawRemote) === 0
                && (local.updatedAt ?? 0) > (remote.updatedAt ?? 0);
            if (keepLocal) {
              merged.set(local.id, local);
              if (!pendingPaths.has(path)) {
                void alarmRepository.set(uid, local.id, local);
              }
            }
          }
          const migration = migrateAlarms([...merged.values()]);
          const { normalized: fetched } = deactivateExpiredOneTimeAlarms(migration.records);
          persist(fetched);
          migration.changedIds.forEach(id => {
            const alarm = fetched.find(item => item.id === id);
            if (alarm) void alarmRepository.set(uid, id, alarm);
          });
          void reconcileAlarmNotifications(fetched).catch(error =>
            console.warn('Cloud alarm reconciliation failed:', errorMessage(error))
          );
        },
        error => {
          handleCloudError('Alarm sync failed:', error);
          void reportSyncDiagnostic(uid, {
            path: `users/${uid}/alarms`,
            severity: 'error',
            code: 'firestore/alarms-listen-failed',
            message: error.message || 'Alarms could not refresh from the cloud.',
          });
        },
      );
    };
    void startSession();

    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state !== 'active' || !hydratedRef.current) return;
      const { normalized, changed } = deactivateExpiredOneTimeAlarms(alarmsRef.current);
      if (changed) persist(normalized);
      if (uidRef.current) void flushCloudMutations(uidRef.current);
      const active = normalized.filter(alarm => alarm.active);
      if (active.length === 0) return;
      reconcileAlarmNotifications(normalized).catch(error =>
        console.warn('Foreground alarm reconciliation failed:', errorMessage(error))
      );
    });

    return () => {
      disposed = true;
      unsubRef.current?.();
      appStateSubscription.remove();
    };
  }, [authenticatedUid, authLoading]);

  const addAlarm = async (alarm: Alarm) => {
    const saved = { ...alarm, updatedAt: Date.now(), version: ALARM_SCHEMA_VERSION };
    if (saved.active) await scheduleAlarmNotifications(saved);
    const updated = [...alarmsRef.current, saved];
    persist(updated);
    if (uidRef.current) {
      void alarmRepository.set(uidRef.current, saved.id, saved);
    }
    if (saved.active) void maybeOfferExactAlarmAccess();
  };

  const updateAlarm = async (alarm: Alarm) => {
    const saved = { ...alarm, updatedAt: Date.now(), version: ALARM_SCHEMA_VERSION };
    const previous = alarmsRef.current.find(item => item.id === alarm.id);
    try {
      if (saved.active) await scheduleAlarmNotifications(saved);
      else await cancelAlarmNotifications(saved.id);
    } catch (error) {
      if (previous?.active) {
        scheduleAlarmNotifications(previous).catch(restoreError =>
          console.warn('Unable to restore previous alarm:', errorMessage(restoreError))
        );
      }
      throw error;
    }

    const updated = alarmsRef.current.map(item => item.id === saved.id ? saved : item);
    persist(updated);
    if (uidRef.current) {
      void alarmRepository.set(uidRef.current, saved.id, saved);
    }
    if (saved.active) void maybeOfferExactAlarmAccess();
  };

  const removeAlarm = async (id: string) => {
    await cancelAlarmNotifications(id);
    persist(alarmsRef.current.filter(alarm => alarm.id !== id));
    if (uidRef.current) {
      void alarmRepository.remove(uidRef.current, id);
    }
  };

  const toggleAlarm = async (id: string) => {
    const current = alarmsRef.current.find(alarm => alarm.id === id);
    if (!current) return;
    const toggled = { ...current, active: !current.active, updatedAt: Date.now(), version: ALARM_SCHEMA_VERSION };
    if (toggled.active) await scheduleAlarmNotifications(toggled);
    else await cancelAlarmNotifications(id);

    const updated = alarmsRef.current.map(alarm => alarm.id === id ? toggled : alarm);
    persist(updated);
    if (uidRef.current) {
      void alarmRepository.set(uidRef.current, id, toggled);
    }
    if (toggled.active) void maybeOfferExactAlarmAccess();
  };

  return (
    <AlarmContext.Provider value={{ alarms, isLoading, addAlarm, updateAlarm, removeAlarm, toggleAlarm }}>
      {children}
    </AlarmContext.Provider>
  );
};

export const useAlarmStore = () => useContext(AlarmContext);
