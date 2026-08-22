let files: Record<string, string> = {};

export const documentDirectory = 'mock-documents/';
export const cacheDirectory = 'mock-cache/';

export async function getInfoAsync(path: string) {
  return { exists: Object.prototype.hasOwnProperty.call(files, path) };
}

export async function readAsStringAsync(path: string) {
  return files[path];
}

export async function writeAsStringAsync(path: string, contents: string) {
  files[path] = contents;
}

export function __reset() {
  files = {};
}
