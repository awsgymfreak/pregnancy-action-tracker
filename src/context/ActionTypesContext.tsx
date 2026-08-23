import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import { ActionType } from '../models/types';
import { readJsonFile, writeJsonFile } from '../storage/fileStorage';
import { validateActionTypeName } from '../validation/validators';

const FILE_NAME = 'actionTypes.json';

const DEFAULT_ACTION_TYPES: ActionType[] = [
  { id: 'default-baby-movement', name: 'Baby movement', hasDuration: false, isDefault: true },
  { id: 'default-contraction', name: 'Contraction', hasDuration: true, isDefault: true },
];

interface ActionTypesContextValue {
  actionTypes: ActionType[];
  isLoaded: boolean;
  addActionType: (name: string, hasDuration: boolean) => Promise<ActionType>;
  updateActionType: (
    id: string,
    updates: { name?: string; hasDuration?: boolean }
  ) => Promise<void>;
  deleteActionType: (id: string) => Promise<void>;
  replaceAll: (actionTypes: ActionType[]) => Promise<void>;
}

const ActionTypesContext = createContext<ActionTypesContextValue | undefined>(undefined);

export function ActionTypesProvider({ children }: { children: ReactNode }) {
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const loaded = await readJsonFile<ActionType[]>(FILE_NAME);
      if (loaded === null) {
        await writeJsonFile(FILE_NAME, DEFAULT_ACTION_TYPES);
        setActionTypes(DEFAULT_ACTION_TYPES);
      } else {
        setActionTypes(loaded);
      }
      setIsLoaded(true);
    })();
  }, []);

  async function persist(next: ActionType[]) {
    const previous = actionTypes;
    setActionTypes(next);
    try {
      await writeJsonFile(FILE_NAME, next);
    } catch {
      setActionTypes(previous);
      throw new Error("Couldn't save — try again.");
    }
  }

  async function addActionType(name: string, hasDuration: boolean) {
    const trimmed = validateActionTypeName(
      name,
      actionTypes.map((a) => a.name)
    );
    const newType: ActionType = {
      id: Crypto.randomUUID(),
      name: trimmed,
      hasDuration,
      isDefault: false,
    };
    await persist([...actionTypes, newType]);
    return newType;
  }

  async function updateActionType(
    id: string,
    updates: { name?: string; hasDuration?: boolean }
  ) {
    const existing = actionTypes.find((a) => a.id === id);
    if (!existing) {
      throw new Error('Action type not found.');
    }
    let name = existing.name;
    if (updates.name !== undefined) {
      name = validateActionTypeName(
        updates.name,
        actionTypes.filter((a) => a.id !== id).map((a) => a.name)
      );
    }
    const next = actionTypes.map((a) =>
      a.id === id ? { ...a, name, hasDuration: updates.hasDuration ?? a.hasDuration } : a
    );
    await persist(next);
  }

  async function deleteActionType(id: string) {
    await persist(actionTypes.filter((a) => a.id !== id));
  }

  async function replaceAll(next: ActionType[]) {
    await persist(next);
  }

  return (
    <ActionTypesContext.Provider
      value={{ actionTypes, isLoaded, addActionType, updateActionType, deleteActionType, replaceAll }}
    >
      {children}
    </ActionTypesContext.Provider>
  );
}

export function useActionTypes() {
  const ctx = useContext(ActionTypesContext);
  if (!ctx) {
    throw new Error('useActionTypes must be used within an ActionTypesProvider');
  }
  return ctx;
}
