import {
  openDatabase,
  SOURCES_COLLECTION_INDEX,
  STORES,
  toCompletion,
  toPromise,
} from '#/features/storage/database';

import {
  compressMedia,
  deleteMediaFile,
  readMediaFile,
  writeMediaFile,
} from './source-media';
import type {
  NewSourceInput,
  Source,
  SourceKind,
  UpdateSourceInput,
} from './source-types';
import {
  newSourceSchema,
  sourceKindSchema,
  tagsSchema,
  updateSourceSchema,
} from './source-types';

type MediaMetadata = Pick<Source, 'width' | 'height' | 'durationSeconds'>;

const UNKNOWN_METADATA: MediaMetadata = {
  width: null,
  height: null,
  durationSeconds: null,
};

/**
 * Metadata is a nice-to-have, so a file the browser cannot decode still gets
 * stored — it just keeps null dimensions.
 */
async function readMediaMetadata(
  file: File,
  kind: SourceKind,
): Promise<MediaMetadata> {
  const url = URL.createObjectURL(file);

  return new Promise<MediaMetadata>((resolve) => {
    if (kind === 'image') {
      const image = new Image();
      image.onload = () =>
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
          durationSeconds: null,
        });
      image.onerror = () => resolve(UNKNOWN_METADATA);
      image.src = url;
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () =>
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationSeconds: Number.isFinite(video.duration)
          ? video.duration
          : null,
      });
    video.onerror = () => resolve(UNKNOWN_METADATA);
    video.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

export async function createSource(input: NewSourceInput): Promise<Source> {
  const { collectionId, file } = newSourceSchema.parse(input);
  const kind = sourceKindSchema.parse(file.type.split('/')[0]);
  const metadata = await readMediaMetadata(file, kind);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const source: Source = {
    id,
    name: file.name.replace(/\.[^.]+$/, '') || file.name,
    url: null,
    note: null,
    tags: [],
    collectionIds: collectionId ? [collectionId] : [],
    kind,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    ...metadata,
    storageKey: id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await writeMediaFile(source.storageKey, file);

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORES.sources, 'readwrite');

    transaction.objectStore(STORES.sources).put(source);
    await toCompletion(transaction);
  } catch (error) {
    await deleteMediaFile(source.storageKey);
    throw new Error(`Failed to save "${file.name}".`, { cause: error });
  }

  return source;
}

/**
 * Saves each file on its own, so one bad file does not lose the others.
 */
export async function createSources(
  inputs: NewSourceInput[],
): Promise<{ sources: Source[]; error: unknown }> {
  const results = await Promise.allSettled(inputs.map(createSource));
  const sources = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
  const failed = results.find((result) => result.status === 'rejected');

  return { sources, error: failed?.reason };
}

// Compression is heavy, so each file waits for the previous file to finish.
let previousTask: Promise<unknown> = Promise.resolve();
export function compressSource(source: Source): Promise<Source> {
  const currentTask = previousTask.then(() => {
    return runCompression(source);
  });

  // Keep the queue usable after failure, while returning the real error to the caller.
  previousTask = currentTask.catch(() => undefined);

  return currentTask;
}

// *** runCompression ***
async function runCompression(source: Source): Promise<Source> {
  const stored = await readMediaFile(source.storageKey);
  // OPFS does not keep MIME type or name, and the compressor needs both.
  const original = new File([stored], source.fileName, {
    type: source.mimeType,
  });
  const compressed = await compressMedia(original);

  if (compressed === original) return source;

  const metadata = await readMediaMetadata(compressed, source.kind);

  await writeMediaFile(source.storageKey, compressed);

  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');
  const store = transaction.objectStore(STORES.sources);
  const existing = await toPromise<Source | undefined>(store.get(source.id));

  if (!existing) {
    // Deleted for good while compressing: the new file would be left behind.
    await deleteMediaFile(source.storageKey);
    return source;
  }

  const updated: Source = {
    ...existing,
    fileName: compressed.name,
    mimeType: compressed.type,
    sizeBytes: compressed.size,
    ...metadata,
    updatedAt: new Date().toISOString(),
  };

  store.put(updated);
  await toCompletion(transaction);

  return updated;
}

function toVisibleSources(sources: Source[]): Source[] {
  return sources
    .filter((source) => source.deletedAt === null)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function fetchSourcesByCollection(
  collectionId: string,
): Promise<Source[]> {
  const database = await openDatabase();
  const sources = await toPromise<Source[]>(
    database
      .transaction(STORES.sources, 'readonly')
      .objectStore(STORES.sources)
      .index(SOURCES_COLLECTION_INDEX)
      .getAll(collectionId),
  );

  return toVisibleSources(sources);
}

export async function fetchAllSources(): Promise<Source[]> {
  const database = await openDatabase();
  const sources = await toPromise<Source[]>(
    database
      .transaction(STORES.sources, 'readonly')
      .objectStore(STORES.sources)
      .getAll(),
  );

  return toVisibleSources(sources);
}

export async function fetchDeletedSources(): Promise<Source[]> {
  const database = await openDatabase();
  const sources = await toPromise<Source[]>(
    database
      .transaction(STORES.sources, 'readonly')
      .objectStore(STORES.sources)
      .getAll(),
  );

  return sources
    .filter((source) => source.deletedAt !== null)
    .sort((first, second) =>
      (second.deletedAt ?? '').localeCompare(first.deletedAt ?? ''),
    );
}

export async function countSourcesByCollection(): Promise<Map<string, number>> {
  const sources = await fetchAllSources();

  return sources.reduce((counts, source) => {
    for (const id of source.collectionIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, new Map<string, number>());
}

/**
 * Edits the user-facing fields. Only the keys in `input` change.
 */
export async function updateSource(
  id: string,
  input: UpdateSourceInput,
): Promise<Source> {
  const {
    addTags,
    removeTags,
    addCollectionIds,
    removeCollectionIds,
    ...fields
  } = updateSourceSchema.parse(input);
  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');
  const store = transaction.objectStore(STORES.sources);

  const existing = await toPromise<Source | undefined>(store.get(id));

  if (!existing) throw new Error(`Source not found: ${id}`);

  const merged = { ...existing, ...fields };
  const source: Source = {
    ...merged,
    tags: tagsSchema.parse(applyListChange(merged.tags, addTags, removeTags)),
    collectionIds: applyListChange(
      merged.collectionIds,
      addCollectionIds,
      removeCollectionIds,
    ),
    updatedAt: new Date().toISOString(),
  };

  store.put(source);
  await toCompletion(transaction);

  return source;
}

function applyListChange(
  current: string[],
  add: string[] = [],
  remove: string[] = [],
): string[] {
  const removed = new Set(remove);

  return [...new Set([...current, ...add])].filter(
    (item) => !removed.has(item),
  );
}

/**
 * Soft delete: the OPFS file stays so a future Deleted tab can restore it.
 */
export async function deleteSource(id: string): Promise<Source> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');
  const store = transaction.objectStore(STORES.sources);

  const existing = await toPromise<Source | undefined>(store.get(id));

  if (!existing) throw new Error(`Source not found: ${id}`);

  const now = new Date().toISOString();
  const source: Source = { ...existing, deletedAt: now, updatedAt: now };

  store.put(source);
  await toCompletion(transaction);

  return source;
}

/**
 * Hard delete, for a source that is already in the trash: the record and the
 * stored bytes both go, so the caller must confirm with the user first.
 */
export async function hardDeleteSource(id: string): Promise<Source> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');
  const store = transaction.objectStore(STORES.sources);

  const existing = await toPromise<Source | undefined>(store.get(id));

  if (!existing) throw new Error(`Source not found: ${id}`);

  store.delete(id);
  await toCompletion(transaction);

  // The record goes first: a leftover file only wastes space, while a record
  // pointing at missing bytes would show up as a card that never loads.
  await deleteMediaFile(existing.storageKey);

  return existing;
}

/**
 * Detaches a collection from its sources, inside the caller's transaction so
 * the collection and its sources change together.
 *
 * A source that lived only in this collection goes to the trash, as before.
 * One that is also in another collection just loses this one and stays visible.
 */
export async function softDeleteSourcesInCollection(
  store: IDBObjectStore,
  collectionId: string,
): Promise<void> {
  const sources = await toPromise<Source[]>(
    store.index(SOURCES_COLLECTION_INDEX).getAll(collectionId),
  );
  const now = new Date().toISOString();

  for (const source of sources) {
    const collectionIds = source.collectionIds.filter(
      (id) => id !== collectionId,
    );

    store.put({
      ...source,
      collectionIds,
      deletedAt:
        collectionIds.length === 0
          ? (source.deletedAt ?? now)
          : source.deletedAt,
      updatedAt: now,
    });
  }
}

/**
 * Moves many sources to the trash. One transaction: all of them move, or none.
 */
export async function deleteSources(ids: string[]): Promise<Source[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');
  const store = transaction.objectStore(STORES.sources);

  const found = await Promise.all(
    ids.map((id) => toPromise<Source | undefined>(store.get(id))),
  );
  const now = new Date().toISOString();
  // Skip ids that are already gone, so one missing card does not stop the rest.
  const sources = found
    .filter((source): source is Source => source !== undefined)
    .map((source) => ({ ...source, deletedAt: now, updatedAt: now }));

  for (const source of sources) store.put(source);

  await toCompletion(transaction);

  return sources;
}

/**
 * Brings many sources back out of the trash. Nothing has to be rewritten to
 * OPFS: a soft delete never removed the bytes, so clearing `deletedAt` is the
 * whole restore.
 *
 * A source that was never deleted is left out rather than touched, so its
 * `updatedAt` does not move for no reason.
 */
export async function restoreSources(ids: string[]): Promise<Source[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');
  const store = transaction.objectStore(STORES.sources);

  const found = await Promise.all(
    ids.map((id) => toPromise<Source | undefined>(store.get(id))),
  );
  const now = new Date().toISOString();
  const sources = found
    .filter((source): source is Source => source?.deletedAt != null)
    .map((source) => ({ ...source, deletedAt: null, updatedAt: now }));

  for (const source of sources) store.put(source);

  await toCompletion(transaction);

  return sources;
}

/**
 * Deletes many sources for good. Only for sources already in the trash.
 */
export async function hardDeleteSources(ids: string[]): Promise<Source[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');
  const store = transaction.objectStore(STORES.sources);

  const found = await Promise.all(
    ids.map((id) => toPromise<Source | undefined>(store.get(id))),
  );
  const sources = found.filter(
    (source): source is Source => source !== undefined,
  );

  for (const source of sources) store.delete(source.id);

  // Records first. A file with no record only wastes space, but a record with
  // no file becomes a card that never loads.
  await toCompletion(transaction);

  // Keep going if one file fails, so the other files still get deleted.
  await Promise.all(
    sources.map((source) =>
      deleteMediaFile(source.storageKey).catch((error: unknown) => {
        console.error(
          `Failed to delete media file: ${source.storageKey}`,
          error,
        );
      }),
    ),
  );

  return sources;
}
