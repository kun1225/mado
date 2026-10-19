import { saveBlobToDevice } from '#/features/sources/source-media';
import { getAccountDirectory } from '#/features/storage/storage-directory';

import type { ExportSaveFilePicker, ExportTarget } from './export.type';

const EXPORT_DIRECTORY = 'exports';

// Long enough for any download to finish, short enough not to keep GBs around.
const STALE_EXPORT_MS = 60 * 60 * 1000;

/**
 * Call this before any other await. Browsers only open the save picker right
 * after a click.
 */
export function openExportTarget(fileName: string): Promise<ExportTarget> {
  const picker = window.showSaveFilePicker;
  return picker ? openPickedTarget(picker, fileName) : openOpfsTarget(fileName);
}

// *** openPickedTarget ***
// Streams straight into the user's file, so the zip never needs a second copy.
async function openPickedTarget(
  picker: ExportSaveFilePicker,
  fileName: string,
): Promise<ExportTarget> {
  const handle = await picker({
    suggestedName: fileName,
    types: [
      { description: 'Zip archive', accept: { 'application/zip': ['.zip'] } },
    ],
  });

  return {
    writable: await handle.createWritable(),
    finish: () => Promise.resolve(),
  };
}

// *** openOpfsTarget ***
// Safari and Firefox have no picker. An OPFS file stays on disk, where a blob
// this big could fill the memory.
async function openOpfsTarget(fileName: string): Promise<ExportTarget> {
  const account = await getAccountDirectory();
  const directory = await account.getDirectoryHandle(EXPORT_DIRECTORY, {
    create: true,
  });
  await removeStaleExports(directory, Date.now());
  // A unique name, so two exports never write to or delete the same file.
  const handle = await directory.getFileHandle(`${crypto.randomUUID()}.zip`, {
    create: true,
  });

  return {
    writable: await handle.createWritable(),
    finish: async () => saveBlobToDevice(await handle.getFile(), fileName),
  };
}

// *** removeStaleExports ***
// Old zips go here and not after their download, because removing one right
// away can break a download that is still running. Cleanup never fails an export.
async function removeStaleExports(
  directory: FileSystemDirectoryHandle,
  now: number,
): Promise<void> {
  for await (const entry of directory.values()) {
    if (entry.kind !== 'file') continue;
    try {
      const file = await entry.getFile();
      if (now - file.lastModified > STALE_EXPORT_MS) {
        await directory.removeEntry(entry.name);
      }
    } catch (error) {
      console.error(`Failed to remove the old export "${entry.name}"`, error);
    }
  }
}
