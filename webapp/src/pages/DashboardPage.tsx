import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useActionTypes } from '../context/ActionTypesContext';
import { useEvents } from '../context/EventsContext';
import { useSettings } from '../context/SettingsContext';
import { bucketEvents, type DashboardRange } from '../utils/dateBuckets';
import { assignColors } from '../utils/colors';
import { getCurrentPregnancyWeek } from '../utils/pregnancyWeek';
import { filterEventsByActionType } from '../utils/historyFilter';

const RANGES: DashboardRange[] = ['day', 'month', 'pregnancy'];

export function DashboardPage() {
  const { actionTypes } = useActionTypes();
  const { events } = useEvents();
  const { settings } = useSettings();
  const [range, setRange] = useState<DashboardRange>('day');
  const [actionTypeFilter, setActionTypeFilter] = useState<string | null>(null);

  const colors = useMemo(() => assignColors(actionTypes.map((t) => t.id)), [actionTypes]);

  const filteredEvents = useMemo(
    () => filterEventsByActionType(events, actionTypeFilter),
    [events, actionTypeFilter]
  );

  const filteredTypes = useMemo(
    () => (actionTypeFilter ? actionTypes.filter((t) => t.id === actionTypeFilter) : actionTypes),
    [actionTypes, actionTypeFilter]
  );

  const chartRows = useMemo(() => {
    const buckets = bucketEvents(filteredEvents, range, new Date(), settings?.dueDate ?? null);
    return buckets.map((bucket) => ({
      label: bucket.label,
      ...bucket.countsByActionType,
    }));
  }, [filteredEvents, range, settings]);

  const currentWeek = settings ? getCurrentPregnancyWeek(settings.dueDate) : null;
  const canShowChart = range !== 'pregnancy' || Boolean(settings);

  return (
    <div>
      {currentWeek !== null ? (
        <p className="week-header">Week {currentWeek}</p>
      ) : (
        <p className="week-header-muted">Set a due date in Settings to see your week</p>
      )}

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

      {!canShowChart ? (
        <p className="week-header-muted">Set a due date in Settings to see this view</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartRows}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            {filteredTypes.map((type) => (
              <Bar key={type.id} dataKey={type.id} name={type.name} stackId="stack" fill={colors[type.id]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="legend">
        {actionTypes.map((type) => (
          <div key={type.id} className="legend-row">
            <span className="color-dot" style={{ backgroundColor: colors[type.id] }} />
            <span>{type.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
