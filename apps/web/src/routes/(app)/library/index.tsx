import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { AddSourceButton } from '#/components/add-source-button';
import { CollectionNewCard } from '#/components/collection-new-card';
import { SourceGrid } from '#/components/source-grid';
import { SourcesEmptyState } from '#/components/sources-empty-state';
import {
  useChildCollections,
  useCreateCollection,
} from '#/features/collections/collection-hooks';
import { useAllSources } from '#/features/sources/source-hooks';

import { LibraryCollectionCard } from './-components/library-collection-card';

export const Route = createFileRoute('/(app)/library/')({ component: Library });

function Library() {
  const navigate = useNavigate();
  const collectionsQuery = useChildCollections(null);
  const createCollectionMutation = useCreateCollection();
  const sourcesQuery = useAllSources();

  async function handleCreateCollection() {
    const collection = await createCollectionMutation.mutateAsync();

    await navigate({
      to: '/collection/$collectionId',
      params: { collectionId: collection.id },
    });
  }

  return (
    <>
      <section className="flex flex-row flex-nowrap gap-4 overflow-y-auto pt-6 pb-2 *:shrink-0">
        <CollectionNewCard
          disabled={createCollectionMutation.isPending}
          onClick={handleCreateCollection}
        />

        {collectionsQuery.data?.map((collection) => (
          <LibraryCollectionCard key={collection.id} collection={collection} />
        ))}
      </section>

      {sourcesQuery.data && sourcesQuery.data.length > 0 ? (
        <div className="flex flex-1 flex-col pt-6 pb-24">
          <SourceGrid sources={sourcesQuery.data} showCollection />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center py-6">
          <SourcesEmptyState />
        </div>
      )}

      <AddSourceButton collectionId={null} />
    </>
  );
}
