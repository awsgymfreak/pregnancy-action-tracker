import * as FileSystem from 'expo-file-system/legacy';

export async function readJsonFile<T>(filename: string): Promise<T | null> {
  const path = `${FileSystem.documentDirectory}${filename}`;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    return null;
  }
  const contents = await FileSystem.readAsStringAsync(path);
  return JSON.parse(contents) as T;
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
}
