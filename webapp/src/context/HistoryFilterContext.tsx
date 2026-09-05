import { createContext, useContext, useState, type ReactNode } from 'react';
import type { HistoryRange } from '../utils/historyFilter';

interface HistoryFilterContextValue {
  range: HistoryRange;
  setRange: (range: HistoryRange) => void;
  actionTypeFilter: string[];
  setActionTypeFilter: (actionTypeIds: string[]) => void;
}

const HistoryFilterContext = createContext<HistoryFilterContextValue | undefined>(undefined);

export function HistoryFilterProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<HistoryRange>('day');
  const [actionTypeFilter, setActionTypeFilter] = useState<string[]>([]);

  return (
    <HistoryFilterContext.Provider value={{ range, setRange, actionTypeFilter, setActionTypeFilter }}>
      {children}
    </HistoryFilterContext.Provider>
  );
}

export function useHistoryFilter() {
  const ctx = useContext(HistoryFilterContext);
  if (!ctx) {
    throw new Error('useHistoryFilter must be used within a HistoryFilterProvider');
  }
  return ctx;
}
