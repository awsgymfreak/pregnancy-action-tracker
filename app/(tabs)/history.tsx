import { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useActionTypes } from '../../src/context/ActionTypesContext';
import { useEvents } from '../../src/context/EventsContext';
import {
  filterEventsByRange,
  filterEventsByActionType,
  sortEventsMostRecentFirst,
  HistoryRange,
} from '../../src/utils/historyFilter';
import { assignColors } from '../../src/utils/colors';

const RANGES: HistoryRange[] = ['day', 'week', 'all'];

export default function HistoryScreen() {
  const { actionTypes } = useActionTypes();
  const { events } = useEvents();
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
    <View style={styles.container}>
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
      <FlatList
        data={visibleEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const type = actionTypeById.get(item.actionTypeId);
          return (
            <View style={styles.eventRow}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: colors[item.actionTypeId] ?? '#9CA3AF' },
                ]}
              />
              <Text style={styles.eventText}>
                {type?.name ?? 'Unknown'} — {new Date(item.startDate).toLocaleString()}
                {item.endDate ? ` → ${new Date(item.endDate).toLocaleTimeString()}` : ''}
              </Text>
            </View>
          );
        }}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/log-event')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
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
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  eventText: { fontSize: 15 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: 'white', fontSize: 28, lineHeight: 30 },
});
