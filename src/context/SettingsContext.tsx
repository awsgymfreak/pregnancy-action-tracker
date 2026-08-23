import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Settings } from '../models/types';
import { readJsonFile, writeJsonFile } from '../storage/fileStorage';
import { validateDueDate } from '../validation/validators';

const FILE_NAME = 'settings.json';

interface SettingsContextValue {
  settings: Settings | null;
  isLoaded: boolean;
  updateDueDate: (dueDate: string) => Promise<void>;
  replaceAll: (settings: Settings) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const loaded = await readJsonFile<Settings>(FILE_NAME);
      setSettings(loaded);
      setIsLoaded(true);
    })();
  }, []);

  async function persist(next: Settings) {
    const previous = settings;
    setSettings(next);
    try {
      await writeJsonFile(FILE_NAME, next);
    } catch {
      setSettings(previous);
      throw new Error("Couldn't save — try again.");
    }
  }

  async function updateDueDate(dueDate: string) {
    validateDueDate(dueDate);
    await persist({ dueDate });
  }

  async function replaceAll(next: Settings) {
    validateDueDate(next.dueDate);
    await persist(next);
  }

  return (
    <SettingsContext.Provider value={{ settings, isLoaded, updateDueDate, replaceAll }}>
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
