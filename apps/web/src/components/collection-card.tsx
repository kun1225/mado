import { Link } from '@tanstack/react-router';

import { cn } from '@repo/ui/cn';

import { CollectionContextMenu } from '#/components/collection-context-menu/collection-context-menu';
import { useCollectionPreviews } from '#/features/collections/collection-hooks';
import type { Collection } from '#/features/collections/collection-types';
import { useSourceDropzone } from '#/features/sources/hooks/source-interaction-hooks';

import { CollectionCardPocket } from './collection-card-pocket';

export function CollectionCard({ collection }: { collection: Collection }) {
  const { getRootProps, isDragActive } = useSourceDropzone(collection.id);
  const previews = useCollectionPreviews(collection.id);

  // The drop target wraps the link, so the link keeps its own role.
  return (
    <CollectionContextMenu collection={collection}>
      <div {...getRootProps()}>
        <Link
          to="/collection/$collectionId"
          params={{ collectionId: collection.id }}
          className={cn(
            'group relative block size-48 rounded-md border border-border text-left text-fg transition-[border-color,background-color,scale] hover:border-fg',
            isDragActive && 'scale-[1.02] border-accent bg-accent/10',
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-14 flex items-center justify-center">
            <CollectionCardPocket
              previews={previews}
              color={collection.color}
            />
          </div>

          <div className="absolute inset-x-4 bottom-3 min-w-0">
            <p className="truncate t-l-2">{collection.name}</p>
            <p className="t-b-3 text-muted-fg">
              {collection.saveCount}{' '}
              {collection.saveCount === 1 ? 'save' : 'saves'}
            </p>
          </div>
        </Link>
      </div>
    </CollectionContextMenu>
  );
}

const SKELETON_COUNT = 3;

/** Same size as `CollectionCard`, so real cards replace it without a jump. */
export function CollectionCardSkeletons() {
  return Array.from({ length: SKELETON_COUNT }, (_, index) => (
    <div
      key={index}
      aria-hidden
      className="size-48 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
    />
  ));
}
