import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Reminder } from '../models/types';
import { readJson, writeJson } from '../storage/localStorage';

const STORAGE_KEY = 'pregnancy-tracker:reminders';

interface ReminderInput {
  title: string;
  date: string;
  recurrenceDays: number | null;
}

interface RemindersContextValue {
  reminders: Reminder[];
  addReminder: (input: ReminderInput) => Promise<Reminder>;
  updateReminder: (id: string, updates: Partial<Omit<Reminder, 'id'>>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
}

const RemindersContext = createContext<RemindersContextValue | undefined>(undefined);

function loadInitial(): Reminder[] {
  return readJson<Reminder[]>(STORAGE_KEY) ?? [];
}

function validateReminder(input: { title: string; date: string; recurrenceDays: number | null }) {
  const title = input.title.trim();
  if (title.length === 0) {
    throw new Error('Title is required.');
  }
  if (!input.date || Number.isNaN(Date.parse(input.date))) {
    throw new Error('A valid date is required.');
  }
  if (
    input.recurrenceDays !== null &&
    (!Number.isInteger(input.recurrenceDays) || input.recurrenceDays <= 0)
  ) {
    throw new Error('Recurrence must be a positive whole number of days.');
  }
  return { title, date: input.date, recurrenceDays: input.recurrenceDays };
}

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>(loadInitial);

  async function persist(next: Reminder[]) {
    const previous = reminders;
    setReminders(next);
    try {
      writeJson(STORAGE_KEY, next);
    } catch {
      setReminders(previous);
      throw new Error("Couldn't save — try again.");
    }
  }

  async function addReminder(input: ReminderInput) {
    const validated = validateReminder(input);
    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      title: validated.title,
      date: validated.date,
      recurrenceDays: validated.recurrenceDays,
      dismissedUntil: null,
    };
    await persist([...reminders, newReminder]);
    return newReminder;
  }

  async function updateReminder(id: string, updates: Partial<Omit<Reminder, 'id'>>) {
    const existing = reminders.find((r) => r.id === id);
    if (!existing) {
      throw new Error('Reminder not found.');
    }
    const merged = { ...existing, ...updates };
    if (updates.title !== undefined || updates.date !== undefined || updates.recurrenceDays !== undefined) {
      validateReminder(merged);
    }
    const next = reminders.map((r) => (r.id === id ? merged : r));
    await persist(next);
  }

  async function deleteReminder(id: string) {
    await persist(reminders.filter((r) => r.id !== id));
  }

  return (
    <RemindersContext.Provider value={{ reminders, addReminder, updateReminder, deleteReminder }}>
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  const ctx = useContext(RemindersContext);
  if (!ctx) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return ctx;
}
