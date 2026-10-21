import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { toast } from '@repo/ui/sonner';

import {
  CollectionCard,
  CollectionCardSkeletons,
} from '#/components/collection-card';
import { CollectionNewCard } from '#/components/collection-new-card';
import { ScrollFade } from '#/components/scroll-fade';
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
      <ScrollFade
        className="mb-5 pt-6 pb-1"
        contentClassName="flex flex-row gap-4 *:shrink-0"
      >
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
      </ScrollFade>

      <SourceDropZone
        collectionId={null}
        label="Library"
        className="flex flex-1 flex-col"
      >
        {/* The store is browser-only, so show a skeleton instead of flashing "Nothing here yet". */}
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
    </>
  );
}
