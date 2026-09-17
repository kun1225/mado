const DATABASE_NAME = 'mado';
const DATABASE_VERSION = 2;

export const STORES = {
  collections: 'collections',
  sources: 'sources',
} as const;

export const SOURCES_COLLECTION_INDEX = 'collectionId';

let databasePromise: Promise<IDBDatabase> | undefined;

export function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORES.collections)) {
        database.createObjectStore(STORES.collections, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.sources)) {
        const sources = database.createObjectStore(STORES.sources, {
          keyPath: 'id',
        });
        sources.createIndex(SOURCES_COLLECTION_INDEX, 'collectionId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return databasePromise;
}

export function toPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function toCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
