import type { Collection } from '#/features/collections/collection-types';
import { MAX_COLLECTION_NAME_LENGTH } from '#/features/collections/collection-types';
import type {
  ExportManifest,
  ExportManifestCollection,
  ExportManifestSource,
} from '#/features/export/export.type';
import { EXPORT_MANIFEST_NAME } from '#/features/export/export-manifest';
import { groupFontFiles, MAX_FONT_BYTES } from '#/features/sources/font-source';
import type { FontSourceContent } from '#/features/sources/font-source.type';
import type { Source } from '#/features/sources/source-types';
import {
  detectFileKind,
  MAX_FILE_BYTES,
} from '#/features/sources/source-types';
import {
  detectTextFormat,
  MAX_TEXT_BYTES,
} from '#/features/sources/text-source';

import type {
  ImportExistingIds,
  ImportFile,
  ImportItem,
  ImportPlan,
  ImportPlanInput,
  ImportTextFile,
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
    const file = findFile(source, filesByPath, 'media');
    const text = source.kind === 'text' ? findText(source, filesByPath) : null;
    // A style whose file is gone is left out; the rest of the family still imports.
    const fonts = findFontFaces(source, filesByPath, newId);
    // A website is still a working link, and a text still has its words, without a thumbnail.
    const isMissing =
      source.kind === 'text'
        ? text === null
        : source.kind === 'font'
          ? fonts === null
          : !file && source.kind !== 'website';
    if (isMissing) return [];
    const record = toSourceRecord(source, file, knownCollectionIds, newId);
    return [
      {
        kind: 'record',
        file,
        text,
        fontFiles: fonts?.files ?? [],
        source: fonts
          ? { ...record, font: fonts.font, sizeBytes: sumSize(fonts.files) }
          : record,
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

// *** findFile ***
// A source in two collections has a copy in each folder, and any copy will do.
function findFile(
  source: ExportManifestSource,
  filesByPath: Map<string, File>,
  role: ExportManifestSource['files'][number]['role'],
): File | null {
  const copies = source.files
    .filter((entry) => entry.role === role)
    .flatMap((entry) => filesByPath.get(toPathKey(entry.path)) ?? []);
  return copies[0] ?? null;
}

// *** findFontFaces ***
// `null` when the source is not a font, or none of its files came along.
function findFontFaces(
  source: ExportManifestSource,
  filesByPath: Map<string, File>,
  newId: () => string,
): { font: FontSourceContent; files: File[] } | null {
  if (source.kind !== 'font' || !source.font) return null;

  const found = source.font.faces.flatMap((face, index) => {
    const file = source.files
      .filter((entry) => entry.role === 'font' && entry.face === index)
      .flatMap((entry) => filesByPath.get(toPathKey(entry.path)) ?? [])
      .at(0);
    return file
      ? [
          {
            index,
            file,
            face: { ...face, storageKey: newId(), sizeBytes: file.size },
          },
        ]
      : [];
  });
  if (found.length === 0) return null;

  const cover = found.find(({ index }) => index === source.font?.coverFace);
  return {
    font: {
      family: source.font.family,
      sample: source.font.sample,
      coverFace: cover?.face.storageKey ?? null,
      faces: found.map(({ face }) => face),
    },
    files: found.map(({ file }) => file),
  };
}

// *** sumSize ***
function sumSize(files: File[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}

// *** findText ***
// `library.json` can be edited by hand, so a missing `text` falls back to the file itself.
function findText(
  source: ExportManifestSource,
  filesByPath: Map<string, File>,
): ImportTextFile | null {
  const file = findFile(source, filesByPath, 'text');
  if (!file) return null;

  return {
    file,
    format: source.text?.format ?? detectTextFormat(file) ?? 'plain',
    fileName: source.text?.fileName ?? file.name,
  };
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
    deletedAt: null,
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
  const media = visible.filter(({ file }) => isImportableFile(file));
  const isFont = ({ file }: ImportFile) => detectFileKind(file) === 'font';
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
      deletedAt: null,
    })),
    items: [
      ...media
        .filter((item) => !isFont(item))
        .map(({ path, file }): ImportItem => ({
          kind: 'file',
          file,
          collectionId: folderIds.get(toParentPath(path)) ?? null,
        })),
      ...toFontItems(media.filter(isFont), folderIds),
    ],
    existingCount: 0,
    skippedCount: visible.length - media.length,
  };
}

// *** toFontItems ***
// Font files in one folder that share a family become one source, like a drop.
function toFontItems(
  fonts: ImportFile[],
  folderIds: Map<string, string>,
): ImportItem[] {
  const folders = [...new Set(fonts.map(({ path }) => toParentPath(path)))];

  return folders.flatMap((folder) =>
    groupFontFiles(
      fonts
        .filter(({ path }) => toParentPath(path) === folder)
        .map(({ file }) => file),
    ).map((group): ImportItem => ({
      kind: 'font',
      group,
      collectionId: folderIds.get(folder) ?? null,
    })),
  );
}

// *** isHidden ***
// Files like `.DS_Store` are not the user's, so skipping them is not worth a message.
function isHidden(path: string): boolean {
  return path.split('/').some((part) => part.startsWith('.'));
}

// *** isImportableFile ***
// The same rules `createSource` checks, so a file that would fail is counted as skipped instead.
function isImportableFile(file: File): boolean {
  const kind = detectFileKind(file);
  const maxBytes =
    kind === 'text'
      ? MAX_TEXT_BYTES
      : kind === 'font'
        ? MAX_FONT_BYTES
        : MAX_FILE_BYTES;

  return kind !== null && file.size > 0 && file.size <= maxBytes;
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
