import { cn } from 'cn';

import { useCollections } from '#/features/collections/collection-hooks';
import { useSourceSelection } from '#/features/sources/hooks/use-source-selection';

import {
  useDeleteSource,
  useDeleteSources,
} from '../../../features/sources/source-hooks';
import type { Source } from '../../../features/sources/source-types';

import { Masonry } from './masonry';
import { SourceCard } from './source-card';
import { SourceSelectionBar } from './source-selection-bar';

export function SourceGrid({
  sources,
  showCollection,
  onDelete,
  onBulkDelete,
  deletingIds,
  isBulkDeleting,
}: {
  sources: Source[];
  showCollection?: boolean;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  deletingIds?: readonly string[];
  isBulkDeleting?: boolean;
}) {
  const collectionsQuery = useCollections();
  const deleteSourceMutation = useDeleteSource();
  const deleteSourcesMutation = useDeleteSources();
  const selection = useSourceSelection(sources);

  const pendingIds = new Set([
    ...(deletingIds ?? []),
    ...(deleteSourceMutation.isPending ? [deleteSourceMutation.variables] : []),
    ...(deleteSourcesMutation.isPending ? deleteSourcesMutation.variables : []),
  ]);

  const collectionNames = new Map(
    collectionsQuery.data?.map((collection) => [
      collection.id,
      collection.name,
    ]),
  );

  function handleBulkDelete() {
    const ids = selection.selectedSources.map((source) => source.id);

    (onBulkDelete ?? deleteSourcesMutation.mutate)(ids);
  }

  return (
    <>
      <div className={cn(selection.isSelectionMode && 'select-none')}>
        <Masonry items={sources} getKey={(source) => source.id}>
          {(source) => (
            <SourceCard
              source={source}
              collectionName={
                showCollection && source.collectionId
                  ? collectionNames.get(source.collectionId)
                  : undefined
              }
              deletion={{
                isPending: pendingIds.has(source.id),
                onDelete: () =>
                  (onDelete ?? deleteSourceMutation.mutate)(source.id),
              }}
              selection={{
                isSelected: selection.isSelected(source.id),
                isActive: selection.isSelectionMode,
                onToggle: (options) => selection.toggle(source.id, options),
              }}
            />
          )}
        </Masonry>
      </div>

      {selection.isSelectionMode && (
        <SourceSelectionBar
          count={selection.selectedSources.length}
          onClear={selection.clear}
          onDelete={handleBulkDelete}
          isDeleting={isBulkDeleting ?? deleteSourcesMutation.isPending}
        />
      )}
    </>
  );
}
