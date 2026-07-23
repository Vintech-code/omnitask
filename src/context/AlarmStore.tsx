import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { AppAlert as Alert } from '@/components/ui/AppDialog';
import {
  collection, onSnapshot, QuerySnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, db } from '../config/firebase';
import { Storage, KEYS } from '../services/StorageService';
import { flushCloudMutations, getPendingDeletePaths, queueCloudDelete, queueCloudSet } from '../services/OfflineSyncService';
import {
  cancelAlarmNotifications,
  openExactAlarmSettings,
  reconcileAlarmNotifications,
  scheduleAlarmNotifications,
} from '../services/NotificationService';

export type Period = 'AM' | 'PM';

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

const alarmsCol = (uid: string) => collection(db, 'users', uid, 'alarms');

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

export const AlarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

    const unsubAuth = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      unsubRef.current?.();
      unsubRef.current = null;
      if (!fbUser) {
        uidRef.current = null;
        cloudSyncBlockedRef.current = false;
        alarmsRef.current = [];
        setAlarms([]);
        setIsLoading(false);
        return;
      }
      uidRef.current = fbUser.uid;
      cloudSyncBlockedRef.current = false;
      const stored = await Storage.getForUser<Alarm[]>(KEYS.ALARMS, fbUser.uid) ?? [];
      if (disposed || uidRef.current !== fbUser.uid) return;
      const { normalized: hydrated } = deactivateExpiredOneTimeAlarms(stored);
      persist(hydrated);
      hydratedRef.current = true;
      setIsLoading(false);
      if (hydrated.some(alarm => alarm.active)) {
        void reconcileAlarmNotifications(hydrated).catch(error =>
          console.warn('Alarm reconciliation failed:', errorMessage(error))
        );
      }
      void flushCloudMutations(fbUser.uid);
      unsubRef.current = onSnapshot(
        alarmsCol(fbUser.uid),
        async (snap: QuerySnapshot) => {
          if (uidRef.current !== fbUser.uid) return;
          const pendingDeletes = await getPendingDeletePaths(fbUser.uid);
          const fetchedRaw = snap.docs
            .map(document => document.data() as Alarm)
            .filter(alarm => !pendingDeletes.has(`users/${fbUser.uid}/alarms/${alarm.id}`));
          const merged = new Map(fetchedRaw.map(alarm => [alarm.id, alarm]));
          for (const local of alarmsRef.current) {
            const remote = merged.get(local.id);
            if (!remote || (local.updatedAt ?? 0) > (remote.updatedAt ?? 0)) {
              merged.set(local.id, local);
              void queueCloudSet(fbUser.uid, ['users', fbUser.uid, 'alarms', local.id], local as unknown as Record<string, unknown>);
            }
          }
          const { normalized: fetched } = deactivateExpiredOneTimeAlarms([...merged.values()]);
          persist(fetched);
          void reconcileAlarmNotifications(fetched).catch(error =>
            console.warn('Cloud alarm reconciliation failed:', errorMessage(error))
          );
        },
        error => handleCloudError('Alarm sync failed:', error),
      );
    });

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
      unsubAuth();
      unsubRef.current?.();
      appStateSubscription.remove();
    };
  }, []);

  const addAlarm = async (alarm: Alarm) => {
    const saved = { ...alarm, updatedAt: Date.now() };
    if (saved.active) await scheduleAlarmNotifications(saved);
    const updated = [...alarmsRef.current, saved];
    persist(updated);
    if (uidRef.current) {
      void queueCloudSet(uidRef.current, ['users', uidRef.current, 'alarms', saved.id], saved as unknown as Record<string, unknown>);
    }
    if (saved.active) void maybeOfferExactAlarmAccess();
  };

  const updateAlarm = async (alarm: Alarm) => {
    const saved = { ...alarm, updatedAt: Date.now() };
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
      void queueCloudSet(uidRef.current, ['users', uidRef.current, 'alarms', saved.id], saved as unknown as Record<string, unknown>);
    }
    if (saved.active) void maybeOfferExactAlarmAccess();
  };

  const removeAlarm = async (id: string) => {
    await cancelAlarmNotifications(id);
    persist(alarmsRef.current.filter(alarm => alarm.id !== id));
    if (uidRef.current) {
      void queueCloudDelete(uidRef.current, ['users', uidRef.current, 'alarms', id]);
    }
  };

  const toggleAlarm = async (id: string) => {
    const current = alarmsRef.current.find(alarm => alarm.id === id);
    if (!current) return;
    const toggled = { ...current, active: !current.active, updatedAt: Date.now() };
    if (toggled.active) await scheduleAlarmNotifications(toggled);
    else await cancelAlarmNotifications(id);

    const updated = alarmsRef.current.map(alarm => alarm.id === id ? toggled : alarm);
    persist(updated);
    if (uidRef.current) {
      void queueCloudSet(uidRef.current, ['users', uidRef.current, 'alarms', id], toggled as unknown as Record<string, unknown>);
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
