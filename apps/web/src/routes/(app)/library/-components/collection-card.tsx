import { Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link } from '@tanstack/react-router';

import type { Collection } from '#/features/collections/collection-types';

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link
      to="/collection/$collectionId"
      params={{ collectionId: collection.id }}
      className="border-border text-fg hover:border-fg relative flex size-48 flex-col items-center justify-center gap-5 rounded-md border p-6 text-left transition-colors"
    >
      <HugeiconsIcon icon={Folder01Icon} size={32} strokeWidth={1.5} />

      <div className="absolute bottom-3 left-4">
        <p className="text-sm font-medium">{collection.name}</p>
        <p className="text-muted-fg text-sm">{collection.saveCount} saves</p>
      </div>
    </Link>
  );
}
