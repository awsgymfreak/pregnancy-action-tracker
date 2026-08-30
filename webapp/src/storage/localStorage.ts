export function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function writeJson<T>(key: string, data: T): void {
  window.localStorage.setItem(key, JSON.stringify(data));
}
