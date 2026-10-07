import { Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  MorphDropdownMenu,
  MorphDropdownMenuContent,
  MorphDropdownMenuItem,
  MorphDropdownMenuSeparator,
  MorphDropdownMenuSub,
  MorphDropdownMenuSubContent,
  MorphDropdownMenuSubTrigger,
  MorphDropdownMenuTrigger,
} from '@repo/ui/morph-dropdown-menu';

import { useCollections } from '#/features/collections/collection-hooks';
import type { Collection } from '#/features/collections/collection-types';
import { useUpdateSource } from '#/features/sources/hooks/source-hooks';
import type {
  Source,
  UpdateSourceInput,
} from '#/features/sources/source-types';

import { SourceDetailChip } from './source-detail-chip';

export function SourceDetailCollections({ source }: { source: Source }) {
  const collectionsQuery = useCollections();
  const updateSourceMutation = useUpdateSource();

  const collections = collectionsQuery.data ?? [];
  const joined = collections.filter(({ id }) =>
    source.collectionIds.includes(id),
  );
  const nodes = buildAvailableTree(collections, source.collectionIds);

  function save(input: UpdateSourceInput) {
    updateSourceMutation.mutate({ id: source.id, input });
  }

  function add(id: string) {
    save({ addCollectionIds: [id] });
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-xs text-muted-fg">
        <HugeiconsIcon icon={Folder01Icon} size={14} strokeWidth={1.5} />
        Collections
      </h3>

      <div className="flex flex-wrap items-center gap-1.5">
        {joined.map((collection) => (
          <SourceDetailChip
            key={collection.id}
            label={collection.name}
            onRemove={() => save({ removeCollectionIds: [collection.id] })}
          />
        ))}

        <MorphDropdownMenu>
          <MorphDropdownMenuTrigger className="h-auto rounded-full px-2.5 py-0.5 text-xs text-muted-fg hover:text-fg">
            + Add
          </MorphDropdownMenuTrigger>
          <MorphDropdownMenuContent align="start">
            {nodes.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-fg">
                {collections.length === 0
                  ? 'No collections yet.'
                  : 'In every collection already.'}
              </p>
            )}
            {nodes.map((node) => (
              <CollectionMenuNode
                key={node.collection.id}
                node={node}
                onAdd={add}
              />
            ))}
          </MorphDropdownMenuContent>
        </MorphDropdownMenu>
      </div>
    </section>
  );
}

// *** CollectionMenuNode ***

function CollectionMenuNode({
  node,
  onAdd,
}: {
  node: CollectionNode;
  onAdd: (id: string) => void;
}) {
  const { collection, children, isAvailable } = node;

  if (children.length === 0) {
    return (
      <MorphDropdownMenuItem onClick={() => onAdd(collection.id)}>
        {collection.name}
      </MorphDropdownMenuItem>
    );
  }

  return (
    <MorphDropdownMenuSub>
      <MorphDropdownMenuSubTrigger>
        {collection.name}
      </MorphDropdownMenuSubTrigger>
      <MorphDropdownMenuSubContent>
        {isAvailable && (
          <>
            <MorphDropdownMenuItem onClick={() => onAdd(collection.id)}>
              {collection.name}
            </MorphDropdownMenuItem>
            <MorphDropdownMenuSeparator />
          </>
        )}
        {children.map((child) => (
          <CollectionMenuNode
            key={child.collection.id}
            node={child}
            onAdd={onAdd}
          />
        ))}
      </MorphDropdownMenuSubContent>
    </MorphDropdownMenuSub>
  );
}

// *** buildAvailableTree ***

type CollectionNode = {
  collection: Collection;
  isAvailable: boolean;
  children: CollectionNode[];
};

/** Keeps a collection when it, or anything under it, can still be joined. */
function buildAvailableTree(
  collections: Collection[],
  joinedIds: string[],
  parentId: string | null = null,
): CollectionNode[] {
  return collections
    .filter((collection) => collection.parentId === parentId)
    .map((collection) => ({
      collection,
      isAvailable: !joinedIds.includes(collection.id),
      children: buildAvailableTree(collections, joinedIds, collection.id),
    }))
    .filter((node) => node.isAvailable || node.children.length > 0);
}
