import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ActionEvent, ActionType } from '../models/types';
import { readJson, writeJson } from '../storage/localStorage';
import { validateActionEventDates } from '../validation/validators';

const STORAGE_KEY = 'pregnancy-tracker:events';

interface EventsContextValue {
  events: ActionEvent[];
  addEvent: (
    input: { actionTypeId: string; startDate: string; endDate: string | null },
    actionType: ActionType
  ) => Promise<ActionEvent>;
  deleteEvent: (id: string) => Promise<void>;
  replaceAll: (events: ActionEvent[]) => Promise<void>;
}

const EventsContext = createContext<EventsContextValue | undefined>(undefined);

function loadInitial(): ActionEvent[] {
  return readJson<ActionEvent[]>(STORAGE_KEY) ?? [];
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ActionEvent[]>(loadInitial);

  async function persist(next: ActionEvent[]) {
    const previous = events;
    setEvents(next);
    try {
      writeJson(STORAGE_KEY, next);
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
      id: crypto.randomUUID(),
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
    <EventsContext.Provider value={{ events, addEvent, deleteEvent, replaceAll }}>
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
