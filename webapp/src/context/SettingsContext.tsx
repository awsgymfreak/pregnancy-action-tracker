import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Settings } from '../models/types';
import { readJson, writeJson } from '../storage/localStorage';
import { validateDueDate } from '../validation/validators';

const STORAGE_KEY = 'pregnancy-tracker:settings';

interface SettingsContextValue {
  settings: Settings | null;
  updateDueDate: (dueDate: string) => Promise<void>;
  updateReminderSettings: (updates: {
    reminderLeadTimeDays?: number;
    inactivityThresholdDays?: number;
  }) => Promise<void>;
  replaceAll: (settings: Settings) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function loadInitial(): Settings | null {
  return readJson<Settings>(STORAGE_KEY);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(loadInitial);

  async function persist(next: Settings) {
    const previous = settings;
    setSettings(next);
    try {
      writeJson(STORAGE_KEY, next);
    } catch {
      setSettings(previous);
      throw new Error("Couldn't save — try again.");
    }
  }

  async function updateDueDate(dueDate: string) {
    validateDueDate(dueDate);
    await persist({ ...settings, dueDate });
  }

  async function updateReminderSettings(updates: {
    reminderLeadTimeDays?: number;
    inactivityThresholdDays?: number;
  }) {
    if (!settings) {
      throw new Error('Set a due date first.');
    }
    await persist({ ...settings, ...updates });
  }

  async function replaceAll(next: Settings) {
    validateDueDate(next.dueDate);
    await persist(next);
  }

  return (
    <SettingsContext.Provider value={{ settings, updateDueDate, updateReminderSettings, replaceAll }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
