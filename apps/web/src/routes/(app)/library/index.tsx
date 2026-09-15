import { createFileRoute, useNavigate } from '@tanstack/react-router';

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
    <section className="flex flex-row flex-nowrap gap-4 py-6">
      <NewCollectionCard
        disabled={createCollectionMutation.isPending}
        onClick={handleCreateCollection}
      />

      {collectionsQuery.data?.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </section>
  );
}
