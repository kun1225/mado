import { cn } from '@repo/ui/cn';

import { useCollections } from '#/features/collections/collection-hooks';
import { useShortcuts } from '#/features/shortcuts/shortcuts-hooks';
import {
  useCompressingSourceIds,
  useDeleteSource,
  useDeleteSources,
} from '#/features/sources/hooks/source-hooks';
import {
  useSourceDetail,
  useSourceSelection,
} from '#/features/sources/hooks/source-interaction-hooks';
import type { SitePendingSource } from '#/features/sources/site-source.type';
import { useSourceCaption } from '#/features/sources/source-preferences';
import type { Source } from '#/features/sources/source-types';

import { ActionDockSelection } from './action-dock/action-dock-selection';
import { SourceDetailDialog } from './source-detail/source-detail-dialog';
import { Masonry } from './masonry';
import { SourceCard, SourceCardLoading } from './source-card';

export function SourceGrid({
  sources,
  pendingSites = [],
  showCollection,
  canOpenDetail = true,
  onDelete,
  onBulkDelete,
  onBulkRestore,
  deletingIds,
  isBulkPending,
}: {
  sources: Source[];
  /** First, because new sources land at the top. */
  pendingSites?: SitePendingSource[];
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
  const { sourceCaption } = useSourceCaption();

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
  const isPending = isBulkPending ?? deleteSourcesMutation.isPending;

  function handleBulkDelete() {
    (onBulkDelete ?? deleteSourcesMutation.mutate)(selectedIds);
  }

  // The same path as the Delete button, so the trash still asks before it deletes for good.
  useShortcuts(
    {
      // With nothing to select, leave Cmd/Ctrl+A to the browser.
      'select-all': sources.length > 0 ? selection.selectAll : undefined,
      'delete-selected': () => {
        if (!isPending) handleBulkDelete();
      },
    },
    selection.isSelectionMode,
  );

  function handleBulkRestore() {
    onBulkRestore?.(selectedIds);
  }

  return (
    <>
      <div
        className={cn(
          '-mx-edge px-2.5',
          selection.isSelectionMode && 'select-none',
        )}
      >
        <Masonry
          items={[...hideSavedSites(pendingSites, sources), ...sources]}
          getKey={(item) => item.id}
          layoutKey={sourceCaption}
        >
          {(source) =>
            source.kind === 'pending-site' ? (
              <SourcePendingCard site={source} />
            ) : (
              <SourceCard
                source={source}
                isCompressing={compressingIds.has(source.id)}
                captionPosition={sourceCaption}
                collectionName={
                  showCollection
                    ? source.collectionIds
                        .map((id) => collectionNames.get(id))
                        .filter(Boolean)
                        .join(', ') || undefined
                    : undefined
                }
                onOpen={
                  canOpenDetail
                    ? () => detail.setActiveId(source.id)
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
            )
          }
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
          isPending={isPending}
        />
      )}
    </>
  );
}

// *** hideSavedSites ***
// The list refetches before the add settles, so for a moment both share an id.
function hideSavedSites(pendingSites: SitePendingSource[], sources: Source[]) {
  const savedIds = new Set(sources.map((source) => source.id));

  return pendingSites.filter((site) => !savedIds.has(site.id));
}

// *** SourcePendingCard ***
// The OG image ratio, because most website thumbnails are OG images and the real card lands without a jump.
const PENDING_SITE_RATIO = 1200 / 630;

function SourcePendingCard({ site }: { site: SitePendingSource }) {
  return (
    <div
      style={{ aspectRatio: PENDING_SITE_RATIO }}
      className="relative flex flex-col justify-end overflow-hidden rounded-md bg-muted p-4"
    >
      <p className="truncate t-b-4 text-muted-fg">{site.domain}</p>
      <SourceCardLoading label={`Adding ${site.domain}`} />
    </div>
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
    <div
      aria-hidden
      className="-mx-edge columns-2 gap-2.5 px-2.5 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6"
    >
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
