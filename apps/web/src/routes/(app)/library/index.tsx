import { createFileRoute, useNavigate } from '@tanstack/react-router';

import {
  useCollections,
  useCreateCollection,
} from '#/features/collections/collection-hooks';
import { useAllSources } from '#/features/sources/source-hooks';
import { AddSourceButton } from '#/routes/(app)/-components/add-source-button';
import { SourceGrid } from '#/routes/(app)/-components/source-grid';

import { CollectionCard } from './-components/collection-card';
import { NewCollectionCard } from './-components/new-collection-card';

export const Route = createFileRoute('/(app)/library/')({ component: Library });

function Library() {
  const navigate = useNavigate();
  const collectionsQuery = useCollections();
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
        <NewCollectionCard
          disabled={createCollectionMutation.isPending}
          onClick={handleCreateCollection}
        />

        {collectionsQuery.data?.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </section>

      {sourcesQuery.data && sourcesQuery.data.length > 0 ? (
        <div className="flex flex-1 flex-col gap-6 py-6">
          <AddSourceButton collectionId={null} />
          <SourceGrid sources={sourcesQuery.data} showCollection />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center py-6">
          <AddSourceButton collectionId={null} />
        </div>
      )}
    </>
  );
}
