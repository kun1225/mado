const MEDIA_DIRECTORY = 'media';

export const isMediaStorageSupported =
  typeof navigator !== 'undefined' &&
  'storage' in navigator &&
  typeof navigator.storage.getDirectory === 'function';

async function getMediaDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(MEDIA_DIRECTORY, { create: true });
}

export async function writeMediaFile(key: string, file: File): Promise<void> {
  const directory = await getMediaDirectory();
  const handle = await directory.getFileHandle(key, { create: true });
  const writable = await handle.createWritable();

  try {
    await writable.write(file);
    await writable.close();
  } catch (error) {
    await writable.abort();
    throw new Error(`Failed to store "${file.name}" on this device.`, {
      cause: error,
    });
  }
}

export async function readMediaFile(key: string): Promise<File> {
  const directory = await getMediaDirectory();
  const handle = await directory.getFileHandle(key);
  return handle.getFile();
}

export async function deleteMediaFile(key: string): Promise<void> {
  const directory = await getMediaDirectory();

  try {
    await directory.removeEntry(key);
  } catch (error) {
    if ((error as DOMException).name !== 'NotFoundError') throw error;
  }
}
