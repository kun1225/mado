import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { toast } from '@repo/ui/sonner';

import { AddSourceButton } from '#/components/add-source-button';
import {
  CollectionCard,
  CollectionCardSkeletons,
} from '#/components/collection-card';
import { CollectionNewCard } from '#/components/collection-new-card';
import { SourceDropZone } from '#/components/source-drop-zone';
import { SourceGrid, SourceGridSkeleton } from '#/components/source-grid';
import { SourcesEmptyState } from '#/components/sources-empty-state';
import {
  useChildCollections,
  useCreateCollection,
} from '#/features/collections/collection-hooks';
import { useAllSources } from '#/features/sources/hooks/source-hooks';

export const Route = createFileRoute('/(app)/library/')({ component: Library });

function Library() {
  const navigate = useNavigate();
  const collectionsQuery = useChildCollections(null);
  const createCollectionMutation = useCreateCollection();
  const sourcesQuery = useAllSources();

  function handleCreateCollection() {
    createCollectionMutation.mutate(undefined, {
      onSuccess: (collection) =>
        navigate({
          to: '/collection/$collectionId',
          params: { collectionId: collection.id },
        }),
      onError: () => toast.error('Could not create the collection. Try again.'),
    });
  }

  return (
    <>
      <section className="flex flex-row flex-nowrap gap-4 overflow-y-auto py-6 *:shrink-0">
        <CollectionNewCard
          disabled={createCollectionMutation.isPending}
          onClick={handleCreateCollection}
        />

        {collectionsQuery.isPending ? (
          <CollectionCardSkeletons />
        ) : (
          collectionsQuery.data?.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))
        )}
      </section>

      <SourceDropZone
        collectionId={null}
        label="Library"
        className="flex flex-1 flex-col"
      >
        {/* The store is browser-only: show a skeleton while it loads rather
            than flash "Nothing here yet" at someone with a full library. */}
        {sourcesQuery.isPending ? (
          <SourceGridSkeleton />
        ) : sourcesQuery.isError ? (
          <p className="flex flex-1 items-center justify-center py-6 text-sm text-danger">
            Unable to load your library.
          </p>
        ) : sourcesQuery.data.length > 0 ? (
          <SourceGrid sources={sourcesQuery.data} showCollection />
        ) : (
          <div className="flex flex-1 items-center justify-center py-6">
            <SourcesEmptyState />
          </div>
        )}
      </SourceDropZone>

      <AddSourceButton collectionId={null} />
    </>
  );
}
