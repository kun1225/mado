import {
  collectBranchIds,
  countSourcesByCollection,
  softDeleteSourcesInCollection,
} from '#/features/sources/source-actions';
import type { Source } from '#/features/sources/source-types';
import { withLibraryLock } from '#/features/storage/library-lock';
import { getLibraryStore } from '#/features/storage/library-store';

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
  const collections = (await getLibraryStore().listCollections()).map(
    normalizeCollection,
  );
  await finishPendingDeletes(collections);
  const counts = await countSourcesByCollection(options);

  return collections
    .filter(isLive)
    .map((collection) => ({
      ...collection,
      saveCount: counts.get(collection.id) ?? 0,
    }))
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export async function fetchCollection(
  id: string,
  options: CollectionSourceOptions = WITH_FOLDER_SOURCES,
): Promise<Collection | null> {
  const collection = await getLiveCollection(id);

  if (!collection) return null;

  const counts = await countSourcesByCollection(options);

  return { ...collection, saveCount: counts.get(id) ?? 0 };
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
    deletedAt: null,
  };

  if (collection.parentId) {
    const parent = await getLiveCollection(collection.parentId);

    if (!parent)
      throw new Error(`Collection not found: ${collection.parentId}`);
  }

  await getLibraryStore().putCollections([collection]);

  return collection;
}

export async function updateCollection(
  id: string,
  rawInput: UpdateCollectionInput,
): Promise<Collection> {
  const input = withoutUndefined(updateCollectionSchema.parse(rawInput));
  const collection = await withLibraryLock(async () => {
    const existing = await getLiveCollection(id);

    if (!existing) throw new Error(`Collection not found: ${id}`);

    const isColorOnly = Object.keys(input).every((key) => key === 'color');
    const updated: Collection = {
      ...existing,
      ...input,
      // Lists sort by updatedAt, so a recolored card would jump away.
      updatedAt: isColorOnly ? existing.updatedAt : new Date().toISOString(),
    };

    await getLibraryStore().putCollections([updated]);
    return updated;
  });

  const counts = await countSourcesByCollection();

  return { ...collection, saveCount: counts.get(id) ?? 0 };
}

/**
 * A collection cannot be restored, so its sources go to the trash on their own
 * and can come back to the library. Child collections and their sources go too.
 *
 * The collections are marked first, in one write, and the sources are trashed
 * after. A crash in between is finished by `finishPendingDeletes`.
 */
export async function deleteCollection(id: string): Promise<Collection> {
  const { existing, branchIds } = await withLibraryLock(() =>
    markBranchDeleted(id),
  );

  // One branch at a time: a source in two branches must see the first change before the second.
  for (const branchId of branchIds) {
    await softDeleteSourcesInCollection(branchId);
  }

  return existing;
}

// *** markBranchDeleted ***
async function markBranchDeleted(id: string) {
  const existing = await getLiveCollection(id);

  if (!existing) throw new Error(`Collection not found: ${id}`);

  const store = getLibraryStore();
  const live = (await store.listCollections())
    .map(normalizeCollection)
    .filter(isLive);
  const branchIds = new Set(collectBranchIds(live, id));
  const now = new Date().toISOString();

  await store.putCollections(
    live
      .filter((collection) => branchIds.has(collection.id))
      .map((collection) => ({ ...collection, deletedAt: now, updatedAt: now })),
  );

  return { existing, branchIds: [...branchIds] };
}

// *** finishPendingDeletes ***
// One read of the sources, so a library with many old tombstones stays fast.
async function finishPendingDeletes(collections: Collection[]): Promise<void> {
  const deletedIds = new Set(
    collections.filter((collection) => !isLive(collection)).map(({ id }) => id),
  );
  if (deletedIds.size === 0) return;

  const sources = await getLibraryStore().listSources();
  const pendingIds = new Set(
    sources
      .flatMap((source) => source.collectionIds)
      .filter((collectionId) => deletedIds.has(collectionId)),
  );

  for (const collectionId of pendingIds) {
    await softDeleteSourcesInCollection(collectionId);
  }
}

// *** getLiveCollection ***
async function getLiveCollection(id: string): Promise<Collection | undefined> {
  const collection = await getLibraryStore().getCollection(id);

  if (!collection) return undefined;

  const normalized = normalizeCollection(collection);
  return isLive(normalized) ? normalized : undefined;
}

// *** isLive ***
function isLive(collection: Collection): boolean {
  return collection.deletedAt === null;
}

// *** withoutUndefined ***
/** zod keeps a key set to `undefined`, and spreading it would erase the saved value. */
function withoutUndefined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

// *** normalizeCollection ***
/** Records saved before colors or tombstones existed have no `color` or `deletedAt` field. */
function normalizeCollection(collection: Collection): Collection {
  return {
    ...collection,
    color: collection.color ?? null,
    deletedAt: collection.deletedAt ?? null,
  };
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
