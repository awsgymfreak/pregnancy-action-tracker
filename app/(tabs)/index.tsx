import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useActionTypes } from '../../src/context/ActionTypesContext';
import { useEvents } from '../../src/context/EventsContext';
import { useSettings } from '../../src/context/SettingsContext';
import { bucketEvents, buildStackData, DashboardRange } from '../../src/utils/dateBuckets';
import { assignColors } from '../../src/utils/colors';
import { getCurrentPregnancyWeek } from '../../src/utils/pregnancyWeek';
import { filterEventsByActionType } from '../../src/utils/historyFilter';

const RANGES: DashboardRange[] = ['day', 'month', 'pregnancy'];

export default function DashboardScreen() {
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

  const stackData = useMemo(() => {
    const buckets = bucketEvents(filteredEvents, range, new Date(), settings?.dueDate ?? null);
    return buildStackData(buckets, filteredTypes, colors);
  }, [filteredEvents, range, settings, filteredTypes, colors]);

  const currentWeek = settings ? getCurrentPregnancyWeek(settings.dueDate) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {currentWeek !== null ? (
        <Text style={styles.weekHeader}>Week {currentWeek}</Text>
      ) : (
        <Text style={styles.weekHeaderMuted}>Set a due date in Settings to see your week</Text>
      )}

      <View style={styles.filterRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={[styles.filterButton, range === r && styles.filterButtonActive]}
          >
            <Text style={range === r ? styles.filterTextActive : styles.filterText}>{r}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setActionTypeFilter(null)}
          style={[styles.filterButton, actionTypeFilter === null && styles.filterButtonActive]}
        >
          <Text style={actionTypeFilter === null ? styles.filterTextActive : styles.filterText}>
            All
          </Text>
        </Pressable>
        {actionTypes.map((type) => (
          <Pressable
            key={type.id}
            onPress={() => setActionTypeFilter(type.id)}
            style={[styles.filterButton, actionTypeFilter === type.id && styles.filterButtonActive]}
          >
            <Text style={actionTypeFilter === type.id ? styles.filterTextActive : styles.filterText}>
              {type.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {range === 'pregnancy' && !settings ? (
        <Text style={styles.weekHeaderMuted}>Set a due date in Settings to see this view</Text>
      ) : (
        <BarChart stackData={stackData} noOfSections={4} barWidth={range === 'day' ? 12 : 18} spacing={8} />
      )}

      <View style={styles.legend}>
        {actionTypes.map((type) => (
          <View key={type.id} style={styles.legendRow}>
            <View style={[styles.colorDot, { backgroundColor: colors[type.id] }]} />
            <Text>{type.name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  weekHeader: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  weekHeaderMuted: { fontSize: 14, color: '#666', marginBottom: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  filterButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { color: '#333' },
  filterTextActive: { color: 'white' },
  legend: { marginTop: 16, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
});
