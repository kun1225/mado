import { useCollections } from '#/features/collections/collection-hooks';

import { useDeleteSource } from '../../../features/sources/source-hooks';
import type { Source } from '../../../features/sources/source-types';

import { Masonry } from './masonry';
import { SourceCard } from './source-card';

export function SourceGrid({
  sources,
  showCollection,
  onDelete,
  deletingId,
}: {
  sources: Source[];
  showCollection?: boolean;
  /** The Deleted tab swaps the soft delete for a confirmed hard delete. */
  onDelete?: (id: string) => void;
  deletingId?: string | null;
}) {
  const collectionsQuery = useCollections();
  const deleteSourceMutation = useDeleteSource();

  // Only one of the two can be running: the mutation stays idle when the
  // caller brings its own delete.
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
    <Masonry items={sources} getKey={(source) => source.id}>
      {(source) => (
        <SourceCard
          source={source}
          collectionName={
            showCollection && source.collectionId
              ? collectionNames.get(source.collectionId)
              : undefined
          }
          onDelete={onDelete ?? deleteSourceMutation.mutate}
          isDeleting={source.id === (deletingId ?? softDeletingId)}
        />
      )}
    </Masonry>
  );
}
