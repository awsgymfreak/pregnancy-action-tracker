import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import { ActionEvent, ActionType } from '../models/types';
import { readJsonFile, writeJsonFile } from '../storage/fileStorage';
import { validateActionEventDates } from '../validation/validators';

const FILE_NAME = 'events.json';

interface EventsContextValue {
  events: ActionEvent[];
  isLoaded: boolean;
  addEvent: (
    input: { actionTypeId: string; startDate: string; endDate: string | null },
    actionType: ActionType
  ) => Promise<ActionEvent>;
  deleteEvent: (id: string) => Promise<void>;
  replaceAll: (events: ActionEvent[]) => Promise<void>;
}

const EventsContext = createContext<EventsContextValue | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ActionEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const loaded = await readJsonFile<ActionEvent[]>(FILE_NAME);
      if (loaded === null) {
        await writeJsonFile(FILE_NAME, []);
        setEvents([]);
      } else {
        setEvents(loaded);
      }
      setIsLoaded(true);
    })();
  }, []);

  async function persist(next: ActionEvent[]) {
    const previous = events;
    setEvents(next);
    try {
      await writeJsonFile(FILE_NAME, next);
    } catch {
      setEvents(previous);
      throw new Error("Couldn't save — try again.");
    }
  }

  async function addEvent(
    input: { actionTypeId: string; startDate: string; endDate: string | null },
    actionType: ActionType
  ) {
    validateActionEventDates(input.startDate, input.endDate, actionType.hasDuration);
    const newEvent: ActionEvent = {
      id: Crypto.randomUUID(),
      actionTypeId: input.actionTypeId,
      startDate: input.startDate,
      endDate: actionType.hasDuration ? input.endDate : null,
    };
    await persist([...events, newEvent]);
    return newEvent;
  }

  async function deleteEvent(id: string) {
    await persist(events.filter((e) => e.id !== id));
  }

  async function replaceAll(next: ActionEvent[]) {
    await persist(next);
  }

  return (
    <EventsContext.Provider value={{ events, isLoaded, addEvent, deleteEvent, replaceAll }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return ctx;
}
