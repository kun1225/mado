import { makeZip } from 'client-zip';

import { fetchAllCollections } from '#/features/collections/collection-actions';
import {
  fetchAllSources,
  waitForCompressions,
} from '#/features/sources/source-actions';
import { readMediaFile } from '#/features/sources/source-media';

import type {
  ExportFile,
  ExportLayout,
  ExportProgress,
  ExportResult,
  ExportTarget,
} from './export.type';
import { buildExportLayout } from './export-layout';
import { EXPORT_MANIFEST_NAME } from './export-manifest';

/**
 * Streams the zip into the target one file at a time, because a library can be
 * many GB and would not fit in memory.
 */
export async function exportLibrary(
  target: ExportTarget,
  exportedAt: Date,
  onProgress: (progress: ExportProgress) => void,
): Promise<ExportResult> {
  try {
    // Compression rewrites files in place. Reading one mid-rewrite fails the
    // whole zip, and the records would name the old type.
    await waitForCompressions();
    const [collections, sources] = await Promise.all([
      fetchAllCollections(),
      fetchAllSources(),
    ]);
    const layout = buildExportLayout(collections, sources, exportedAt);
    const missing: string[] = [];

    // pipeTo closes the file when the zip ends and aborts it on an error.
    await makeZip(
      readZipEntries(layout, exportedAt, missing, onProgress),
    ).pipeTo(target.writable);
    await target.finish();

    return { sourceCount: sources.length, missingCount: missing.length };
  } catch (error) {
    // An error before the pipe starts would leave a half-made file behind.
    await target.writable.abort(error).catch(() => {});
    throw error;
  }
}

// *** readZipEntries ***
// A generator, so only one file is open at a time.
async function* readZipEntries(
  layout: ExportLayout,
  exportedAt: Date,
  missing: string[],
  onProgress: (progress: ExportProgress) => void,
) {
  for (const folder of layout.folders) {
    yield { name: `${layout.rootName}/${folder}/`, lastModified: exportedAt };
  }

  for (const [index, file] of layout.files.entries()) {
    const entry = await toZipEntry(file, layout.rootName);
    if (entry) yield entry;
    else missing.push(file.path);
    onProgress({ done: index + 1, total: layout.files.length });
  }

  // Last, so it can list the files that were missing.
  yield {
    name: `${layout.rootName}/${EXPORT_MANIFEST_NAME}`,
    input: JSON.stringify(
      { ...layout.manifest, missingFiles: missing },
      null,
      2,
    ),
    lastModified: exportedAt,
  };
}

// *** toZipEntry ***
// The user can delete or replace a source while the export runs.
async function toZipEntry(file: ExportFile, rootName: string) {
  const name = `${rootName}/${file.path}`;
  if (file.kind !== 'media') {
    return { name, input: file.text, lastModified: file.lastModified };
  }

  try {
    const input = await readMediaFile(file.storageKey);
    return { name, input, lastModified: file.lastModified };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return null;
    }
    throw error;
  }
}
