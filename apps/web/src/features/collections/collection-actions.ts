import {
  collectBranchIds,
  countSourcesByCollection,
  softDeleteSourcesInCollection,
} from '#/features/sources/source-actions';
import type { Source } from '#/features/sources/source-types';
import {
  openDatabase,
  STORES,
  toCompletion,
  toPromise,
} from '#/features/storage/database';

import type {
  Collection,
  CollectionSourceOptions,
  CreateCollectionInput,
  UpdateCollectionInput,
} from './collection-types';
import {
  updateCollectionSchema,
  WITH_FOLDER_SOURCES,
} from './collection-types';

export async function fetchAllCollections(
  options: CollectionSourceOptions = WITH_FOLDER_SOURCES,
): Promise<Collection[]> {
  const database = await openDatabase();
  const collections = await toPromise<Collection[]>(
    database
      .transaction(STORES.collections, 'readonly')
      .objectStore(STORES.collections)
      .getAll(),
  );
  const counts = await countSourcesByCollection(options);

  return collections
    .map((collection) => ({
      ...normalizeCollection(collection),
      saveCount: counts.get(collection.id) ?? 0,
    }))
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export async function fetchCollection(
  id: string,
  options: CollectionSourceOptions = WITH_FOLDER_SOURCES,
): Promise<Collection | null> {
  const database = await openDatabase();
  const collection = await toPromise<Collection | undefined>(
    database
      .transaction(STORES.collections, 'readonly')
      .objectStore(STORES.collections)
      .get(id),
  );

  if (!collection) return null;

  const counts = await countSourcesByCollection(options);

  return { ...normalizeCollection(collection), saveCount: counts.get(id) ?? 0 };
}

export async function createCollection(
  input: CreateCollectionInput = {},
): Promise<Collection> {
  const now = new Date().toISOString();
  const collection: Collection = {
    id: crypto.randomUUID(),
    name: input.name ?? 'New collection',
    parentId: input.parentId ?? null,
    color: null,
    saveCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const database = await openDatabase();
  const transaction = database.transaction(STORES.collections, 'readwrite');
  const store = transaction.objectStore(STORES.collections);

  if (collection.parentId) {
    const parent = await toPromise<Collection | undefined>(
      store.get(collection.parentId),
    );

    if (!parent) {
      transaction.abort();
      throw new Error(`Collection not found: ${collection.parentId}`);
    }
  }

  store.put(collection);
  await toCompletion(transaction);

  return collection;
}

export async function updateCollection(
  id: string,
  rawInput: UpdateCollectionInput,
): Promise<Collection> {
  const input = withoutUndefined(updateCollectionSchema.parse(rawInput));
  const database = await openDatabase();
  const transaction = database.transaction(STORES.collections, 'readwrite');
  const store = transaction.objectStore(STORES.collections);

  const existing = await toPromise<Collection | undefined>(store.get(id));

  if (!existing) throw new Error(`Collection not found: ${id}`);

  const isColorOnly = Object.keys(input).every((key) => key === 'color');
  const collection: Collection = {
    ...normalizeCollection(existing),
    ...input,
    // Lists sort by updatedAt, so a recolored card would jump away.
    updatedAt: isColorOnly ? existing.updatedAt : new Date().toISOString(),
  };

  store.put(collection);
  await toCompletion(transaction);

  const counts = await countSourcesByCollection();

  return { ...collection, saveCount: counts.get(id) ?? 0 };
}

/**
 * A collection cannot be restored, so its sources go to the trash on their own
 * and can come back to the library. Child collections and their sources go too.
 */
export async function deleteCollection(id: string): Promise<Collection> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [STORES.collections, STORES.sources],
    'readwrite',
  );
  const store = transaction.objectStore(STORES.collections);

  const existing = await toPromise<Collection | undefined>(store.get(id));

  if (!existing) throw new Error(`Collection not found: ${id}`);

  const all = await toPromise<Collection[]>(store.getAll());

  for (const branchId of collectBranchIds(all, id)) {
    await softDeleteSourcesInCollection(
      transaction.objectStore(STORES.sources),
      branchId,
    );
    store.delete(branchId);
  }

  await toCompletion(transaction);

  return existing;
}

// *** withoutUndefined ***
/** zod keeps a key set to `undefined`, and spreading it would erase the saved value. */
function withoutUndefined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

// *** normalizeCollection ***
/** Records saved before colors existed have no `color` field. */
function normalizeCollection(collection: Collection): Collection {
  return { ...collection, color: collection.color ?? null };
}

const PREVIEW_COUNT = 3;

/** A folder card picks from the same sources as its page, so the two always match. */
export function pickPreviewSources(
  collections: Collection[],
  sources: Source[],
  collectionId: string,
  { includeFolders }: CollectionSourceOptions = WITH_FOLDER_SOURCES,
): Source[] {
  const ids = new Set(
    includeFolders
      ? collectBranchIds(collections, collectionId)
      : [collectionId],
  );

  return sources
    .filter((source) => source.collectionIds.some((id) => ids.has(id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, PREVIEW_COUNT);
}
