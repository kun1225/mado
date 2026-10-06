import { cn } from 'cn';

import type { Source } from '#/features/sources/source-types';

import { SourceDetailCollections } from './source-detail-collections';
import { SourceDetailFields } from './source-detail-fields';
import { SourceDetailTags } from './source-detail-tags';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function describe(source: Source): string {
  if (source.kind === 'website') return source.site?.domain ?? 'Website';
  const format = source.mimeType.split('/')[1]?.split('+')[0]?.toUpperCase();
  const size =
    source.width && source.height ? `${source.width}×${source.height}` : null;

  return [format, size, formatBytes(source.sizeBytes)]
    .filter(Boolean)
    .join(' · ');
}

export function SourceDetailPanel({
  source,
  isOpen,
}: {
  source: Source;
  isOpen: boolean;
}) {
  return (
    <div
      className={cn(
        'motion-reduce:transition-none md:shrink-0 md:overflow-hidden md:transition-[width] md:duration-300 md:ease-in-out-circ',
        isOpen ? 'md:w-88' : 'md:w-0',
      )}
      inert={!isOpen}
    >
      <aside
        className={cn(
          'z-10 flex flex-col gap-5 overflow-y-auto rounded-md bg-bg p-4 text-fg shadow-lg transition-[opacity,translate] duration-300 ease-in-out-circ motion-reduce:transition-none max-md:absolute max-md:top-0 max-md:right-4 max-md:bottom-4 max-md:w-72 max-md:max-w-[calc(100%-2rem)] md:ml-4 md:h-full md:w-80',
          !isOpen && 'translate-x-[calc(100%+1rem)]',
        )}
      >
        <header className="flex flex-col gap-0.5 border-b border-border pb-3">
          <h2 className="text-sm font-medium">Details</h2>
          <p className="text-xs text-muted-fg">{describe(source)}</p>
        </header>

        <SourceDetailFields source={source} />
        <SourceDetailCollections source={source} />
        <SourceDetailTags source={source} />
      </aside>
    </div>
  );
}
