import { useCollections } from '#/features/collections/collection-hooks';
import { useExportLibrary } from '#/features/export/export-hooks';
import { useImportLibrary } from '#/features/import/import-hooks';
import { useStorageBreakdown } from '#/features/settings/settings-hooks';
import { useAllSources } from '#/features/sources/hooks/source-hooks';

import { SettingsBackupSection } from './settings-backup-section';
import { SettingsStorageSection } from './settings-storage-section';

export function SettingsDataTab() {
  const { data: sources } = useAllSources();
  const { data: collections = [] } = useCollections();
  const breakdown = useStorageBreakdown();
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
      {breakdown && <SettingsStorageSection breakdown={breakdown} />}
      <SettingsBackupSection
        summary={
          sources && toLibrarySummary(sources.length, collections.length)
        }
        canExport={!!sources && !empty}
        exporting={exporting}
        importing={importing}
        exportProgress={progress}
        importProgress={importProgress}
        onExport={startExport}
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
