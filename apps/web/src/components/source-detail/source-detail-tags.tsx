import { useId, useState } from 'react';
import {
  Cancel01Icon,
  SparklesIcon,
  Tag01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Input } from '@repo/ui/input';
import { toast } from '@repo/ui/sonner';

import {
  useAllSources,
  useUpdateSource,
} from '#/features/sources/hooks/source-hooks';
import {
  countTags,
  normalizeTag,
  parseTag,
  SOURCE_FACET_STARTERS,
  SOURCE_FACETS,
} from '#/features/sources/source-tags';
import type {
  Source,
  UpdateSourceInput,
} from '#/features/sources/source-types';

import { SourceDetailChip } from './source-detail-chip';

export function SourceDetailTags({ source }: { source: Source }) {
  const updateSourceMutation = useUpdateSource();
  const suggested = source.suggestedTags ?? [];

  function save(input: UpdateSourceInput) {
    updateSourceMutation.mutate(
      { id: source.id, input },
      { onError: () => toast.error('Could not save the tags. Try again.') },
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 t-b-4 text-muted-fg">
        <HugeiconsIcon icon={Tag01Icon} size={14} strokeWidth={1.5} />
        Tags
      </h3>

      {source.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {sortByFacet(source.tags).map((tag) => {
            const { facet, value } = parseTag(tag);
            return (
              <SourceDetailChip
                key={tag}
                label={value}
                prefix={facet ?? undefined}
                onRemove={() => save({ removeTags: [tag] })}
              />
            );
          })}
        </div>
      )}

      {suggested.length > 0 && (
        <SuggestedTags
          tags={suggested}
          onAccept={(tags) =>
            save({ addTags: tags, removeSuggestedTags: tags })
          }
          onReject={(tags) => save({ removeSuggestedTags: tags })}
        />
      )}

      <TagInput
        currentTags={source.tags}
        onAdd={(tag) => save({ addTags: [tag], removeSuggestedTags: [tag] })}
      />
    </section>
  );
}

// *** sortByFacet ***
// Facet tags first, in facet order, so the same kind of tag sits together on every source.
function sortByFacet(tags: string[]): string[] {
  const rank = (tag: string) => {
    const { facet } = parseTag(tag);
    return facet ? SOURCE_FACETS.indexOf(facet) : SOURCE_FACETS.length;
  };

  return [...tags].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

// *** SuggestedTags ***
function SuggestedTags({
  tags,
  onAccept,
  onReject,
}: {
  tags: string[];
  onAccept: (tags: string[]) => void;
  onReject: (tags: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between t-b-4 text-muted-fg">
        <span className="flex items-center gap-1">
          <HugeiconsIcon icon={SparklesIcon} size={12} strokeWidth={1.5} />
          Suggested
        </span>
        <button
          type="button"
          aria-label="Accept all suggested tags"
          onClick={() => onAccept(tags)}
          className="hover:text-fg"
        >
          Accept all
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {sortByFacet(tags).map((tag) => (
          <SuggestedChip
            key={tag}
            tag={tag}
            onAccept={() => onAccept([tag])}
            onReject={() => onReject([tag])}
          />
        ))}
      </div>
    </div>
  );
}

// *** SuggestedChip ***
// Dashed, so a suggestion never looks like a tag the user chose.
function SuggestedChip({
  tag,
  onAccept,
  onReject,
}: {
  tag: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { facet, value } = parseTag(tag);
  const name = facet ? `${facet} ${value}` : value;

  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-dashed border-border py-0.5 pr-1 pl-2.5 t-b-4 text-fg">
      <span className="truncate">
        {facet && <span className="text-muted-fg">{facet} · </span>}
        {value}
      </span>
      <button
        type="button"
        aria-label={`Accept ${name}`}
        onClick={onAccept}
        className="flex size-4 items-center justify-center rounded-full text-muted-fg hover:text-fg"
      >
        <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        aria-label={`Reject ${name}`}
        onClick={onReject}
        className="flex size-4 items-center justify-center rounded-full text-muted-fg hover:text-fg"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.5} />
      </button>
    </span>
  );
}

// *** TagInput ***
function TagInput({
  currentTags,
  onAdd,
}: {
  currentTags: string[];
  onAdd: (tag: string) => void;
}) {
  const listId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const options = useTagOptions(currentTags);

  function submit() {
    if (draft.trim() === '') return;
    const tag = normalizeTag(draft);
    if (!tag) {
      setError('Use short words, like "handmade" or "style:minimal".');
      return;
    }
    if (!currentTags.includes(tag)) onAdd(tag);
    setDraft('');
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        list={listId}
        value={draft}
        placeholder="Add a tag, like style:minimal"
        aria-label="Add a tag"
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          submit();
        }}
        className="h-8 t-b-3 text-fg"
      />
      <datalist id={listId}>
        {options.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
      {error && (
        <p id={errorId} role="alert" className="t-b-4 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// *** useTagOptions ***
// The user's own tags come first, so the library keeps one word for one idea.
function useTagOptions(currentTags: string[]): string[] {
  const sourcesQuery = useAllSources();
  const used = countTags(sourcesQuery.data ?? []).map(({ tag }) => tag);
  const starters = SOURCE_FACETS.flatMap((facet) =>
    SOURCE_FACET_STARTERS[facet].map((value) => `${facet}:${value}`),
  );

  return [...new Set([...used, ...starters])].filter(
    (tag) => !currentTags.includes(tag),
  );
}
