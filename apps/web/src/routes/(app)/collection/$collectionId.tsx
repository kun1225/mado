import { useRef } from 'react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { Input } from '@repo/ui/input';
import { Separator } from '@repo/ui/separator';

import { AddSourceButton } from '#/components/add-source-button';
import { CollectionNewCard } from '#/components/collection-new-card';
import { SourceDropZone } from '#/components/source-drop-zone';
import { SourceGrid } from '#/components/source-grid';
import { SourcesEmptyState } from '#/components/sources-empty-state';
import {
  useChildCollections,
  useCollection,
  useCreateCollection,
  useDeleteCollection,
  useUpdateCollection,
} from '#/features/collections/collection-hooks';
import { useSources } from '#/features/sources/hooks/source-hooks';

import { LibraryCollectionCard } from '../library/-components/library-collection-card';

import { CollectionMenu } from './-components/collection-menu';

export const Route = createFileRoute('/(app)/collection/$collectionId')({
  component: CollectionPage,
});

function CollectionPage() {
  const { collectionId } = Route.useParams();
  const navigate = useNavigate();
  const collectionQuery = useCollection(collectionId);
  const updateCollectionMutation = useUpdateCollection();
  const deleteCollectionMutation = useDeleteCollection();
  const createCollectionMutation = useCreateCollection();
  const childCollectionsQuery = useChildCollections(collectionId);
  const sourcesQuery = useSources(collectionId);
  const nameInputRef = useRef<HTMLInputElement>(null);

  if (collectionQuery.isPending) return <p>Loading...</p>;
  if (collectionQuery.isError) {
    return <p>Unable to load this collection.</p>;
  }
  if (!collectionQuery.data) return <p>Collection not found.</p>;

  const collection = collectionQuery.data;
  const collectionName = collection.name;

  function handleDelete() {
    deleteCollectionMutation.mutate(collectionId, {
      onSuccess: () => {
        void navigate({ to: '/library' });
      },
    });
  }

  async function handleCreateChild() {
    const child = await createCollectionMutation.mutateAsync({
      parentId: collectionId,
    });

    await navigate({
      to: '/collection/$collectionId',
      params: { collectionId: child.id },
    });
  }

  function handleNameBlur(event: React.FocusEvent<HTMLInputElement>) {
    const inputElement = event.currentTarget;
    const name = inputElement.value.trim();

    if (!name || name === collectionName) {
      inputElement.value = collectionName;
      updateCollectionMutation.reset();
      return;
    }

    updateCollectionMutation.mutate(
      { id: collectionId, input: { name } },
      {
        onError: () => {
          inputElement.value = collectionName;
        },
      },
    );
  }

  function handleNameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      event.currentTarget.value = collectionName;
      event.currentTarget.blur();
    }
  }

  function handleRename() {
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }

  return (
    <div className="flex min-h-svh flex-col pt-16 pb-6">
      <div className="flex h-11 items-center gap-1">
        <Link
          {...(collection.parentId
            ? {
                to: '/collection/$collectionId' as const,
                params: { collectionId: collection.parentId },
              }
            : { to: '/library' as const })}
          className="flex size-8 items-center justify-center rounded-md text-fg transition-colors hover:bg-muted"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} />
        </Link>

        <Input
          ref={nameInputRef}
          key={collectionName}
          defaultValue={collectionName}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          aria-invalid={updateCollectionMutation.isError}
          className="field-sizing-content h-8 w-auto border-transparent px-3 text-2xl font-semibold"
        />

        <CollectionMenu
          collection={collection}
          onRename={handleRename}
          onDelete={handleDelete}
          isDeleting={deleteCollectionMutation.isPending}
          isDeleteError={deleteCollectionMutation.isError}
        />
      </div>

      {updateCollectionMutation.isError && (
        <p className="text-destructive mt-1 text-sm">
          Failed to update collection name.
        </p>
      )}

      <Separator className="mt-3" />

      <section className="flex flex-row flex-nowrap gap-4 overflow-y-auto py-6 *:shrink-0">
        <CollectionNewCard
          label="New folder"
          disabled={createCollectionMutation.isPending}
          onClick={handleCreateChild}
        />

        {childCollectionsQuery.data?.map((child) => (
          <LibraryCollectionCard key={child.id} collection={child} />
        ))}
      </section>

      <SourceDropZone
        collectionId={collectionId}
        label={collectionName}
        className="flex grow flex-col"
      >
        {sourcesQuery.data && sourcesQuery.data.length > 0 ? (
          <SourceGrid sources={sourcesQuery.data} />
        ) : (
          <div className="flex grow items-center justify-center py-6">
            <SourcesEmptyState />
          </div>
        )}
      </SourceDropZone>

      <AddSourceButton collectionId={collectionId} />
    </div>
  );
}
