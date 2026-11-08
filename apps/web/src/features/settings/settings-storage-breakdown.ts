import type { Source, SourceKind } from '#/features/sources/source-types';
import type { StorageUsage } from '#/features/storage/storage-usage';

import type { SettingsStorageBreakdown } from './settings.type';

/** Other is what the browser counts beyond source files: thumbnails, previews and the database. */
export function toStorageBreakdown(
  { usage, quota }: StorageUsage,
  sources: readonly Source[],
): SettingsStorageBreakdown {
  const videos = sumBytes(sources, 'video');
  const images = sumBytes(sources, 'image');
  // The browser rounds its estimate on purpose, so the files can add up to more.
  const total = Math.max(usage, videos + images);

  return {
    total,
    quota,
    parts: [
      { kind: 'videos', label: 'Videos', bytes: videos },
      { kind: 'images', label: 'Images', bytes: images },
      { kind: 'other', label: 'Other', bytes: total - videos - images },
    ],
  };
}

// *** sumBytes ***
function sumBytes(sources: readonly Source[], kind: SourceKind) {
  return sources
    .filter((source) => source.kind === kind)
    .reduce((sum, source) => sum + source.sizeBytes, 0);
}
