import { Button } from '@repo/ui/button';

import { useCollections } from '#/features/collections/collection-hooks';
import { useExportLibrary } from '#/features/export/export-hooks';
import type { SettingsExportProgressProps } from '#/features/settings/settings.type';
import { useAllSources } from '#/features/sources/hooks/source-hooks';

const EXPORT_TITLE_ID = 'settings-export-title';

export function SettingsDataTab() {
  const { data: sources } = useAllSources();
  const { data: collections = [] } = useCollections();
  const { startExport, exporting, progress } = useExportLibrary();
  // Unknown while loading, so "Nothing to export yet." doesn't flash first.
  const empty = sources?.length === 0;

  return (
    <section aria-labelledby={EXPORT_TITLE_ID} className="space-y-4">
      <div className="space-y-1">
        <h3 id={EXPORT_TITLE_ID} className="text-sm font-medium">
          Export all sources
        </h3>
        <p className="text-sm text-muted-fg">
          Download every source as a .zip. Collections become folders. The trash
          is not included.
        </p>
      </div>
      <p className="min-h-5 text-sm tabular-nums">
        {sources && toLibrarySummary(sources.length, collections.length)}
      </p>
      <Button disabled={!sources || empty || exporting} onClick={startExport}>
        {exporting ? 'Exporting…' : 'Export'}
      </Button>
      {progress && <SettingsExportProgress progress={progress} />}
    </section>
  );
}

// *** toLibrarySummary ***
function toLibrarySummary(sourceCount: number, collectionCount: number) {
  if (sourceCount === 0) return 'Nothing to export yet.';

  const sources = `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`;
  if (collectionCount === 0) return `${sources}.`;
  return `${sources} in ${collectionCount} ${collectionCount === 1 ? 'collection' : 'collections'}.`;
}

// *** SettingsExportProgress ***
// The label is not a live region, because reading every file count aloud would be noise.
function SettingsExportProgress({ progress }: SettingsExportProgressProps) {
  const ratio = progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <div className="space-y-2">
      <div
        role="progressbar"
        aria-label="Export progress"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full origin-left rounded-full bg-accent transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <p className="text-xs text-muted-fg tabular-nums">
        Packing file {progress.done} of {progress.total}…
      </p>
    </div>
  );
}
