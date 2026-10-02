import { readMediaFile } from './source-storage';
import type { Source } from './source-types';

export async function downloadSource(source: Source): Promise<void> {
  const file = await readMediaFile(source.storageKey);
  const url = URL.createObjectURL(file.slice(0, file.size, source.mimeType));
  const link = document.createElement('a');

  link.href = url;
  link.download = source.fileName;
  link.click();

  // The click starts the download on the same tick, so the URL can go now.
  URL.revokeObjectURL(url);
}
