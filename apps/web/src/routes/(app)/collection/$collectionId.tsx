import { useRef } from 'react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { Input } from '@repo/ui/input';
import { Separator } from '@repo/ui/separator';

import {
  useCollection,
  useDeleteCollection,
  useUpdateCollection,
} from '#/features/collections/collection-hooks';
import { useSources } from '#/features/sources/source-hooks';
import { AddSourceButton } from '#/routes/(app)/-components/add-source-button';
import { SourceGrid } from '#/routes/(app)/-components/source-grid';

import { NewCollectionCard } from '../library/-components/new-collection-card';

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
          to="/library"
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

      <div className="py-6">
        <NewCollectionCard label="New folder" />
      </div>

      {sourcesQuery.data && sourcesQuery.data.length > 0 ? (
        <div className="flex grow flex-col gap-6 py-6">
          <AddSourceButton collectionId={collectionId} />
          <SourceGrid sources={sourcesQuery.data} />
        </div>
      ) : (
        <div className="flex grow items-center justify-center py-6">
          <AddSourceButton collectionId={collectionId} />
        </div>
      )}
    </div>
  );
}
