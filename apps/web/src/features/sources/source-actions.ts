import {
  openDatabase,
  SOURCES_COLLECTION_INDEX,
  STORES,
  toCompletion,
  toPromise,
} from '#/features/storage/database';

import { deleteMediaFile, writeMediaFile } from './source-storage';
import type { NewSourceInput, Source, SourceKind } from './source-types';
import { newSourceSchema, sourceKindSchema } from './source-types';

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
function readMediaMetadata(
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
    collectionId,
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

export async function createSources(
  inputs: NewSourceInput[],
): Promise<Source[]> {
  const results = await Promise.allSettled(inputs.map(createSource));
  const sources: Source[] = [];

  for (const result of results) {
    if (result.status === 'rejected') throw result.reason;
    sources.push(result.value);
  }

  return sources;
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

export async function countSourcesByCollection(): Promise<Map<string, number>> {
  const sources = await fetchAllSources();

  return sources.reduce((counts, source) => {
    if (source.collectionId === null) return counts;
    return counts.set(
      source.collectionId,
      (counts.get(source.collectionId) ?? 0) + 1,
    );
  }, new Map<string, number>());
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
