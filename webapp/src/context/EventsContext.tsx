import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ActionEvent } from '../models/types';
import { readJson, writeJson } from '../storage/localStorage';
import { validateActionEventDates } from '../validation/validators';

const STORAGE_KEY = 'pregnancy-tracker:events';

interface EventInput {
  actionTypeId: string;
  startDate: string;
  endDate: string | null;
}

interface EventsContextValue {
  events: ActionEvent[];
  addEvent: (input: EventInput) => Promise<ActionEvent>;
  addEvents: (inputs: EventInput[]) => Promise<ActionEvent[]>;
  updateEvent: (id: string, updates: Partial<EventInput>) => Promise<void>;
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

  async function addEvent(input: EventInput) {
    validateActionEventDates(input.startDate, input.endDate);
    const newEvent: ActionEvent = {
      id: crypto.randomUUID(),
      actionTypeId: input.actionTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
    };
    await persist([...events, newEvent]);
    return newEvent;
  }

  async function addEvents(inputs: EventInput[]) {
    // Building all new events before a single persist() call — calling
    // addEvent() in a loop would have each call read the same stale
    // `events` closure (no re-render happens between synchronous/microtask
    // iterations), so only the last call's write would survive.
    const newEvents: ActionEvent[] = inputs.map((input) => {
      validateActionEventDates(input.startDate, input.endDate);
      return {
        id: crypto.randomUUID(),
        actionTypeId: input.actionTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
      };
    });
    await persist([...events, ...newEvents]);
    return newEvents;
  }

  async function updateEvent(id: string, updates: Partial<EventInput>) {
    const existing = events.find((e) => e.id === id);
    if (!existing) {
      throw new Error('Event not found.');
    }
    const actionTypeId = updates.actionTypeId ?? existing.actionTypeId;
    const startDate = updates.startDate ?? existing.startDate;
    const endDate = updates.endDate !== undefined ? updates.endDate : existing.endDate;
    validateActionEventDates(startDate, endDate);
    const next = events.map((e) => (e.id === id ? { ...e, actionTypeId, startDate, endDate } : e));
    await persist(next);
  }

  async function deleteEvent(id: string) {
    await persist(events.filter((e) => e.id !== id));
  }

  async function replaceAll(next: ActionEvent[]) {
    await persist(next);
  }

  return (
    <EventsContext.Provider
      value={{ events, addEvent, addEvents, updateEvent, deleteEvent, replaceAll }}
    >
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
