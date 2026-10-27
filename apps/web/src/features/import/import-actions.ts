import type { Collection } from '#/features/collections/collection-types';
import type { ExportManifest } from '#/features/export/export.type';
import { exportManifestSchema } from '#/features/export/export-manifest';
import { createSource } from '#/features/sources/source-actions';
import {
  deleteMediaFile,
  writeMediaFile,
} from '#/features/sources/source-media';
import type { Source } from '#/features/sources/source-types';
import { textBodySchema } from '#/features/sources/text-source';
import type { TextSourceContent } from '#/features/sources/text-source.type';
import {
  openDatabase,
  STORES,
  toCompletion,
  toPromise,
} from '#/features/storage/database';

import type {
  ImportExistingIds,
  ImportFile,
  ImportItem,
  ImportProgress,
  ImportResult,
  ImportTextFile,
} from './import.type';
import { buildImportPlan, findManifestFile } from './import-plan';

/**
 * Saves one source at a time: a picked folder can be many GB, and the browser
 * only reads each file from disk when we ask for it.
 */
export async function importLibrary(
  pickedFiles: File[],
  onProgress: (progress: ImportProgress) => void,
): Promise<ImportResult> {
  const files = pickedFiles.map(toImportFile);
  const { manifest, unreadable } = await readManifest(files);
  const plan = buildImportPlan({
    files,
    manifest,
    existing: await readExistingIds(),
    newId: () => crypto.randomUUID(),
    now: new Date(),
  });
  // First, so every source's collections exist when it shows up.
  await saveCollections(plan.collections);

  const saved: Source[] = [];
  let failedCount = 0;
  for (const [index, item] of plan.items.entries()) {
    try {
      saved.push(await saveItem(item));
    } catch (error) {
      // Every later file would fail the same way.
      if (isQuotaError(error)) throw error;
      console.error('Failed to import a file', error);
      failedCount += 1;
    }
    onProgress({ done: index + 1, total: plan.items.length });
  }

  return {
    sourceCount: saved.length,
    collectionCount: plan.collections.length,
    existingCount: plan.existingCount,
    skippedCount: plan.skippedCount,
    failedCount,
    manifestUnreadable: unreadable,
    newSources: manifest ? [] : saved,
  };
}

/** Our own errors wrap the browser's, so the whole `cause` chain is checked. */
export function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'QuotaExceededError' || isQuotaError(error.cause);
}

// *** toImportFile ***
function toImportFile(file: File): ImportFile {
  return { path: file.webkitRelativePath || file.name, file };
}

// *** readManifest ***
// Users can edit `library.json` by hand, so a broken one falls back to the folder rule.
async function readManifest(
  files: ImportFile[],
): Promise<{ manifest: ExportManifest | null; unreadable: boolean }> {
  const file = findManifestFile(files);
  if (!file) return { manifest: null, unreadable: false };

  try {
    const manifest = exportManifestSchema.parse(JSON.parse(await file.text()));
    return { manifest, unreadable: false };
  } catch {
    return { manifest: null, unreadable: true };
  }
}

// *** readExistingIds ***
// Keys only, and trash included, so a trashed source is not brought back as a copy.
async function readExistingIds(): Promise<ImportExistingIds> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [STORES.collections, STORES.sources],
    'readonly',
  );
  const [collectionIds, sourceIds] = await Promise.all([
    toPromise(transaction.objectStore(STORES.collections).getAllKeys()),
    toPromise(transaction.objectStore(STORES.sources).getAllKeys()),
  ]);

  return {
    collectionIds: new Set(collectionIds.map(String)),
    sourceIds: new Set(sourceIds.map(String)),
  };
}

// *** saveCollections ***
async function saveCollections(collections: Collection[]): Promise<void> {
  if (collections.length === 0) return;

  const database = await openDatabase();
  const transaction = database.transaction(STORES.collections, 'readwrite');
  const store = transaction.objectStore(STORES.collections);
  collections.forEach((collection) => store.put(collection));
  await toCompletion(transaction);
}

// *** saveItem ***
async function saveItem(item: ImportItem): Promise<Source> {
  if (item.kind === 'file') {
    return createSource({ file: item.file, collectionId: item.collectionId });
  }

  const { file } = item;
  // Read before writing the thumbnail, so a broken text leaves no file behind.
  const source: Source = item.text
    ? { ...item.source, text: await readImportText(item.text) }
    : item.source;
  if (file && source.storageKey) await writeMediaFile(source.storageKey, file);

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORES.sources, 'readwrite');
    // `add`, not `put`: another tab may have saved this id since we checked.
    transaction.objectStore(STORES.sources).add(source);
    await toCompletion(transaction);
  } catch (error) {
    if (source.storageKey) await deleteMediaFile(source.storageKey);
    throw new Error(`Failed to save "${source.name}".`, { cause: error });
  }

  return source;
}

// *** readImportText ***
async function readImportText(
  text: ImportTextFile,
): Promise<TextSourceContent> {
  return {
    body: textBodySchema.parse(await text.file.text()),
    format: text.format,
    fileName: text.fileName,
  };
}
