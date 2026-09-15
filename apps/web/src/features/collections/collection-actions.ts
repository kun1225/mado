import type {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
} from './collection-types';

const DATABASE_NAME = 'mado';
const DATABASE_VERSION = 1;
const COLLECTIONS_STORE = 'collections';

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(COLLECTIONS_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return databasePromise;
}

export async function fetchAllCollections(): Promise<Collection[]> {
  const database = await openDatabase();
  const request = database
    .transaction(COLLECTIONS_STORE, 'readonly')
    .objectStore(COLLECTIONS_STORE)
    .getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () =>
      resolve(
        request.result.sort((first, second) =>
          second.updatedAt.localeCompare(first.updatedAt),
        ),
      );
    request.onerror = () => reject(request.error);
  });
}

export async function fetchCollection(id: string): Promise<Collection | null> {
  const database = await openDatabase();
  const request = database
    .transaction(COLLECTIONS_STORE, 'readonly')
    .objectStore(COLLECTIONS_STORE)
    .get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function createCollection(
  input: CreateCollectionInput = {},
): Promise<Collection> {
  const now = new Date().toISOString();
  const collection: Collection = {
    id: crypto.randomUUID(),
    name: input.name ?? 'New collection',
    saveCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(COLLECTIONS_STORE, 'readwrite');
    transaction.objectStore(COLLECTIONS_STORE).put(collection);
    transaction.oncomplete = () => resolve(collection);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function updateCollection(
  id: string,
  input: UpdateCollectionInput,
): Promise<Collection> {
  const database = await openDatabase();

  const transaction = database.transaction(COLLECTIONS_STORE, 'readwrite');
  const store = transaction.objectStore(COLLECTIONS_STORE);

  const existing = await new Promise<Collection | undefined>(
    (resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    },
  );

  if (!existing) throw new Error(`Collection not found: ${id}`);

  const collection: Collection = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  store.put(collection);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(collection);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
