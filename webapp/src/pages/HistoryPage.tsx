import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActionTypes } from '../context/ActionTypesContext';
import { useEvents } from '../context/EventsContext';
import {
  filterEventsByRange,
  filterEventsByActionType,
  sortEventsMostRecentFirst,
  type HistoryRange,
} from '../utils/historyFilter';
import { assignColors } from '../utils/colors';

const RANGES: HistoryRange[] = ['day', 'week', 'all'];

export function HistoryPage() {
  const { actionTypes } = useActionTypes();
  const { events } = useEvents();
  const navigate = useNavigate();
  const [range, setRange] = useState<HistoryRange>('day');
  const [actionTypeFilter, setActionTypeFilter] = useState<string | null>(null);

  const colors = useMemo(() => assignColors(actionTypes.map((t) => t.id)), [actionTypes]);
  const actionTypeById = useMemo(() => new Map(actionTypes.map((t) => [t.id, t])), [actionTypes]);

  const visibleEvents = useMemo(() => {
    const byRange = filterEventsByRange(events, range);
    const byType = filterEventsByActionType(byRange, actionTypeFilter);
    return sortEventsMostRecentFirst(byType);
  }, [events, range, actionTypeFilter]);

  return (
    <div>
      <div className="filter-row">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={range === r ? 'filter-button filter-button-active' : 'filter-button'}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="filter-row">
        <button
          onClick={() => setActionTypeFilter(null)}
          className={
            actionTypeFilter === null ? 'filter-button filter-button-active' : 'filter-button'
          }
        >
          All
        </button>
        {actionTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setActionTypeFilter(type.id)}
            className={
              actionTypeFilter === type.id ? 'filter-button filter-button-active' : 'filter-button'
            }
          >
            {type.name}
          </button>
        ))}
      </div>
      <div>
        {visibleEvents.map((item) => {
          const type = actionTypeById.get(item.actionTypeId);
          return (
            <div key={item.id} className="list-row">
              <span
                className="color-dot"
                style={{ backgroundColor: colors[item.actionTypeId] ?? '#9CA3AF' }}
              />
              <span className="row-text" style={{ flex: 1 }}>
                {type?.name ?? 'Unknown'} — {new Date(item.startDate).toLocaleString()}
                {item.endDate ? ` → ${new Date(item.endDate).toLocaleTimeString()}` : ''}
              </span>
            </div>
          );
        })}
      </div>
      <button className="fab" onClick={() => navigate('/log-event')}>
        +
      </button>
    </div>
  );
}
