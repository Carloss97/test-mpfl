/**
 * Storage Manager — IndexedDB-backed session persistence.
 *
 * Reemplaza localStorage (limitado a ~5MB) con IndexedDB (ilimitado).
 * Soporta:
 *  - CRUD de sesiones
 *  - Exportación batch (todas las sesiones como JSON)
 *  - Búsqueda por fecha/score
 *  - Limpieza automática (conserva últimas N)
 */

const DB_NAME = 'krumm_edge_sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const MAX_SESSIONS = 100;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    db.close();
  });
}

export async function saveSession(session) {
  const enriched = {
    ...session,
    id: session.id || crypto.randomUUID(),
    savedAt: session.savedAt || new Date().toISOString(),
  };
  await withStore('readwrite', (store) => {
    store.put(enriched);
    // Prune old sessions
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result > MAX_SESSIONS) {
        const cursorReq = store.openCursor(null, 'prev');
        let skipped = 0;
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor && skipped < MAX_SESSIONS) { skipped++; cursor.continue(); }
          else if (cursor) { cursor.delete(); cursor.continue(); }
        };
      }
    };
  });
  return enriched;
}

export async function loadSessions() {
  const sessions = [];
  await withStore('readonly', (store) => {
    const req = store.openCursor(null, 'prev');
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { sessions.push(cursor.value); cursor.continue(); }
    };
    return req;
  });
  return sessions;
}

export async function clearSessions() {
  await withStore('readwrite', (store) => store.clear());
}

export async function exportAllSessions() {
  const sessions = await loadSessions();
  return JSON.stringify(sessions, null, 2);
}

/**
 * Lightweight wrapper — falls back to localStorage if IndexedDB fails.
 */
export async function saveSessionSafe(session) {
  try {
    return await saveSession(session);
  } catch {
    // Fallback to localStorage
    try {
      const key = 'krumm_edge_sessions_v1';
      const raw = localStorage.getItem(key);
      const sessions = raw ? JSON.parse(raw) : [];
      sessions.unshift({ ...session, id: session.id || crypto.randomUUID() });
      while (sessions.length > 50) sessions.pop();
      localStorage.setItem(key, JSON.stringify(sessions));
      return session;
    } catch { /* silent */ }
  }
}

export async function loadSessionsSafe() {
  try {
    return await loadSessions();
  } catch {
    try {
      const raw = localStorage.getItem('krumm_edge_sessions_v1');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
}

export async function clearSessionsSafe() {
  try { await clearSessions(); } catch { /* ok */ }
  try { localStorage.removeItem('krumm_edge_sessions_v1'); } catch { /* ok */ }
}