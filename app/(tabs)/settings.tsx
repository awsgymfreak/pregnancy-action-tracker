import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSettings } from '../../src/context/SettingsContext';
import { useActionTypes } from '../../src/context/ActionTypesContext';
import { useEvents } from '../../src/context/EventsContext';
import { buildExportPayload, exportToFile } from '../../src/backup/exportData';
import { validateImportPayload } from '../../src/backup/importData';

export default function SettingsScreen() {
  const { settings, updateDueDate, replaceAll: replaceSettings } = useSettings();
  const { actionTypes, replaceAll: replaceActionTypes } = useActionTypes();
  const { events, replaceAll: replaceEvents } = useEvents();
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!settings) {
      setError('Set a due date before exporting.');
      return;
    }
    setError(null);
    const payload = buildExportPayload(actionTypes, events, settings);
    try {
      await exportToFile(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export backup.');
    }
  }

  async function handleImport() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled) {
      return;
    }
    try {
      const contents = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const payload = validateImportPayload(JSON.parse(contents));
      setError(null);
      Alert.alert('Replace all data?', 'This replaces all current data on this device.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            await replaceActionTypes(payload.actionTypes);
            await replaceEvents(payload.events);
            await replaceSettings(payload.settings);
          },
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read backup file.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Due date</Text>
      <DateTimePicker
        value={settings ? new Date(settings.dueDate) : new Date()}
        mode="date"
        onChange={async (_, date) => {
          if (!date) return;
          try {
            await updateDueDate(date.toISOString());
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save.');
          }
        }}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleExport}>
        <Text style={styles.buttonText}>Export Data</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={handleImport}>
        <Text style={styles.buttonText}>Import Data</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: '600' },
  error: { color: '#DC2626' },
  button: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
});
