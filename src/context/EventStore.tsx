import React, { createContext, useContext, useState, useEffect } from 'react';
import { Storage, KEYS } from '../services/StorageService';
import { scheduleEventNotification, cancelNotification } from '../services/NotificationService';

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;   // e.g. "10:30 AM"
  startDate: string;   // e.g. "Oct 24, 2026"
  endTime: string;     // "" when not set
  location: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  reminders: string[];
  alarmActive: boolean;
}

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

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await Storage.get<AppEvent[]>(KEYS.EVENTS);
      if (stored) setEvents(stored);
      setIsLoading(false);
    })();
  }, []);

  const persist = (updated: AppEvent[]) => {
    setEvents(updated);
    Storage.set(KEYS.EVENTS, updated);
  };

  const addEvent = (e: AppEvent) => {
    persist([e, ...events]);
    if (e.alarmActive) scheduleEventNotification(e.id, e.title, e.startTime, e.startDate);
  };

  const updateEvent = (e: AppEvent) => {
    persist(events.map(x => x.id === e.id ? e : x));
    cancelNotification(`event_${e.id}`);
    if (e.alarmActive) scheduleEventNotification(e.id, e.title, e.startTime, e.startDate);
  };

  const removeEvent = (id: string) => {
    persist(events.filter(e => e.id !== id));
    cancelNotification(`event_${id}`);
  };

  const toggleAlarmActive = (id: string) => {
    const updated = events.map(e => {
      if (e.id !== id) return e;
      const toggled = { ...e, alarmActive: !e.alarmActive };
      if (toggled.alarmActive) {
        scheduleEventNotification(toggled.id, toggled.title, toggled.startTime, toggled.startDate);
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
