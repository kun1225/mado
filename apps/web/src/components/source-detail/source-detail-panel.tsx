import type { Source } from '#/features/sources/source-types';

import { SourceDetailCollections } from './source-detail-collections';
import { SourceDetailFields } from './source-detail-fields';
import { SourceDetailTags } from './source-detail-tags';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function describe(source: Source): string {
  const format = source.mimeType.split('/')[1]?.split('+')[0]?.toUpperCase();
  const size =
    source.width && source.height ? `${source.width}×${source.height}` : null;

  return [format, size, formatBytes(source.sizeBytes)]
    .filter(Boolean)
    .join(' · ');
}

export function SourceDetailPanel({ source }: { source: Source }) {
  return (
    <aside className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto rounded-lg bg-bg p-4 text-fg">
      <header className="flex flex-col gap-0.5 border-b border-border pb-3">
        <h2 className="text-sm font-medium">Details</h2>
        <p className="text-xs text-muted-fg">{describe(source)}</p>
      </header>

      <SourceDetailFields source={source} />
      <SourceDetailCollections source={source} />
      <SourceDetailTags source={source} />
    </aside>
  );
}
