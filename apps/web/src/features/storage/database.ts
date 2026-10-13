import { getStorageAccount } from './storage-account';

const DATABASE_NAME = 'mado';
const DATABASE_VERSION = 3;

export const STORES = {
  collections: 'collections',
  sources: 'sources',
} as const;

export const SOURCES_COLLECTION_INDEX = 'collectionIds';
const LEGACY_SOURCES_COLLECTION_INDEX = 'collectionId';

const databases = new Map<string, Promise<IDBDatabase>>();

export function openDatabase(): Promise<IDBDatabase> {
  const name = getDatabaseName();
  const existing = databases.get(name);
  if (existing) return existing;

  const databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, DATABASE_VERSION);

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
        openCurrentDatabase(name).then(resolve, reject);
        return;
      }

      reject(request.error);
    };
  });

  databases.set(name, databasePromise);
  void databasePromise.catch(() => databases.delete(name));
  return databasePromise;
}

// *** getDatabaseName ***
function getDatabaseName() {
  const account = getStorageAccount();
  return account ? `${DATABASE_NAME}:account:${account}` : DATABASE_NAME;
}

/**
 * v3: a source can sit in many collections and gains name, url, note and tags.
 * Runs inside the upgrade transaction, so it is all-or-nothing.
 */
// *** migrateSourcesToV3 ***
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

// *** openCurrentDatabase ***
function openCurrentDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
