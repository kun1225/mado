const DATABASE_NAME = 'mado';
const DATABASE_VERSION = 3;

export const STORES = {
  collections: 'collections',
  sources: 'sources',
} as const;

export const SOURCES_COLLECTION_INDEX = 'collectionIds';
const LEGACY_SOURCES_COLLECTION_INDEX = 'collectionId';

function openCurrentDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * v3: a source can sit in many collections and gains name, url, note and tags.
 * Runs inside the upgrade transaction, so it is all-or-nothing.
 */
function migrateSourcesToV3(sources: IDBObjectStore) {
  if (sources.indexNames.contains(LEGACY_SOURCES_COLLECTION_INDEX)) {
    sources.deleteIndex(LEGACY_SOURCES_COLLECTION_INDEX);
  }

  sources.createIndex(SOURCES_COLLECTION_INDEX, 'collectionIds', {
    multiEntry: true,
  });

  sources.openCursor().onsuccess = (cursorEvent) => {
    const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue | null>)
      .result;

    if (!cursor) return;

    const { collectionId, ...rest } = cursor.value as Record<
      string,
      unknown
    > & {
      collectionId?: string | null;
      fileName: string;
    };

    cursor.update({
      ...rest,
      collectionIds: collectionId ? [collectionId] : [],
      name: rest.fileName.replace(/\.[^.]+$/, '') || rest.fileName,
      url: null,
      note: null,
      tags: [],
    });
    cursor.continue();
  };
}

let databasePromise: Promise<IDBDatabase> | undefined;

export function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      const database = request.result;
      const upgrade = request.transaction;

      if (!database.objectStoreNames.contains(STORES.collections)) {
        database.createObjectStore(STORES.collections, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.sources)) {
        const sources = database.createObjectStore(STORES.sources, {
          keyPath: 'id',
        });
        sources.createIndex(SOURCES_COLLECTION_INDEX, 'collectionIds', {
          multiEntry: true,
        });
      } else if (upgrade && event.oldVersion < 3) {
        migrateSourcesToV3(upgrade.objectStore(STORES.sources));
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      if (request.error?.name === 'VersionError') {
        openCurrentDatabase().then(resolve, reject);
        return;
      }

      reject(request.error);
    };
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
