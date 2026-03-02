import { useEffect } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'trimers-offline';
const STORE = 'pending';

export async function getOfflineDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

export function useOfflineSync() {
  useEffect(() => {
    const sync = async () => {
      if (!navigator.onLine) return;
      try {
        const db = await getOfflineDb();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const pending = await store.getAll();
        for (const p of pending) {
          try {
            const res = await fetch(p.url, p.opts);
            if (res.ok) await store.delete(p.id);
          } catch {}
        }
        await tx.done;
      } catch {}
    };

    window.addEventListener('online', sync);
    sync();
    return () => window.removeEventListener('online', sync);
  }, []);
}
