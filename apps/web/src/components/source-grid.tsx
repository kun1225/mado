import { cn } from 'cn';

import { useCollections } from '#/features/collections/collection-hooks';
import { useSourceDetail } from '#/features/sources/hooks/use-source-detail';
import { useSourceSelection } from '#/features/sources/hooks/use-source-selection';
import {
  useDeleteSource,
  useDeleteSources,
} from '#/features/sources/source-hooks';
import type { Source } from '#/features/sources/source-types';

import { SourceDetailDialog } from './source-detail/source-detail-dialog';
import { Masonry } from './masonry';
import { SourceCard } from './source-card';
import { SourceGridSelectionBar } from './source-grid-selection-bar';

export function SourceGrid({
  sources,
  showCollection,
  canOpenDetail = true,
  onDelete,
  onBulkDelete,
  onBulkRestore,
  deletingIds,
  isBulkPending,
}: {
  sources: Source[];
  showCollection?: boolean;
  /** The trash turns this off: a deleted source is not editable. */
  canOpenDetail?: boolean;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  /** Only the trash passes this, so the bar hides the button everywhere else. */
  onBulkRestore?: (ids: string[]) => void;
  deletingIds?: readonly string[];
  isBulkPending?: boolean;
}) {
  const collectionsQuery = useCollections();
  const deleteSourceMutation = useDeleteSource();
  const deleteSourcesMutation = useDeleteSources();
  const selection = useSourceSelection(sources);
  const detail = useSourceDetail();

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

  function selectedIds() {
    return selection.selectedSources.map((source) => source.id);
  }

  function handleBulkDelete() {
    (onBulkDelete ?? deleteSourcesMutation.mutate)(selectedIds());
  }

  function handleBulkRestore() {
    onBulkRestore?.(selectedIds());
  }

  return (
    <>
      <div className={cn(selection.isSelectionMode && 'select-none')}>
        <Masonry items={sources} getKey={(source) => source.id}>
          {(source) => (
            <SourceCard
              source={source}
              collectionName={
                showCollection
                  ? source.collectionIds
                      .map((id) => collectionNames.get(id))
                      .filter(Boolean)
                      .join(', ') || undefined
                  : undefined
              }
              onOpen={
                canOpenDetail ? () => detail.setActiveId(source.id) : undefined
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

      {canOpenDetail && (
        <SourceDetailDialog
          sources={sources}
          activeId={detail.activeId}
          onActiveIdChange={detail.setActiveId}
        />
      )}

      {selection.isSelectionMode && (
        <SourceGridSelectionBar
          count={selection.selectedSources.length}
          onClear={selection.clear}
          onDelete={handleBulkDelete}
          onRestore={onBulkRestore && handleBulkRestore}
          isPending={isBulkPending ?? deleteSourcesMutation.isPending}
        />
      )}
    </>
  );
}
