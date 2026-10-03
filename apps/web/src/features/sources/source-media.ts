import type { Source } from './source-types';

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

export async function downloadSource(source: Source): Promise<void> {
  const file = await readMediaFile(source.storageKey);
  const url = URL.createObjectURL(file.slice(0, file.size, source.mimeType));
  const link = document.createElement('a');

  link.href = url;
  link.download = source.fileName;
  link.click();
}

export type PastedContent =
  | { kind: 'media'; file: File }
  | { kind: 'url'; url: string }
  | { kind: 'ignored' };

export const ACCEPTED_FILE_TYPES = 'image/*,video/*';

const SUPPORTED_MEDIA_PREFIXES = ACCEPTED_FILE_TYPES.split(',').map((type) =>
  type.replace('*', ''),
);

function isSupportedMediaType(type: string): boolean {
  return SUPPORTED_MEDIA_PREFIXES.some((prefix) => type.startsWith(prefix));
}

function withFallbackFileName(file: File, mimeType: string): File {
  if (file.name) return file;

  const extension = mimeType.split('/')[1]?.split('+')[0] || 'bin';
  return new File([file], `pasted.${extension}`, {
    type: mimeType,
    lastModified: file.lastModified,
  });
}

function getPastedMediaFile(data: DataTransfer): File | null {
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue;

    const file = item.getAsFile();
    if (!file || file.size === 0) continue;

    const mimeType = file.type || item.type;
    if (!isSupportedMediaType(mimeType)) continue;

    return withFallbackFileName(file, mimeType);
  }

  return null;
}

function getPastedUrl(_data: DataTransfer): string | null {
  return null;
}

export function isEditablePasteTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return false;
  }

  return (
    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable
  );
}

export function detectPastedContent(data: DataTransfer | null): PastedContent {
  if (!data) return { kind: 'ignored' };

  const file = getPastedMediaFile(data);
  if (file) return { kind: 'media', file };

  const url = getPastedUrl(data);
  if (url) return { kind: 'url', url };

  return { kind: 'ignored' };
}
