import { cn } from 'cn';

import { useCollections } from '#/features/collections/collection-hooks';
import { useSourceSelection } from '#/features/sources/hooks/use-source-selection';

import { useDeleteSource } from '../../../features/sources/source-hooks';
import type { Source } from '../../../features/sources/source-types';

import { Masonry } from './masonry';
import { SourceCard } from './source-card';
import { SourceSelectionBar } from './source-selection-bar';

export function SourceGrid({
  sources,
  showCollection,
  onDelete,
  deletingId,
}: {
  sources: Source[];
  showCollection?: boolean;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
}) {
  const collectionsQuery = useCollections();
  const deleteSourceMutation = useDeleteSource();
  const selection = useSourceSelection(sources);

  const softDeletingId = deleteSourceMutation.isPending
    ? deleteSourceMutation.variables
    : null;

  const collectionNames = new Map(
    collectionsQuery.data?.map((collection) => [
      collection.id,
      collection.name,
    ]),
  );

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
                isPending: source.id === (deletingId ?? softDeletingId),
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
        />
      )}
    </>
  );
}
