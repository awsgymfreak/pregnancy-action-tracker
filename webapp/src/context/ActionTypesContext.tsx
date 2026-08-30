import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ActionType } from '../models/types';
import { readJson, writeJson } from '../storage/localStorage';
import { validateActionTypeName } from '../validation/validators';

const STORAGE_KEY = 'pregnancy-tracker:actionTypes';

const DEFAULT_ACTION_TYPES: ActionType[] = [
  { id: 'default-baby-movement', name: 'Baby movement', isDefault: true },
  { id: 'default-contraction', name: 'Contraction', isDefault: true },
];

interface ActionTypesContextValue {
  actionTypes: ActionType[];
  addActionType: (name: string) => Promise<ActionType>;
  updateActionType: (id: string, updates: { name?: string }) => Promise<void>;
  deleteActionType: (id: string) => Promise<void>;
  replaceAll: (actionTypes: ActionType[]) => Promise<void>;
}

const ActionTypesContext = createContext<ActionTypesContextValue | undefined>(undefined);

function loadInitial(): ActionType[] {
  const loaded = readJson<ActionType[]>(STORAGE_KEY);
  if (loaded === null) {
    try {
      writeJson(STORAGE_KEY, DEFAULT_ACTION_TYPES);
    } catch {
      // Ignore — DEFAULT_ACTION_TYPES is still returned and used in memory;
      // persistence will be retried on the next successful write via persist().
    }
    return DEFAULT_ACTION_TYPES;
  }
  return loaded;
}

export function ActionTypesProvider({ children }: { children: ReactNode }) {
  const [actionTypes, setActionTypes] = useState<ActionType[]>(loadInitial);

  async function persist(next: ActionType[]) {
    const previous = actionTypes;
    setActionTypes(next);
    try {
      writeJson(STORAGE_KEY, next);
    } catch {
      setActionTypes(previous);
      throw new Error("Couldn't save — try again.");
    }
  }

  async function addActionType(name: string) {
    const trimmed = validateActionTypeName(
      name,
      actionTypes.map((a) => a.name)
    );
    const newType: ActionType = {
      id: crypto.randomUUID(),
      name: trimmed,
      isDefault: false,
    };
    await persist([...actionTypes, newType]);
    return newType;
  }

  async function updateActionType(id: string, updates: { name?: string }) {
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
    const next = actionTypes.map((a) => (a.id === id ? { ...a, name } : a));
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
      value={{ actionTypes, addActionType, updateActionType, deleteActionType, replaceAll }}
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
