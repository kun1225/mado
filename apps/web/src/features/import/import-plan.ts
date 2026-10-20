import type { Collection } from '#/features/collections/collection-types';
import { MAX_COLLECTION_NAME_LENGTH } from '#/features/collections/collection-types';
import type {
  ExportManifest,
  ExportManifestCollection,
  ExportManifestSource,
} from '#/features/export/export.type';
import { EXPORT_MANIFEST_NAME } from '#/features/export/export-manifest';
import type { Source } from '#/features/sources/source-types';
import {
  MAX_FILE_BYTES,
  sourceKindSchema,
} from '#/features/sources/source-types';

import type {
  ImportExistingIds,
  ImportFile,
  ImportItem,
  ImportPlan,
  ImportPlanInput,
} from './import.type';

/** Pure, so every rule is tested without IndexedDB or OPFS. */
export function buildImportPlan({
  files,
  manifest,
  existing,
  newId,
  now,
}: ImportPlanInput): ImportPlan {
  return manifest
    ? toManifestPlan(manifest, files, existing, newId)
    : toFolderPlan(files, newId, now);
}

/** Only at the top: a nested `library.json` is just a file someone saved. */
export function findManifestFile(files: ImportFile[]): File | null {
  const match = files.find(
    ({ path }) => withoutRoot(path) === EXPORT_MANIFEST_NAME,
  );
  return match?.file ?? null;
}

// *** withoutRoot ***
// Export paths start inside the top folder, so renaming it after unzipping breaks nothing.
function withoutRoot(path: string): string {
  return path.split('/').slice(1).join('/');
}

// *** toManifestPlan ***
function toManifestPlan(
  manifest: ExportManifest,
  files: ImportFile[],
  existing: ImportExistingIds,
  newId: () => string,
): ImportPlan {
  const filesByPath = new Map(
    files.map(({ path, file }) => [toPathKey(withoutRoot(path)), file]),
  );
  const knownCollectionIds = new Set([
    ...existing.collectionIds,
    ...manifest.collections.map((collection) => collection.id),
  ]);
  const newSources = manifest.sources.filter(
    (source) => !existing.sourceIds.has(source.id),
  );
  const items = newSources.flatMap((source): ImportItem[] => {
    const file = findMediaFile(source, filesByPath);
    // A website is still a working link without its thumbnail.
    if (!file && source.kind !== 'website') return [];
    return [
      {
        kind: 'record',
        file,
        source: toSourceRecord(source, file, knownCollectionIds, newId),
      },
    ];
  });

  return {
    collections: manifest.collections
      .filter((collection) => !existing.collectionIds.has(collection.id))
      .map((collection) => toCollectionRecord(collection, knownCollectionIds)),
    items,
    existingCount: manifest.sources.length - newSources.length,
    skippedCount: newSources.length - items.length,
  };
}

// *** toPathKey ***
// macOS can return names in NFD, while export wrote them in NFC.
function toPathKey(path: string): string {
  return path.normalize('NFC');
}

// *** findMediaFile ***
// A source in two collections has a copy in each folder, and any copy will do.
function findMediaFile(
  source: ExportManifestSource,
  filesByPath: Map<string, File>,
): File | null {
  const copies = source.files
    .filter((entry) => entry.role === 'media')
    .flatMap((entry) => filesByPath.get(toPathKey(entry.path)) ?? []);
  return copies[0] ?? null;
}

// *** toSourceRecord ***
function toSourceRecord(
  source: ExportManifestSource,
  file: File | null,
  knownCollectionIds: ReadonlySet<string>,
  newId: () => string,
): Source {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    note: source.note,
    tags: source.tags,
    collectionIds: source.collectionIds.filter((id) =>
      knownCollectionIds.has(id),
    ),
    kind: source.kind,
    ...(source.site && { site: source.site }),
    fileName: file ? source.fileName : '',
    mimeType: file ? source.mimeType : '',
    sizeBytes: file?.size ?? 0,
    width: file ? source.width : null,
    height: file ? source.height : null,
    durationSeconds: file ? source.durationSeconds : null,
    // A new key, so a write can never overwrite a file another source owns.
    storageKey: file ? newId() : null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    deletedAt: null,
  };
}

// *** toCollectionRecord ***
function toCollectionRecord(
  collection: ExportManifestCollection,
  knownCollectionIds: ReadonlySet<string>,
): Collection {
  const hasParent =
    collection.parentId !== null &&
    collection.parentId !== collection.id &&
    knownCollectionIds.has(collection.parentId);

  return {
    id: collection.id,
    name: collection.name,
    parentId: hasParent ? collection.parentId : null,
    color: collection.color,
    saveCount: 0,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

// *** toFolderPlan ***
// The picked folder becomes a collection too, so its files don't land loose in the library.
function toFolderPlan(
  files: ImportFile[],
  newId: () => string,
  now: Date,
): ImportPlan {
  const visible = files.filter(({ path }) => !isHidden(path));
  const media = visible.filter(({ file }) => isImportableMedia(file));
  // Shortest first, so each parent gets its id before its children.
  const folders = [...new Set(media.flatMap(({ path }) => toFolderChain(path)))]
    .sort((first, second) => toDepth(first) - toDepth(second))
    .map((path) => ({ path, id: newId() }));
  const folderIds = new Map(folders.map(({ path, id }) => [path, id]));
  const timestamp = now.toISOString();

  return {
    collections: folders.map(({ path, id }) => ({
      id,
      name: toFolderName(path),
      parentId: folderIds.get(toParentPath(path)) ?? null,
      color: null,
      saveCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    items: media.map(({ path, file }) => ({
      kind: 'file',
      file,
      collectionId: folderIds.get(toParentPath(path)) ?? null,
    })),
    existingCount: 0,
    skippedCount: visible.length - media.length,
  };
}

// *** isHidden ***
// Files like `.DS_Store` are not the user's, so skipping them is not worth a message.
function isHidden(path: string): boolean {
  return path.split('/').some((part) => part.startsWith('.'));
}

// *** isImportableMedia ***
// The same rules `createSource` checks, so a file that would fail is counted as skipped instead.
function isImportableMedia(file: File): boolean {
  return (
    sourceKindSchema.safeParse(file.type.split('/')[0]).success &&
    file.size > 0 &&
    file.size <= MAX_FILE_BYTES
  );
}

// *** toFolderChain ***
function toFolderChain(path: string): string[] {
  const folders = path.split('/').slice(0, -1);
  return folders.map((_, index) => folders.slice(0, index + 1).join('/'));
}

// *** toDepth ***
function toDepth(path: string): number {
  return path.split('/').length;
}

// *** toFolderName ***
function toFolderName(path: string): string {
  const name = (path.split('/').at(-1) ?? path).normalize('NFC');
  // By characters, so an emoji is never cut in half.
  return Array.from(name).slice(0, MAX_COLLECTION_NAME_LENGTH).join('');
}

// *** toParentPath ***
function toParentPath(path: string): string {
  return path.split('/').slice(0, -1).join('/');
}
