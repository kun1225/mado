import { Button } from '@repo/ui/button';

import { useCollections } from '#/features/collections/collection-hooks';
import { useExportLibrary } from '#/features/export/export-hooks';
import { useImportLibrary } from '#/features/import/import-hooks';
import { useAllSources } from '#/features/sources/hooks/source-hooks';

import { SettingsImportSection } from './settings-import-section';
import { SettingsProgress } from './settings-progress';

const EXPORT_TITLE_ID = 'settings-export-title';

export function SettingsDataTab() {
  const { data: sources } = useAllSources();
  const { data: collections = [] } = useCollections();
  const { startExport, exporting, progress } = useExportLibrary();
  const {
    startImport,
    importing,
    progress: importProgress,
  } = useImportLibrary();
  // Unknown while loading, so "Nothing to export yet." doesn't flash first.
  const empty = sources?.length === 0;

  // One at a time: an export mid-import would pack a library that is still changing.
  return (
    <div className="space-y-8">
      <section aria-labelledby={EXPORT_TITLE_ID} className="space-y-4">
        <div className="space-y-1">
          <h3 id={EXPORT_TITLE_ID} className="text-sm font-medium">
            Export all sources
          </h3>
          <p className="text-sm text-muted-fg">
            Download every source as a .zip. Collections become folders. The
            trash is not included.
          </p>
        </div>
        <p className="min-h-5 text-sm tabular-nums">
          {sources && toLibrarySummary(sources.length, collections.length)}
        </p>
        <Button
          disabled={!sources || empty || exporting || importing}
          onClick={startExport}
        >
          {exporting ? 'Exporting…' : 'Export'}
        </Button>
        {progress && (
          <SettingsProgress
            name="Export progress"
            label={`Packing file ${progress.done} of ${progress.total}…`}
            progress={progress}
          />
        )}
      </section>
      <SettingsImportSection
        disabled={exporting}
        importing={importing}
        progress={importProgress}
        onImport={startImport}
      />
    </div>
  );
}

// *** toLibrarySummary ***
function toLibrarySummary(sourceCount: number, collectionCount: number) {
  if (sourceCount === 0) return 'Nothing to export yet.';

  const sources = `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`;
  if (collectionCount === 0) return `${sources}.`;
  return `${sources} in ${collectionCount} ${collectionCount === 1 ? 'collection' : 'collections'}.`;
}
