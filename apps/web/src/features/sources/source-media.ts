import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  canEncode,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_MEDIUM,
} from 'mediabunny';

import type { Source } from './source-types';

const MEDIA_DIRECTORY = 'media';

const MAX_IMAGE_SIDE = 2560;
const MAX_VIDEO_SIDE = 1920;

const IMAGE_OUTPUT_TYPE = 'image/webp';
const IMAGE_OUTPUT_QUALITY = 0.85;
const VIDEO_OUTPUT_TYPE = 'video/mp4';

// Animated or vector formats lose their meaning when drawn onto a canvas.
const UNTOUCHED_IMAGE_TYPES = new Set(['image/gif', 'image/svg+xml']);

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

export async function compressMedia(file: File): Promise<File> {
  try {
    const compressed = file.type.startsWith('image/')
      ? await compressImage(file)
      : await compressVideo(file);

    return compressed.size < file.size ? compressed : file;
  } catch (error) {
    console.error(`Failed to compress "${file.name}"`, error);
    return file;
  }
}

// *** compressImage ***
async function compressImage(file: File): Promise<File> {
  if (UNTOUCHED_IMAGE_TYPES.has(file.type)) return file;
  if (typeof OffscreenCanvas === 'undefined') return file;

  const bitmap = await createImageBitmap(file);

  try {
    const { width, height } = fitWithin(
      bitmap.width,
      bitmap.height,
      MAX_IMAGE_SIDE,
    );
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');

    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvas.convertToBlob({
      type: IMAGE_OUTPUT_TYPE,
      quality: IMAGE_OUTPUT_QUALITY,
    });

    // Browsers that cannot encode WebP quietly return a PNG instead.
    if (blob.type !== IMAGE_OUTPUT_TYPE) return file;

    return toFile(blob, file, '.webp');
  } finally {
    bitmap.close();
  }
}

// *** compressVideo ***
async function compressVideo(file: File): Promise<File> {
  if (!(await canEncode('avc'))) return file;

  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });

  try {
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat(), target });
    const conversion = await Conversion.init({
      input,
      output,
      video: async (track) => {
        const { width } = fitWithin(
          await track.getDisplayWidth(),
          await track.getDisplayHeight(),
          MAX_VIDEO_SIDE,
        );

        // Setting only `width` keeps the aspect ratio, and a video that is
        // already small enough is never scaled up.
        return {
          codec: 'avc',
          bitrate: QUALITY_MEDIUM,
          ...(width < (await track.getDisplayWidth()) && { width }),
        };
      },
    });

    if (!conversion.isValid) return file;

    await conversion.execute();

    if (!target.buffer) return file;

    return toFile(
      new Blob([target.buffer], { type: VIDEO_OUTPUT_TYPE }),
      file,
      '.mp4',
    );
  } finally {
    input.dispose();
  }
}

// *** fitWithin ***
function fitWithin(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));

  if (scale === 1) return { width, height };

  return {
    width: toEven(width * scale),
    height: toEven(height * scale),
  };
}

// *** toEven ***
function toEven(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

// *** toFile ***
function toFile(blob: Blob, original: File, extension: string): File {
  const name = original.name.replace(/\.[^.]+$/, '') || original.name;

  return new File([blob], `${name}${extension}`, {
    type: blob.type,
    lastModified: original.lastModified,
  });
}

export { fitWithin };
