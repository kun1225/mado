import {
  Cancel01Icon,
  SparklesIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { toast } from '@repo/ui/sonner';

import { TagName, useTagText } from '#/components/tag-name';
import { useUpdateSource } from '#/features/sources/hooks/source-hooks';
import type {
  Source,
  UpdateSourceInput,
} from '#/features/sources/source-types';

import { SourceDetailTagField } from './source-detail-tag-field';

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
      <h3 className="t-b-4 text-muted-fg">Tags</h3>

      <SourceDetailTagField tags={source.tags} onSave={save} />

      {suggested.length > 0 && (
        <SuggestedTags
          tags={suggested}
          onAccept={(tags) =>
            save({ addTags: tags, removeSuggestedTags: tags })
          }
          onReject={(tags) => save({ removeSuggestedTags: tags })}
        />
      )}
    </section>
  );
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
        {tags.map((tag) => (
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
  const name = useTagText()(tag);

  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-dashed border-border py-0.5 pr-1 pl-2.5 t-b-4 text-fg">
      <span className="truncate">
        <TagName tag={tag} />
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
