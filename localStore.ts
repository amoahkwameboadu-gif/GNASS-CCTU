/* ==========================================================================
   Local key/value store with a fallback chain.

   1. IndexedDB      — preferred: holds text *and* uploaded image/video blobs.
   2. localStorage   — when IndexedDB is blocked; JSON payloads only.
   3. In-memory map  — last resort when all storage is blocked (e.g. a sandboxed
                       or opaque origin); data then lasts only until reload.

   The original admin portal relied on the Vercel API being up. This store is
   what makes "Local mode" work when that API is unavailable, so it must never
   throw: every failure is absorbed and reported through getStorageInfo().
   ========================================================================== */

export type StorageBackend = 'indexeddb' | 'localstorage' | 'memory';

const DB_NAME = 'gnaas-cctu-local';
const STORE = 'kv';
const VERSION = 1;
const LS_PREFIX = 'gnaas-cctu:';

const memory = new Map<string, unknown>();

let dbPromise: Promise<IDBDatabase | null> | null = null;
let idbUsable: boolean | null = null;
let lsUsable: boolean | null = null;
let backend: StorageBackend = 'memory';
/** True when something could not be persisted (storage blocked / JSON-only limit). */
let volatile = false;

const isJsonSerializable = (value: unknown) => {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
};

/** Blobs, buffers and uploaded-media records can only live in IndexedDB. */
const isBinary = (value: unknown): boolean => {
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value as ArrayBufferView)) return true;
  return typeof value === 'object' && value !== null && '__media' in (value as Record<string, unknown>);
};

/* ---------- IndexedDB ---------- */
function openDb(): Promise<IDBDatabase | null> {
  if (idbUsable === false) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      if (typeof indexedDB === 'undefined' || !indexedDB) throw new Error('IndexedDB unavailable');
      request = indexedDB.open(DB_NAME, VERSION);
    } catch {
      idbUsable = false;
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (db: IDBDatabase | null) => {
      if (settled) return;
      settled = true;
      idbUsable = db !== null;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      try {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      } catch {
        /* ignore */
      }
    };
    request.onsuccess = () => finish(request.result);
    // SecurityError (blocked storage), quota errors, blocked upgrades…
    request.onerror = () => finish(null);
    request.onblocked = () => finish(null);
  });

  return dbPromise;
}

function idbRequest<T>(db: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error ?? new Error('Local database request failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Local database transaction aborted'));
    } catch (error) {
      reject(error);
    }
  });
}

/* ---------- localStorage ---------- */
function lsAvailable(): boolean {
  if (lsUsable !== null) return lsUsable;
  try {
    const probe = `${LS_PREFIX}__probe__`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    lsUsable = true;
  } catch {
    lsUsable = false;
  }
  return lsUsable;
}

function lsRead<T>(key: string): T | undefined {
  if (!lsAvailable()) return undefined;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

function lsWrite(key: string, value: unknown): boolean {
  if (!lsAvailable()) return false;
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded or serialization problem
    return false;
  }
}

function lsRemove(key: string) {
  if (!lsAvailable()) return;
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    /* ignore */
  }
}

/* ==========================================================================
   Public API
   ========================================================================== */

export function getStorageInfo(): { backend: StorageBackend; volatile: boolean } {
  return { backend, volatile };
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  if (db) {
    try {
      const value = await idbRequest<T | undefined>(db, 'readonly', (store) => store.get(key));
      backend = 'indexeddb';
      if (value !== undefined) return value;
      // Nothing in IDB — a value may still live in another backend from an earlier run
      if (memory.has(key)) return memory.get(key) as T;
      const ls = lsRead<T>(key);
      if (ls !== undefined) backend = 'localstorage';
      return ls;
    } catch {
      idbUsable = false;
    }
  }

  if (memory.has(key)) return memory.get(key) as T;
  const ls = lsRead<T>(key);
  if (ls !== undefined) {
    backend = 'localstorage';
    return ls;
  }
  return undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  // Always keep a copy in memory so the current page sees its own writes.
  memory.set(key, value);

  const db = await openDb();
  if (db) {
    try {
      await idbRequest<IDBValidKey>(db, 'readwrite', (store) => store.put(value, key));
      backend = 'indexeddb';
      return;
    } catch {
      idbUsable = false;
      dbPromise = null;
    }
  }

  if (isBinary(value)) {
    // Uploaded media cannot be JSON-encoded — it can only live in IndexedDB.
    volatile = true;
    return;
  }

  if (isJsonSerializable(value) && lsWrite(key, value)) {
    if (backend !== 'indexeddb') backend = 'localstorage';
    return;
  }

  volatile = true;
}

export async function kvDelete(key: string): Promise<void> {
  memory.delete(key);
  lsRemove(key);
  const db = await openDb();
  if (!db) return;
  try {
    await idbRequest<undefined>(db, 'readwrite', (store) => store.delete(key));
  } catch {
    idbUsable = false;
  }
}

/** Clears everything this app stored locally (used by the admin "Reset" action). */
export async function kvClearAll(): Promise<void> {
  memory.clear();
  try {
    // Iterate with the standard Storage API (Object.keys does not list stored keys reliably)
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LS_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
  const db = await openDb();
  if (!db) return;
  try {
    await idbRequest<undefined>(db, 'readwrite', (store) => store.clear());
  } catch {
    idbUsable = false;
  }
}
