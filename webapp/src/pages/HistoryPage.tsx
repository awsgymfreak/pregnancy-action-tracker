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
import { groupEventsByDay } from '../utils/groupByDay';
import { assignColors } from '../utils/colors';

const RANGES: HistoryRange[] = ['day', 'week', 'all'];

const RANGE_LABELS: Record<HistoryRange, string> = {
  day: 'Last 24 hours',
  week: 'Last 7 days',
  all: 'All time',
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

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

  const dayGroups = useMemo(() => groupEventsByDay(visibleEvents), [visibleEvents]);

  return (
    <div>
      <div className="card">
        <div className="select-row">
          <select
            className="select-pill"
            aria-label="Time range"
            value={range}
            onChange={(e) => setRange(e.target.value as HistoryRange)}
          >
            {RANGES.map((r) => (
              <option key={r} value={r}>
                {RANGE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            className="select-pill"
            aria-label="Filter by action"
            value={actionTypeFilter ?? 'all'}
            onChange={(e) => setActionTypeFilter(e.target.value === 'all' ? null : e.target.value)}
          >
            <option value="all">All actions</option>
            {actionTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {dayGroups.length === 0 && (
        <p className="week-header-muted">No events logged for this range.</p>
      )}

      {dayGroups.map((group) => (
        <div className="day-group" key={`${group.label}-${group.events[0].id}`}>
          <p className="day-group-header">{group.label}</p>
          {group.events.map((item) => {
            const type = actionTypeById.get(item.actionTypeId);
            const start = new Date(item.startDate);
            const timeLabel = item.endDate
              ? `${formatTime(start)} – ${formatTime(new Date(item.endDate))}`
              : formatTime(start);
            return (
              <div
                key={item.id}
                className="event-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/log-event/${item.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/log-event/${item.id}`);
                  }
                }}
              >
                <span
                  className="event-accent"
                  style={{ backgroundColor: colors[item.actionTypeId] ?? '#9CA3AF' }}
                />
                <div className="event-body">
                  <span className="event-name">{type?.name ?? 'Unknown'}</span>
                  <span className="event-time">{timeLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <button className="fab" onClick={() => navigate('/log-event')} aria-label="Log new event">
        +
      </button>
    </div>
  );
}
