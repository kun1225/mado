import { useCollections } from '#/features/collections/collection-hooks';

import { useDeleteSource } from '../../../features/sources/source-hooks';
import type { Source } from '../../../features/sources/source-types';

import { SourceCard } from './source-card';

/**
 * `showCollection` labels each card with the collection it sits in, for views
 * that mix sources from several collections.
 */
export function SourceGrid({
  sources,
  showCollection,
}: {
  sources: Source[];
  showCollection?: boolean;
}) {
  const collectionsQuery = useCollections();
  const deleteSourceMutation = useDeleteSource();

  const collectionNames = new Map(
    collectionsQuery.data?.map((collection) => [
      collection.id,
      collection.name,
    ]),
  );

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-4">
      {sources.map((source) => (
        <li key={source.id}>
          <SourceCard
            source={source}
            collectionName={
              showCollection && source.collectionId
                ? collectionNames.get(source.collectionId)
                : undefined
            }
            onDelete={deleteSourceMutation.mutate}
            isDeleting={
              deleteSourceMutation.isPending &&
              deleteSourceMutation.variables === source.id
            }
          />
        </li>
      ))}
    </ul>
  );
}
