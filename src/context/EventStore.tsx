import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { collection, doc, getDoc, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import { auth, db } from '../config/firebase';
import { KEYS, Storage } from '../services/StorageService';
import { getPendingDeletePaths, queueCloudDelete, queueCloudSet } from '../services/OfflineSyncService';
import { cancelEventNotifications, scheduleEventNotifications } from '../services/EventNotificationService';
import { syncEventWeatherWarnings } from '../services/EventWeatherNotificationService';
import type { AppEvent } from '@/types/event';
import { DEFAULT_EVENT_CATEGORIES, normalizeEventCategories } from '@/utils/eventCategories';

export type { AppEvent };

interface EventContextType {
  events: AppEvent[];
  categories: string[];
  isLoading: boolean;
  addEvent: (event: AppEvent) => void;
  updateEvent: (event: AppEvent) => void;
  removeEvent: (id: string) => void;
  toggleAlarmActive: (id: string) => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
}

export { DEFAULT_EVENT_CATEGORIES };

const EventContext = createContext<EventContextType>({
  events: [], categories: DEFAULT_EVENT_CATEGORIES, isLoading: true,
  addEvent: () => {}, updateEvent: () => {}, removeEvent: () => {}, toggleAlarmActive: () => {},
  addCategory: () => {}, removeCategory: () => {},
});

const eventsCol = (uid: string) => collection(db, 'users', uid, 'events');
const eventPath = (uid: string, id: string) => ['users', uid, 'events', id];
const metaPath = (uid: string) => ['users', uid, 'meta', 'eventMeta'];
const modified = (event: AppEvent) => event.updatedAt ?? 0;
const clean = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [categories, setCategories] = useState(DEFAULT_EVENT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const eventsRef = useRef<AppEvent[]>([]);
  const categoriesRef = useRef(DEFAULT_EVENT_CATEGORIES);
  const uidRef = useRef<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const weatherSyncRef = useRef<Promise<void> | null>(null);

  const syncWeather = () => {
    const uid = uidRef.current;
    if (!uid || weatherSyncRef.current) return;
    weatherSyncRef.current = syncEventWeatherWarnings(eventsRef.current, uid)
      .catch(() => undefined)
      .finally(() => { weatherSyncRef.current = null; });
  };

  const persist = (updated: AppEvent[]) => {
    eventsRef.current = updated;
    setEvents(updated);
    if (uidRef.current) void Storage.setForUser(KEYS.EVENTS, uidRef.current, updated);
  };

  const persistCategories = (updated: string[], upload = true) => {
    const normalized = normalizeEventCategories(updated);
    categoriesRef.current = normalized;
    setCategories(normalized);
    const uid = uidRef.current;
    if (!uid) return;
    void Storage.setForUser(KEYS.EVENT_CATEGORIES, uid, normalized);
    if (upload) void queueCloudSet(uid, metaPath(uid), { categories: normalized, updatedAt: Date.now() });
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async firebaseUser => {
      unsubRef.current?.();
      unsubRef.current = null;
      if (!firebaseUser) {
        uidRef.current = null;
        eventsRef.current = [];
        setEvents([]);
        categoriesRef.current = DEFAULT_EVENT_CATEGORIES;
        setCategories(DEFAULT_EVENT_CATEGORIES);
        setIsLoading(false);
        return;
      }

      const uid = firebaseUser.uid;
      uidRef.current = uid;
      const [local, localCategories] = await Promise.all([
        Storage.getForUser<AppEvent[]>(KEYS.EVENTS, uid),
        Storage.getForUser<string[]>(KEYS.EVENT_CATEGORIES, uid),
      ]);
      persist(local ?? []);
      persistCategories([...DEFAULT_EVENT_CATEGORIES, ...(localCategories ?? [])], false);
      setIsLoading(false);

      void getDoc(doc(db, metaPath(uid).join('/'))).then(snapshot => {
        const cloudCategories = snapshot.data()?.categories;
        if (uidRef.current === uid && Array.isArray(cloudCategories)) {
          persistCategories([...categoriesRef.current, ...cloudCategories], false);
        }
      }).catch(() => undefined);

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
            void queueCloudSet(uid, eventPath(uid, localItem.id), clean(localItem as unknown as Record<string, unknown>));
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

  useEffect(() => {
    if (!isLoading) syncWeather();
  }, [events, isLoading]);

  useEffect(() => {
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') syncWeather();
    });
    const interval = setInterval(syncWeather, 60 * 60_000);
    return () => {
      appState.remove();
      clearInterval(interval);
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
    void queueCloudSet(uid, eventPath(uid, event.id), clean(updatedEvent as unknown as Record<string, unknown>));
    if (updatedEvent.alarmActive) {
      void scheduleEventNotifications(updatedEvent).catch(() => undefined);
    } else {
      void cancelEventNotifications(event.id);
    }
  };

  const addEvent = (event: AppEvent) => save(event, true);
  const updateEvent = (event: AppEvent) => save(event, false);

  const removeEvent = (id: string) => {
    const uid = uidRef.current;
    if (!uid) return;
    persist(eventsRef.current.filter(event => event.id !== id));
    void queueCloudDelete(uid, eventPath(uid, id));
    void cancelEventNotifications(id);
  };

  const toggleAlarmActive = (id: string) => {
    const event = eventsRef.current.find(item => item.id === id);
    if (event && (event.alarmActive || event.reminders.length > 0)) {
      save({ ...event, alarmActive: !event.alarmActive }, false);
    }
  };

  const addCategory = (category: string) => {
    const trimmed = category.trim();
    if (!categoriesRef.current.some(item => item.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
      persistCategories([...categoriesRef.current, trimmed]);
    }
  };
  const removeCategory = (category: string) => {
    if (DEFAULT_EVENT_CATEGORIES.includes(category)) return;
    persistCategories(categoriesRef.current.filter(item => item !== category));
  };

  return <EventContext.Provider value={{ events, categories, isLoading, addEvent, updateEvent, removeEvent, toggleAlarmActive, addCategory, removeCategory }}>{children}</EventContext.Provider>;
};

export const useEvents = () => useContext(EventContext);
