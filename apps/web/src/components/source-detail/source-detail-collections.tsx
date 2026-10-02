import { useState } from 'react';
import { Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { useCollections } from '#/features/collections/collection-hooks';
import { useUpdateSource } from '#/features/sources/source-hooks';
import type {
  Source,
  UpdateSourceInput,
} from '#/features/sources/source-types';

import { SourceDetailChip } from './source-detail-chip';

export function SourceDetailCollections({ source }: { source: Source }) {
  const collectionsQuery = useCollections();
  const updateSourceMutation = useUpdateSource();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const collections = collectionsQuery.data ?? [];
  const joined = collections.filter(({ id }) =>
    source.collectionIds.includes(id),
  );
  const available = collections.filter(
    ({ id }) => !source.collectionIds.includes(id),
  );

  function save(input: UpdateSourceInput) {
    updateSourceMutation.mutate({ id: source.id, input });
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

        <button
          type="button"
          aria-expanded={isPickerOpen}
          onClick={() => setIsPickerOpen((isOpen) => !isOpen)}
          className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-fg hover:text-fg"
        >
          + Add
        </button>
      </div>

      {isPickerOpen && (
        <ul className="flex max-h-40 flex-col overflow-y-auto rounded-md border border-border p-1">
          {available.length === 0 && (
            <li className="px-2 py-1.5 text-xs text-muted-fg">
              {collections.length === 0
                ? 'No collections yet.'
                : 'In every collection already.'}
            </li>
          )}

          {available.map((collection) => (
            <li key={collection.id}>
              <button
                type="button"
                onClick={() => save({ addCollectionIds: [collection.id] })}
                className="w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                {collection.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
