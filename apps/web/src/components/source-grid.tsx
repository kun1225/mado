import { cn } from 'cn';

import { useCollections } from '#/features/collections/collection-hooks';
import {
  useCompressingSourceIds,
  useDeleteSource,
  useDeleteSources,
} from '#/features/sources/hooks/source-hooks';
import {
  useSourceDetail,
  useSourceSelection,
} from '#/features/sources/hooks/source-interaction-hooks';
import type { Source } from '#/features/sources/source-types';

import { ActionDockSelection } from './action-dock/action-dock-selection';
import { SourceDetailDialog } from './source-detail/source-detail-dialog';
import { Masonry } from './masonry';
import { SourceCard } from './source-card';

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
  /** Off in the trash, because a deleted source cannot be edited. */
  canOpenDetail?: boolean;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkRestore?: (ids: string[]) => void;
  deletingIds?: readonly string[];
  isBulkPending?: boolean;
}) {
  const collectionsQuery = useCollections();
  const deleteSourceMutation = useDeleteSource();
  const deleteSourcesMutation = useDeleteSources();
  const compressingIds = useCompressingSourceIds();
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

  const selectedIds = selection.selectedSources.map((source) => source.id);

  function handleBulkDelete() {
    (onBulkDelete ?? deleteSourcesMutation.mutate)(selectedIds);
  }

  function handleBulkRestore() {
    onBulkRestore?.(selectedIds);
  }

  return (
    <>
      <div className={cn(selection.isSelectionMode && 'select-none')}>
        <Masonry items={sources} getKey={(source) => source.id}>
          {(source) => (
            <SourceCard
              source={source}
              isCompressing={compressingIds.has(source.id)}
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
        <ActionDockSelection
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

// Mixed heights so the placeholder looks like a masonry wall, not a table.
const TILE_ASPECTS = [
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[4/3]',
  'aspect-[3/4]',
  'aspect-[5/4]',
  'aspect-[4/5]',
  'aspect-[3/4]',
  'aspect-square',
  'aspect-[4/3]',
  'aspect-[4/5]',
  'aspect-[5/4]',
  'aspect-[3/4]',
];

/** Same columns as `Masonry`, so the real grid shows up without a jump. */
export function SourceGridSkeleton() {
  return (
    <div aria-hidden className="columns-2 gap-2.5 md:columns-3 lg:columns-4">
      {TILE_ASPECTS.map((aspect, index) => (
        <div
          key={index}
          className={cn(
            'mb-2.5 w-full animate-pulse break-inside-avoid rounded-md bg-muted motion-reduce:animate-none',
            aspect,
          )}
        />
      ))}
    </div>
  );
}
