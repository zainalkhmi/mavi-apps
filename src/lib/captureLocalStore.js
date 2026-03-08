const DB_NAME = 'mavi-capture-db';
const DB_VERSION = 1;
const STORE_NAME = 'capture_events';

const hasIndexedDb = () => typeof window !== 'undefined' && 'indexedDB' in window;

const requestToPromise = (request) => {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
};

const openDb = () => {
    if (!hasIndexedDb()) {
        return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    });
};

export const enqueueCaptureEvent = async (payload) => {
    const db = await openDb();
    if (!db) return null;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record = {
        payload,
        status: 'pending',
        attempts: 0,
        lastError: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastTriedAt: null,
        syncedAt: null
    };

    return requestToPromise(store.add(record));
};

export const getPendingCaptureEvents = async (limit = 25) => {
    const db = await openDb();
    if (!db) return [];

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const pending = await requestToPromise(index.getAll('pending'));

    return pending
        .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
        .slice(0, limit);
};

export const listCaptureEvents = async (limit = 100) => {
    const db = await openDb();
    if (!db) return [];

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all = await requestToPromise(store.getAll());

    return (all || [])
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
        .slice(0, limit);
};

export const removeCaptureEvent = async (id) => {
    if (!id) return;

    const db = await openDb();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await requestToPromise(store.delete(id));
};

export const clearSyncedCaptureEvents = async () => {
    const db = await openDb();
    if (!db) return 0;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const syncedRows = await requestToPromise(index.getAll('synced'));

    for (const row of syncedRows || []) {
        await requestToPromise(store.delete(row.id));
    }

    return syncedRows?.length || 0;
};

export const markCaptureEventSynced = async (id) => {
    if (!id) return;

    const db = await openDb();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const existing = await requestToPromise(store.get(id));
    if (!existing) return;

    existing.status = 'synced';
    existing.lastError = null;
    existing.syncedAt = Date.now();
    existing.lastTriedAt = Date.now();
    existing.updatedAt = Date.now();

    await requestToPromise(store.put(existing));
};

export const keepCaptureEventPending = async (id, errorMessage = '') => {
    if (!id) return;

    const db = await openDb();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const existing = await requestToPromise(store.get(id));
    if (!existing) return;

    existing.status = 'pending';
    existing.attempts = Number(existing.attempts || 0) + 1;
    existing.lastError = errorMessage || null;
    existing.lastTriedAt = Date.now();
    existing.updatedAt = Date.now();

    await requestToPromise(store.put(existing));
};
