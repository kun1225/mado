import type { Collection } from '#/features/collections/collection-types';
import {
  openDatabase,
  SOURCES_COLLECTION_INDEX,
  STORES,
  toCompletion,
  toPromise,
} from '#/features/storage/database';

import type { SiteSourceInput } from './site-source.type';
import {
  compressMedia,
  deleteMediaFile,
  downloadSiteVideo,
  fetchSiteImage,
  fetchSitePreview,
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
  canEmbedSite,
  MAX_NAME_LENGTH,
  newSourceSchema,
  newWebsiteSourceSchema,
  replaceSourceFileSchema,
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

/** Metadata is a bonus, so a file the browser cannot read is still saved, just without a size. */
async function readMediaMetadata(
  file: File,
  kind: Exclude<SourceKind, 'website'>,
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
  const { collectionId, file, name, url } = newSourceSchema.parse(input);
  const kind = sourceKindSchema.parse(file.type.split('/')[0]);
  const metadata = await readMediaMetadata(file, kind);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const source: Source = {
    id,
    name: (name ?? (file.name.replace(/\.[^.]+$/, '') || file.name)).slice(
      0,
      MAX_NAME_LENGTH,
    ),
    url: url ?? null,
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

  await writeMediaFile(id, file);

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORES.sources, 'readwrite');

    transaction.objectStore(STORES.sources).put(source);
    await toCompletion(transaction);
  } catch (error) {
    await deleteMediaFile(id);
    throw new Error(`Failed to save "${file.name}".`, { cause: error });
  }

  return source;
}

// *** createWebsiteSource ***
export async function createWebsiteSource(
  input: SiteSourceInput,
): Promise<Source> {
  const { collectionId, url } = newWebsiteSourceSchema.parse(input);
  const preview = await fetchSitePreview(url);
  // A post that cannot be embedded (X) is worth more as its video than as a link card.
  if (preview.video) {
    const video = await downloadSiteVideo(preview.video.url).catch(() => null);
    if (video) {
      return createSource({
        collectionId,
        file: video,
        name: preview.video.title,
        url: preview.url,
      });
    }
  }
  // The cover is optional: without it, the card shows the site name as text.
  const cover = preview.ogImage
    ? await fetchSiteImage(preview.ogImage).catch(() => null)
    : null;
  const metadata = cover
    ? await readMediaMetadata(cover, 'image')
    : UNKNOWN_METADATA;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const source: Source = {
    id,
    name: (preview.title ?? preview.domain).slice(0, MAX_NAME_LENGTH),
    url: preview.finalUrl,
    note: null,
    tags: [],
    collectionIds: collectionId ? [collectionId] : [],
    kind: 'website',
    site: preview,
    fileName: cover?.name ?? '',
    mimeType: cover?.type ?? '',
    sizeBytes: cover?.size ?? 0,
    ...metadata,
    storageKey: cover ? id : null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  try {
    if (cover) await writeMediaFile(id, cover);
    const database = await openDatabase();
    const transaction = database.transaction(STORES.sources, 'readwrite');
    transaction.objectStore(STORES.sources).put(source);
    await toCompletion(transaction);
  } catch (error) {
    if (cover) await deleteMediaFile(id);
    throw new Error(`Failed to save "${source.name}".`, { cause: error });
  }

  return source;
}

/** Save each file on its own, so one bad file does not lose the others. */
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

// Compression is heavy, so files wait in line one at a time.
let previousTask: Promise<unknown> = Promise.resolve();
export function compressSource(source: Source): Promise<Source> {
  if (!source.storageKey) return Promise.resolve(source);
  const currentTask = previousTask.then(() => {
    return runCompression(source);
  });

  // Swallow the error here so the next task still runs. The caller still gets it.
  previousTask = currentTask.catch(() => undefined);

  return currentTask;
}

/** Resolves once every compression queued so far has finished. */
export function waitForCompressions(): Promise<void> {
  return previousTask.then(() => undefined);
}

// *** runCompression ***
async function runCompression(source: Source): Promise<Source> {
  if (!source.storageKey) return source;
  const storageKey = source.storageKey;
  const stored = await readMediaFile(storageKey);
  // OPFS does not keep MIME type or name, and the compressor needs both.
  const original = new File([stored], source.fileName, {
    type: source.mimeType,
  });
  const compressed = await compressMedia(original);

  if (compressed === original) return source;

  const metadata = await readMediaMetadata(
    compressed,
    toStoredMediaKind(source.kind),
  );

  await writeMediaFile(storageKey, compressed);

  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');
  const store = transaction.objectStore(STORES.sources);
  const existing = await toPromise<Source | undefined>(store.get(source.id));

  if (!existing || existing.storageKey !== storageKey) {
    // The source was deleted or replaced while compressing, so nothing uses this file now.
    await deleteMediaFile(storageKey);
    return existing ?? source;
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

// *** toStoredMediaKind ***
// A website's stored file is always its thumbnail image.
function toStoredMediaKind(kind: SourceKind): Exclude<SourceKind, 'website'> {
  return kind === 'website' ? 'image' : kind;
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
  const transaction = database.transaction(
    [STORES.collections, STORES.sources],
    'readonly',
  );
  const collections = await toPromise<Collection[]>(
    transaction.objectStore(STORES.collections).getAll(),
  );
  const index = transaction
    .objectStore(STORES.sources)
    .index(SOURCES_COLLECTION_INDEX);
  // Start all reads in the same tick, or the transaction closes.
  const lists = await Promise.all(
    collectBranchIds(collections, collectionId).map((id) =>
      toPromise<Source[]>(index.getAll(id)),
    ),
  );
  // A source in both a folder and its child comes back twice.
  const uniqueSources = new Map(
    lists.flat().map((source) => [source.id, source]),
  );

  return toVisibleSources([...uniqueSources.values()]);
}

// *** collectBranchIds ***
export function collectBranchIds(all: Collection[], rootId: string): string[] {
  const ids = [rootId];

  for (const id of ids) {
    for (const collection of all) {
      if (collection.parentId === id) ids.push(collection.id);
    }
  }

  return ids;
}

// *** fetchCollectionNodes ***
async function fetchCollectionNodes(): Promise<Collection[]> {
  const database = await openDatabase();

  return toPromise<Collection[]>(
    database
      .transaction(STORES.collections, 'readonly')
      .objectStore(STORES.collections)
      .getAll(),
  );
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
  const [collections, sources] = await Promise.all([
    fetchCollectionNodes(),
    fetchAllSources(),
  ]);
  const parentById = new Map(
    collections.map(({ id, parentId }) => [id, parentId]),
  );

  return sources.reduce((counts, source) => {
    for (const id of collectAncestorIds(parentById, source.collectionIds)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, new Map<string, number>());
}

// *** collectAncestorIds ***
function collectAncestorIds(
  parentById: Map<string, string | null>,
  ids: string[],
): Set<string> {
  const ancestorIds = new Set<string>();

  for (const id of ids) {
    let current: string | null | undefined = id;

    while (current && !ancestorIds.has(current)) {
      ancestorIds.add(current);
      current = parentById.get(current);
    }
  }

  return ancestorIds;
}

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

/**
 * Keep everything the user typed. A site that can be embedded stays a website and
 * only its thumbnail changes. A site that cannot is just a picture with a link, so
 * it becomes media.
 *
 * Use a new key so a failed save keeps the old file, and so `useMediaObjectUrl`
 * reloads even when the new file has the same size.
 */
export async function replaceSourceFile(
  id: string,
  input: File,
): Promise<Source> {
  const { file } = replaceSourceFileSchema.parse({ file: input });
  const mediaKind = sourceKindSchema.parse(file.type.split('/')[0]);
  const existing = await readSource(id);
  // Fail early, before writing the file. The save checks again on fresh data.
  toReplacementKind(existing, mediaKind);
  const metadata = await readMediaMetadata(file, mediaKind);
  const storageKey = crypto.randomUUID();

  await writeMediaFile(storageKey, file);

  const { previous, source } = await saveReplacedFile(id, mediaKind, {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    ...metadata,
    storageKey,
  }).catch(async (error: unknown) => {
    await deleteMediaFile(storageKey);
    throw new Error(`Failed to replace "${existing.name}".`, { cause: error });
  });

  // The replace already worked, so a leftover old file only wastes space.
  if (previous.storageKey) {
    await deleteMediaFile(previous.storageKey).catch((error: unknown) => {
      console.error(
        `Failed to delete old media file: ${previous.storageKey}`,
        error,
      );
    });
  }

  return source;
}

// *** readSource ***
async function readSource(id: string): Promise<Source> {
  const database = await openDatabase();
  const store = database
    .transaction(STORES.sources)
    .objectStore(STORES.sources);
  const existing = await toPromise<Source | undefined>(store.get(id));

  if (!existing) throw new Error(`Source not found: ${id}`);
  return existing;
}

// *** toReplacementKind ***
function toReplacementKind(
  current: Source,
  kind: Exclude<SourceKind, 'website'>,
): SourceKind {
  if (!canEmbedSite(current)) return kind;
  if (kind !== 'image') throw new Error('A website thumbnail must be an image');
  return 'website';
}

// *** saveReplacedFile ***
async function saveReplacedFile(
  id: string,
  mediaKind: Exclude<SourceKind, 'website'>,
  fields: Pick<
    Source,
    | 'fileName'
    | 'mimeType'
    | 'sizeBytes'
    | 'width'
    | 'height'
    | 'durationSeconds'
    | 'storageKey'
  >,
): Promise<{ previous: Source; source: Source }> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');
  const store = transaction.objectStore(STORES.sources);
  // Read again: the user may have edited the name or tags while the file was saving.
  const previous = await toPromise<Source | undefined>(store.get(id));

  if (!previous) throw new Error(`Source not found: ${id}`);

  // Decide here, not from the first read, so the kind matches the record we overwrite.
  const kind = toReplacementKind(previous, mediaKind);
  // A leftover site preview would make the viewer show media as a website.
  const { site: _site, ...media } = previous;
  const source: Source = {
    ...(kind === 'website' ? previous : media),
    ...fields,
    kind,
    updatedAt: new Date().toISOString(),
  };

  store.put(source);
  await toCompletion(transaction);

  return { previous, source };
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

/** Soft delete: keep the file so it can be restored from the trash. */
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

/** The record and the file are both gone for good, so ask the user first. */
export async function hardDeleteSource(id: string): Promise<Source> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.sources, 'readwrite');
  const store = transaction.objectStore(STORES.sources);

  const existing = await toPromise<Source | undefined>(store.get(id));

  if (!existing) throw new Error(`Source not found: ${id}`);

  store.delete(id);
  await toCompletion(transaction);

  // Delete the record first. A leftover file only wastes space, but a record
  // with no file shows a card that never loads.
  if (existing.storageKey) await deleteMediaFile(existing.storageKey);

  return existing;
}

/**
 * Uses the caller's transaction so the collection and its sources change together.
 *
 * A source only in this collection goes to the trash. A source also in another
 * collection just leaves this one.
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

/** One transaction, so all of them move to the trash or none do. */
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
 * A soft delete never removed the file, so clearing `deletedAt` is the whole restore.
 * Sources that were never deleted are skipped, so their `updatedAt` does not change.
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
    sources
      .flatMap((source) => (source.storageKey ? [source.storageKey] : []))
      .map((storageKey) =>
        deleteMediaFile(storageKey).catch((error: unknown) => {
          console.error(`Failed to delete media file: ${storageKey}`, error);
        }),
      ),
  );

  return sources;
}
