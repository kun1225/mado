import { useId, useState } from 'react';
import { Tag01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  useAllTags,
  useUpdateSource,
} from '#/features/sources/hooks/source-hooks';
import type {
  Source,
  UpdateSourceInput,
} from '#/features/sources/source-types';
import { MAX_TAG_LENGTH, normalizeTag } from '#/features/sources/source-types';

import { SourceDetailChip } from './source-detail-chip';

export function SourceDetailTags({ source }: { source: Source }) {
  const suggestionsId = useId();
  const allTags = useAllTags();
  const updateSourceMutation = useUpdateSource();
  const [draft, setDraft] = useState('');

  function save(input: UpdateSourceInput) {
    updateSourceMutation.mutate({ id: source.id, input });
  }

  function addDraft() {
    const tag = normalizeTag(draft);

    setDraft('');
    if (tag === '' || source.tags.includes(tag)) return;
    save({ addTags: [tag] });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addDraft();
    } else if (
      event.key === 'Backspace' &&
      draft === '' &&
      source.tags.length > 0
    ) {
      save({ removeTags: source.tags.slice(-1) });
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-xs text-muted-fg">
        <HugeiconsIcon icon={Tag01Icon} size={14} strokeWidth={1.5} />
        Tags
      </h3>

      <div className="flex flex-wrap items-center gap-1.5">
        {source.tags.map((tag) => (
          <SourceDetailChip
            key={tag}
            label={tag}
            onRemove={() => save({ removeTags: [tag] })}
          />
        ))}

        <input
          list={suggestionsId}
          value={draft}
          maxLength={MAX_TAG_LENGTH}
          placeholder="+ Add"
          aria-label="Add a tag"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addDraft}
          className="w-20 min-w-0 flex-1 bg-transparent px-1 py-0.5 text-base outline-none placeholder:text-muted-fg md:text-xs"
        />

        <datalist id={suggestionsId}>
          {allTags
            .filter((tag) => !source.tags.includes(tag))
            .map((tag) => (
              <option key={tag} value={tag} />
            ))}
        </datalist>
      </div>
    </section>
  );
}
