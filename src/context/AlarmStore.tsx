import React, { createContext, useContext, useState, useEffect } from 'react';
import { Storage, KEYS } from '../services/StorageService';
import {
  scheduleAlarmNotification,
  cancelNotification,
} from '../services/NotificationService';

// ─── Types ──────────────────────────────────────────────────────────────────
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
}

const SEED_ALARMS: Alarm[] = [
  {
    id: '1', hour: 7, minute: 0, period: 'AM', label: 'Morning Workout',
    sound: 'Alarm', days: [false, true, true, true, true, true, false],
    snooze: 5, skipHolidays: false, vibrate: true, active: true,
  },
  {
    id: '2', hour: 8, minute: 30, period: 'AM', label: 'Weekend Wakeup',
    sound: 'Early Riser', days: [true, false, false, false, false, false, true],
    snooze: 10, skipHolidays: false, vibrate: false, active: false,
  },
  {
    id: '3', hour: 10, minute: 15, period: 'PM', label: 'Prep for Bed',
    sound: 'Default alarm sound', days: [true, true, true, true, true, true, true],
    snooze: 5, skipHolidays: false, vibrate: true, active: true,
  },
];

// ─── Context type ────────────────────────────────────────────────────────────
interface AlarmContextType {
  alarms: Alarm[];
  isLoading: boolean;
  addAlarm: (alarm: Alarm) => void;
  updateAlarm: (alarm: Alarm) => void;
  removeAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
}

const AlarmContext = createContext<AlarmContextType>({
  alarms: [],
  isLoading: true,
  addAlarm: () => {},
  updateAlarm: () => {},
  removeAlarm: () => {},
  toggleAlarm: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────
export const AlarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await Storage.get<Alarm[]>(KEYS.ALARMS);
      setAlarms(stored ?? SEED_ALARMS);
      setIsLoading(false);
    })();
  }, []);

  const persist = (updated: Alarm[]) => {
    setAlarms(updated);
    Storage.set(KEYS.ALARMS, updated);
  };

  const addAlarm = (alarm: Alarm) => {
    const updated = [...alarms, alarm];
    persist(updated);
    if (alarm.active) {
      scheduleAlarmNotification(alarm.id, alarm.label, alarm.hour, alarm.minute, alarm.period);
    }
  };

  const updateAlarm = (alarm: Alarm) => {
    const updated = alarms.map(a => a.id === alarm.id ? alarm : a);
    persist(updated);
    // Reschedule notification
    cancelNotification(`alarm_${alarm.id}`);
    if (alarm.active) {
      scheduleAlarmNotification(alarm.id, alarm.label, alarm.hour, alarm.minute, alarm.period);
    }
  };

  const removeAlarm = (id: string) => {
    persist(alarms.filter(a => a.id !== id));
    cancelNotification(`alarm_${id}`);
  };

  const toggleAlarm = (id: string) => {
    const updated = alarms.map(a => {
      if (a.id !== id) return a;
      const toggled = { ...a, active: !a.active };
      if (toggled.active) {
        scheduleAlarmNotification(toggled.id, toggled.label, toggled.hour, toggled.minute, toggled.period);
      } else {
        cancelNotification(`alarm_${id}`);
      }
      return toggled;
    });
    persist(updated);
  };

  return (
    <AlarmContext.Provider value={{ alarms, isLoading, addAlarm, updateAlarm, removeAlarm, toggleAlarm }}>
      {children}
    </AlarmContext.Provider>
  );
};

export const useAlarmStore = () => useContext(AlarmContext);
