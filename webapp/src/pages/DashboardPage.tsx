import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useActionTypes } from '../context/ActionTypesContext';
import { useEvents } from '../context/EventsContext';
import { useSettings } from '../context/SettingsContext';
import { bucketEvents, type DashboardRange } from '../utils/dateBuckets';
import { assignColors } from '../utils/colors';
import { getCurrentPregnancyWeek } from '../utils/pregnancyWeek';
import { filterEventsByActionType } from '../utils/historyFilter';

const RANGES: DashboardRange[] = ['day', 'week', 'month', 'pregnancy'];

const RANGE_LABELS: Record<DashboardRange, string> = {
  day: 'Today (by hour)',
  week: 'Last 7 days',
  month: 'This month (by day)',
  pregnancy: 'Whole pregnancy (by week)',
};

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
      <div className="card">
        {currentWeek !== null ? (
          <p className="week-header">
            Week {currentWeek.week}, Day {currentWeek.day}
          </p>
        ) : (
          <p className="week-header-muted">Set a due date in Settings to see your week</p>
        )}

        <div className="select-row">
          <select
            className="select-pill"
            aria-label="Time range"
            value={range}
            onChange={(e) => setRange(e.target.value as DashboardRange)}
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

      {!canShowChart ? (
        <div className="card">
          <p className="week-header-muted">Set a due date in Settings to see this view</p>
        </div>
      ) : (
        <div className="card">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={false} />
                {filteredTypes.map((type) => (
                  <Bar
                    key={type.id}
                    dataKey={type.id}
                    name={type.name}
                    stackId="stack"
                    fill={colors[type.id]}
                    activeBar={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {filteredTypes.map((type) => (
              <div key={type.id} className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ backgroundColor: colors[type.id] }} />
                <span>{type.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
