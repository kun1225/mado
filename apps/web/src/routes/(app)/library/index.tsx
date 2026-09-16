import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { Button } from '@repo/ui/button';

import {
  useCollections,
  useCreateCollection,
} from '#/features/collections/collection-hooks';

import { CollectionCard } from './-components/collection-card';
import { NewCollectionCard } from './-components/new-collection-card';

export const Route = createFileRoute('/(app)/library/')({ component: Library });

function Library() {
  const navigate = useNavigate();
  const collectionsQuery = useCollections();
  const createCollectionMutation = useCreateCollection();

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

      <div className="flex flex-1 items-center justify-center py-6">
        <Button>Add new source</Button>
      </div>
    </>
  );
}
