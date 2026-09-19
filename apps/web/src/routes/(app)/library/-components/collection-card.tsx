import { Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link } from '@tanstack/react-router';

import type { Collection } from '#/features/collections/collection-types';

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link
      to="/collection/$collectionId"
      params={{ collectionId: collection.id }}
      className="relative flex size-48 flex-col items-center justify-center gap-5 rounded-md border border-border p-6 text-left text-fg transition-colors hover:border-fg"
    >
      <HugeiconsIcon icon={Folder01Icon} size={32} strokeWidth={1.5} />

      <div className="absolute inset-x-4 bottom-3 min-w-0">
        <p className="truncate text-sm font-medium">{collection.name}</p>
        <p className="text-sm text-muted-fg">{collection.saveCount} saves</p>
      </div>
    </Link>
  );
}
