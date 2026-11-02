import type { Collection } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';

import {
  openDatabase,
  SOURCES_COLLECTION_INDEX,
  STORES,
  toCompletion,
  toPromise,
} from './database';
import type { LibraryStore } from './library-store.type';

/** The web app's records, in the browser's IndexedDB. */
export const indexedDbLibraryStore: LibraryStore = {
  listCollections: () => readAll<Collection>(STORES.collections),
  getCollection: (id) => readOne<Collection>(STORES.collections, id),
  putCollections: (collections) => writeAll(STORES.collections, collections),
  deleteCollections: (ids) => removeAll(STORES.collections, ids),

  listSources: () => readAll<Source>(STORES.sources),
  getSource: (id) => readOne<Source>(STORES.sources, id),
  listSourcesInCollection,
  addSource,
  putSources: (sources) => writeAll(STORES.sources, sources),
  deleteSources: (ids) => removeAll(STORES.sources, ids),
};

// *** listSourcesInCollection ***
async function listSourcesInCollection(
  collectionId: string,
): Promise<Source[]> {
  const database = await openDatabase();

  return toPromise<Source[]>(
    database
      .transaction(STORES.sources, 'readonly')
      .objectStore(STORES.sources)
      .index(SOURCES_COLLECTION_INDEX)
      .getAll(collectionId),
  );
}

// *** addSource ***
async function addSource(source: Source): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');

  // `add`, not `put`: another tab may have saved this id since we checked.
  transaction.objectStore(STORES.sources).add(source);
  await toCompletion(transaction);
}

// *** readAll ***
async function readAll<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase();

  return toPromise<T[]>(
    database.transaction(storeName, 'readonly').objectStore(storeName).getAll(),
  );
}

// *** readOne ***
async function readOne<T>(
  storeName: string,
  id: string,
): Promise<T | undefined> {
  const database = await openDatabase();

  return toPromise<T | undefined>(
    database.transaction(storeName, 'readonly').objectStore(storeName).get(id),
  );
}

// *** writeAll ***
// One transaction, so all of them are saved or none are.
async function writeAll<T>(storeName: string, records: T[]): Promise<void> {
  if (records.length === 0) return;

  const database = await openDatabase();
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);

  for (const record of records) store.put(record);
  await toCompletion(transaction);
}

// *** removeAll ***
async function removeAll(storeName: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const database = await openDatabase();
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);

  for (const id of ids) store.delete(id);
  await toCompletion(transaction);
}
