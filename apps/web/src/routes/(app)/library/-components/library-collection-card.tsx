import { Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';

import type { Collection } from '#/features/collections/collection-types';
import { useSourceDropzone } from '#/features/sources/hooks/source-interaction-hooks';

export function LibraryCollectionCard({
  collection,
}: {
  collection: Collection;
}) {
  const { getRootProps, isDragActive } = useSourceDropzone(collection.id);

  return (
    // The drop target wraps the link, so the link keeps its own role.
    <div {...getRootProps()}>
      <Link
        to="/collection/$collectionId"
        params={{ collectionId: collection.id }}
        className={cn(
          'relative flex size-48 flex-col items-center justify-center gap-5 rounded-md border border-border p-6 text-left text-fg transition-[border-color,background-color,scale] hover:border-fg',
          isDragActive && 'scale-[1.02] border-accent bg-accent/10',
        )}
      >
        <HugeiconsIcon icon={Folder01Icon} size={32} strokeWidth={1.5} />

        <div className="absolute inset-x-4 bottom-3 min-w-0">
          <p className="truncate text-sm font-medium">{collection.name}</p>
          <p className="text-sm text-muted-fg">{collection.saveCount} saves</p>
        </div>
      </Link>
    </div>
  );
}
