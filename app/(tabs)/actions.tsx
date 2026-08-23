import { useState } from 'react';
import { View, Text, TextInput, Switch, Pressable, FlatList, StyleSheet, Alert } from 'react-native';
import { useActionTypes } from '../../src/context/ActionTypesContext';

export default function ActionsScreen() {
  const { actionTypes, addActionType, updateActionType, deleteActionType } = useActionTypes();
  const [name, setName] = useState('');
  const [hasDuration, setHasDuration] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(id: string, currentName: string, currentHasDuration: boolean) {
    setEditingId(id);
    setName(currentName);
    setHasDuration(currentHasDuration);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setHasDuration(false);
    setError(null);
  }

  async function handleSubmit() {
    try {
      if (editingId) {
        await updateActionType(editingId, { name, hasDuration });
      } else {
        await addActionType(name, hasDuration);
      }
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save action.');
    }
  }

  function handleDelete(id: string) {
    Alert.alert('Delete action type?', 'This does not delete already-logged events.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteActionType(id);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save action.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={actionTypes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>
              {item.name}
              {item.hasDuration ? ' (duration)' : ''}
            </Text>
            <View style={styles.rowActions}>
              <Pressable onPress={() => startEdit(item.id, item.name, item.hasDuration)}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Action name"
          value={name}
          onChangeText={setName}
        />
        <View style={styles.switchRow}>
          <Text>Has duration (start + end)</Text>
          <Switch value={hasDuration} onValueChange={setHasDuration} />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>{editingId ? 'Save Changes' : 'Add Action'}</Text>
        </Pressable>
        {editingId && (
          <Pressable onPress={resetForm}>
            <Text style={styles.cancelText}>Cancel edit</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowText: { fontSize: 16 },
  rowActions: { flexDirection: 'row', gap: 16 },
  editText: { color: '#2563EB' },
  deleteText: { color: '#DC2626' },
  form: { marginTop: 16, gap: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  error: { color: '#DC2626' },
  submitButton: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: 'white', fontWeight: '600' },
  cancelText: { textAlign: 'center', color: '#666', marginTop: 4 },
});
