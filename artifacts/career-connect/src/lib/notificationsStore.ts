const READ_KEY = "cc_notifications_read";
const DELETED_KEY = "cc_notifications_deleted";

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore quota errors */
  }
}

export function getReadIds(): Set<string> {
  return readSet(READ_KEY);
}

export function getDeletedIds(): Set<string> {
  return readSet(DELETED_KEY);
}

export function markRead(id: string) {
  const set = getReadIds();
  set.add(id);
  writeSet(READ_KEY, set);
}

export function markAllRead(ids: string[]) {
  const set = getReadIds();
  ids.forEach((id) => set.add(id));
  writeSet(READ_KEY, set);
}

export function deleteOne(id: string) {
  const set = getDeletedIds();
  set.add(id);
  writeSet(DELETED_KEY, set);
}

export function deleteAll(ids: string[]) {
  const set = getDeletedIds();
  ids.forEach((id) => set.add(id));
  writeSet(DELETED_KEY, set);
}

export function clearAllDeletedAndRead() {
  writeSet(READ_KEY, new Set());
  writeSet(DELETED_KEY, new Set());
}
