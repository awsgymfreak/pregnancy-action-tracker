export function readJson<T>(key: string): T | null {
  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as T;
}

export function writeJson<T>(key: string, data: T): void {
  window.localStorage.setItem(key, JSON.stringify(data));
}
