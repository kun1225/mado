import { Delete02Icon, RestoreBinIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';

import { Button } from '@repo/ui/button';
import { Separator } from '@repo/ui/separator';
import {
  createTooltipHandle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/tooltip';

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

// Varied heights so the placeholder reads as a masonry wall, not a table.
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

/** Same column widths as `Masonry`, so the real grid lands without a jump. */
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

const selectionTooltip = createTooltipHandle<string>();

/**
 * Floats over the grid, so the wrapper has to let clicks through to the cards
 * behind it - only the pill itself takes pointer events.
 *
 * The labels name tools the user is already reaching for, so they open on
 * arrival rather than after the usual reading pause.
 */
// *** SourceGridSelectionBar ***
function SourceGridSelectionBar({
  count,
  onClear,
  onDelete,
  onRestore,
  isPending,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  /** Only the trash offers this, so the button is absent everywhere else. */
  onRestore?: () => void;
  isPending?: boolean;
}) {
  return (
    <TooltipProvider delay={120}>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-action-bar flex justify-center px-edge">
        <div className="pointer-events-auto relative flex animate-in items-center gap-1 rounded-full border border-border bg-bg py-1 pr-2 pl-4 shadow-md duration-slow ease-out-back fade-in-0 slide-in-from-bottom-2">
          <p className="text-sm font-medium text-fg">{count} selected</p>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="rounded-full text-muted-fg"
          >
            Clear
          </Button>

          <Separator orientation="vertical" />

          {onRestore && (
            <TooltipTrigger
              handle={selectionTooltip}
              payload="Put back"
              aria-label="Put back"
              onClick={onRestore}
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  className="hit-area-1 rounded-full text-fg"
                />
              }
            >
              <HugeiconsIcon
                icon={RestoreBinIcon}
                size={16}
                strokeWidth={1.5}
              />
            </TooltipTrigger>
          )}

          <TooltipTrigger
            handle={selectionTooltip}
            payload="Delete"
            aria-label="Delete"
            onClick={onDelete}
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                className="hit-area-1 rounded-full text-danger hover:bg-danger/10 hover:text-danger"
              />
            }
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
          </TooltipTrigger>
        </div>

        <Tooltip handle={selectionTooltip}>
          {({ payload }) => <TooltipContent>{payload}</TooltipContent>}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
