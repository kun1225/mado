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

  // "svg+xml" -> "svg"
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
  // TODO: Add URL detection later.
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
