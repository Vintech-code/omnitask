import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, QuerySnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { Storage, KEYS } from '../services/StorageService';
import { scheduleEventNotification, cancelNotification } from '../services/NotificationService';
import type { AppEvent } from '@/types/event';

export type { AppEvent };

interface EventContextType {
  events: AppEvent[];
  isLoading: boolean;
  addEvent: (e: AppEvent) => void;
  updateEvent: (e: AppEvent) => void;
  removeEvent: (id: string) => void;
  toggleAlarmActive: (id: string) => void;
}

const EventContext = createContext<EventContextType>({
  events: [],
  isLoading: true,
  addEvent: () => {},
  updateEvent: () => {},
  removeEvent: () => {},
  toggleAlarmActive: () => {},
});

// ── Firestore helpers ────────────────────────────────────────────────────
const eventDoc  = (uid: string, id: string) => doc(db, 'users', uid, 'events', id);
const eventsCol = (uid: string) => collection(db, 'users', uid, 'events');

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents]         = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const uidRef   = useRef<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Hydrate from local cache immediately
    Storage.get<AppEvent[]>(KEYS.EVENTS).then(stored => {
      if (stored) setEvents(stored);
      setIsLoading(false);
    });

    const unsubAuth = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
      if (!fbUser) { uidRef.current = null; return; }
      uidRef.current = fbUser.uid;

      unsubRef.current = onSnapshot(
        eventsCol(fbUser.uid),
        (snap: QuerySnapshot) => {
          const fetched: AppEvent[] = snap.docs.map(d => d.data() as AppEvent);
          if (fetched.length > 0) {
            setEvents(fetched);
            Storage.set(KEYS.EVENTS, fetched);
          }
        },
        () => {}
      );
    });

    return () => {
      unsubAuth();
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const persist = (updated: AppEvent[]) => {
    setEvents(updated);
    Storage.set(KEYS.EVENTS, updated);
  };

  const addEvent = (e: AppEvent) => {
    persist([e, ...events]);
    if (uidRef.current) setDoc(eventDoc(uidRef.current, e.id), e).catch(() => {});
    if (e.alarmActive) scheduleEventNotification(e.id, e.title, e.startTime, e.startDate, 15, e.recurrence ?? 'none');
  };

  const updateEvent = (e: AppEvent) => {
    persist(events.map(x => x.id === e.id ? e : x));
    if (uidRef.current) setDoc(eventDoc(uidRef.current, e.id), e).catch(() => {});
    cancelNotification(`event_${e.id}`);
    if (e.alarmActive) scheduleEventNotification(e.id, e.title, e.startTime, e.startDate, 15, e.recurrence ?? 'none');
  };

  const removeEvent = (id: string) => {
    persist(events.filter(e => e.id !== id));
    if (uidRef.current) deleteDoc(eventDoc(uidRef.current, id)).catch(() => {});
    cancelNotification(`event_${id}`);
  };

  const toggleAlarmActive = (id: string) => {
    const updated = events.map(e => {
      if (e.id !== id) return e;
      const toggled = { ...e, alarmActive: !e.alarmActive };
      if (uidRef.current) setDoc(eventDoc(uidRef.current, id), toggled).catch(() => {});
      if (toggled.alarmActive) {
        scheduleEventNotification(toggled.id, toggled.title, toggled.startTime, toggled.startDate, 15, toggled.recurrence ?? 'none');
      } else {
        cancelNotification(`event_${id}`);
      }
      return toggled;
    });
    persist(updated);
  };

  return (
    <EventContext.Provider value={{ events, isLoading, addEvent, updateEvent, removeEvent, toggleAlarmActive }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => useContext(EventContext);
