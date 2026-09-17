import { countSourcesByCollection } from '#/features/sources/source-actions';
import {
  openDatabase,
  STORES,
  toCompletion,
  toPromise,
} from '#/features/storage/database';

import type {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
} from './collection-types';

export async function fetchAllCollections(): Promise<Collection[]> {
  const database = await openDatabase();
  const collections = await toPromise<Collection[]>(
    database
      .transaction(STORES.collections, 'readonly')
      .objectStore(STORES.collections)
      .getAll(),
  );
  const counts = await countSourcesByCollection();

  return collections
    .map((collection) => ({
      ...collection,
      saveCount: counts.get(collection.id) ?? 0,
    }))
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export async function fetchCollection(id: string): Promise<Collection | null> {
  const database = await openDatabase();
  const collection = await toPromise<Collection | undefined>(
    database
      .transaction(STORES.collections, 'readonly')
      .objectStore(STORES.collections)
      .get(id),
  );

  if (!collection) return null;

  const counts = await countSourcesByCollection();

  return { ...collection, saveCount: counts.get(id) ?? 0 };
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
  const transaction = database.transaction(STORES.collections, 'readwrite');

  transaction.objectStore(STORES.collections).put(collection);
  await toCompletion(transaction);

  return collection;
}

export async function updateCollection(
  id: string,
  input: UpdateCollectionInput,
): Promise<Collection> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.collections, 'readwrite');
  const store = transaction.objectStore(STORES.collections);

  const existing = await toPromise<Collection | undefined>(store.get(id));

  if (!existing) throw new Error(`Collection not found: ${id}`);

  const collection: Collection = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  store.put(collection);
  await toCompletion(transaction);

  const counts = await countSourcesByCollection();

  return { ...collection, saveCount: counts.get(id) ?? 0 };
}
