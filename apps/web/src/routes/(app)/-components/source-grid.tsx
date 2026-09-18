import { useCollections } from '#/features/collections/collection-hooks';

import { useDeleteSource } from '../../../features/sources/source-hooks';
import type { Source } from '../../../features/sources/source-types';

import { Masonry } from './masonry';
import { SourceCard } from './source-card';

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
    <Masonry items={sources} getKey={(source) => source.id}>
      {(source) => (
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
      )}
    </Masonry>
  );
}
