import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import { auth, db } from '../config/firebase';
import { KEYS, Storage } from '../services/StorageService';
import { getPendingDeletePaths, queueCloudDelete, queueCloudSet } from '../services/OfflineSyncService';
import { cancelNotification, scheduleEventNotification } from '../services/NotificationService';
import type { AppEvent } from '@/types/event';

export type { AppEvent };

interface EventContextType {
  events: AppEvent[];
  isLoading: boolean;
  addEvent: (event: AppEvent) => void;
  updateEvent: (event: AppEvent) => void;
  removeEvent: (id: string) => void;
  toggleAlarmActive: (id: string) => void;
}

const EventContext = createContext<EventContextType>({
  events: [], isLoading: true,
  addEvent: () => {}, updateEvent: () => {}, removeEvent: () => {}, toggleAlarmActive: () => {},
});

const eventsCol = (uid: string) => collection(db, 'users', uid, 'events');
const eventPath = (uid: string, id: string) => ['users', uid, 'events', id];
const modified = (event: AppEvent) => event.updatedAt ?? 0;

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const eventsRef = useRef<AppEvent[]>([]);
  const uidRef = useRef<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const persist = (updated: AppEvent[]) => {
    eventsRef.current = updated;
    setEvents(updated);
    if (uidRef.current) void Storage.setForUser(KEYS.EVENTS, uidRef.current, updated);
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async firebaseUser => {
      unsubRef.current?.();
      unsubRef.current = null;
      if (!firebaseUser) {
        uidRef.current = null;
        eventsRef.current = [];
        setEvents([]);
        setIsLoading(false);
        return;
      }

      const uid = firebaseUser.uid;
      uidRef.current = uid;
      const local = await Storage.getForUser<AppEvent[]>(KEYS.EVENTS, uid) ?? [];
      persist(local);
      setIsLoading(false);

      unsubRef.current = onSnapshot(eventsCol(uid), async (snapshot: QuerySnapshot) => {
        if (uidRef.current !== uid) return;
        const pendingDeletes = await getPendingDeletePaths(uid);
        const cloud = snapshot.docs
          .map(item => item.data() as AppEvent)
          .filter(item => !pendingDeletes.has(eventPath(uid, item.id).join('/')));
        const merged = new Map(cloud.map(item => [item.id, item]));
        for (const localItem of eventsRef.current) {
          const cloudItem = merged.get(localItem.id);
          if (!cloudItem || modified(localItem) > modified(cloudItem)) {
            merged.set(localItem.id, localItem);
            void queueCloudSet(uid, eventPath(uid, localItem.id), localItem as unknown as Record<string, unknown>);
          }
        }
        persist([...merged.values()]);
      }, () => undefined);
    });
    return () => {
      unsubAuth();
      unsubRef.current?.();
    };
  }, []);

  const save = (event: AppEvent, isNew: boolean) => {
    const uid = uidRef.current;
    if (!uid) return;
    const updatedEvent = { ...event, updatedAt: Date.now() };
    const updated = isNew
      ? [updatedEvent, ...eventsRef.current]
      : eventsRef.current.map(item => item.id === event.id ? updatedEvent : item);
    persist(updated);
    void queueCloudSet(uid, eventPath(uid, event.id), updatedEvent as unknown as Record<string, unknown>);
    void cancelNotification(`event_${event.id}`);
    if (updatedEvent.alarmActive) {
      void scheduleEventNotification(updatedEvent.id, updatedEvent.title, updatedEvent.startTime, updatedEvent.startDate, 15, updatedEvent.recurrence ?? 'none');
    }
  };

  const addEvent = (event: AppEvent) => save(event, true);
  const updateEvent = (event: AppEvent) => save(event, false);

  const removeEvent = (id: string) => {
    const uid = uidRef.current;
    if (!uid) return;
    persist(eventsRef.current.filter(event => event.id !== id));
    void queueCloudDelete(uid, eventPath(uid, id));
    void cancelNotification(`event_${id}`);
  };

  const toggleAlarmActive = (id: string) => {
    const event = eventsRef.current.find(item => item.id === id);
    if (event) save({ ...event, alarmActive: !event.alarmActive }, false);
  };

  return <EventContext.Provider value={{ events, isLoading, addEvent, updateEvent, removeEvent, toggleAlarmActive }}>{children}</EventContext.Provider>;
};

export const useEvents = () => useContext(EventContext);
