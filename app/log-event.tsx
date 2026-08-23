import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useActionTypes } from '../src/context/ActionTypesContext';
import { useEvents } from '../src/context/EventsContext';

export default function LogEventScreen() {
  const { actionTypes } = useActionTypes();
  const { addEvent } = useEvents();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(actionTypes[0]?.id ?? null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const selectedType = actionTypes.find((t) => t.id === selectedTypeId) ?? null;

  async function handleSave() {
    if (!selectedType) {
      setError('Choose an action.');
      return;
    }
    try {
      await addEvent(
        {
          actionTypeId: selectedType.id,
          startDate: startDate.toISOString(),
          endDate: selectedType.hasDuration ? endDate.toISOString() : null,
        },
        selectedType
      );
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save event.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Action</Text>
      {actionTypes.map((type) => (
        <Pressable
          key={type.id}
          style={[styles.option, selectedTypeId === type.id && styles.optionSelected]}
          onPress={() => setSelectedTypeId(type.id)}
        >
          <Text>{type.name}</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>Start time</Text>
      <DateTimePicker
        value={startDate}
        mode="datetime"
        onChange={(_, date) => date && setStartDate(date)}
      />

      {selectedType?.hasDuration && (
        <>
          <Text style={styles.label}>End time</Text>
          <DateTimePicker
            value={endDate}
            mode="datetime"
            onChange={(_, date) => date && setEndDate(date)}
          />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  option: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginTop: 4 },
  optionSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  error: { color: '#DC2626' },
  saveButton: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: 'white', fontWeight: '600' },
});
