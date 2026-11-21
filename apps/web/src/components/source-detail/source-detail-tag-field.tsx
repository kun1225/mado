import { useId, useRef, useState } from 'react';

import type { ComboboxChangeDetails } from '@repo/ui/combobox';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
} from '@repo/ui/combobox';

import { TagName, useTagText } from '#/components/tag-name';
import { useAllSources } from '#/features/sources/hooks/source-hooks';
import {
  countTags,
  normalizeTag,
  searchTags,
} from '#/features/sources/source-tags';
import type { SourceTagCount } from '#/features/sources/source-tags.type';
import type { UpdateSourceInput } from '#/features/sources/source-types';

/** The source's tags as chips, then a field that finds the user's own tags or makes a new one. */
export function SourceDetailTagField({
  tags,
  onSave,
}: {
  tags: string[];
  onSave: (input: UpdateSourceInput) => void;
}) {
  const errorId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tagText = useTagText();
  const counts = useLibraryTagCounts();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = toRows(counts, query, tags);
  const known = new Map(counts.map(({ tag, count }) => [tag, count]));

  function change(next: string[], details: ComboboxChangeDetails) {
    // With the list closed, Base UI's Escape empties the value. That must not delete
    // every tag, and Escape should still close the detail dialog.
    if (details.reason === 'escape-key') {
      details.cancel();
      details.allowPropagation();
      return;
    }
    const added = next.filter((tag) => !tags.includes(tag));
    const removed = tags.filter((tag) => !next.includes(tag));
    // Typing a suggested tag by hand accepts it, so it must leave the suggestions.
    onSave({ addTags: added, removeTags: removed, removeSuggestedTags: added });
    setQuery('');
  }

  function showErrorOnEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || query.trim() === '') return;
    if (normalizeTag(query) === null) {
      setError('Use short words, like "handmade" or "style:minimal".');
    }
  }

  return (
    <Combobox
      multiple
      value={tags}
      onValueChange={change}
      items={rows}
      filter={null}
      inputValue={query}
      onInputValueChange={(value, details) => {
        // Base UI empties the text when the list closes. A half-typed `style:` has no rows,
        // so the list closes mid-word, and the text must survive while the user still types.
        if (
          details.reason === 'input-clear' &&
          document.activeElement === inputRef.current
        ) {
          return;
        }
        setQuery(value);
        setError(null);
        // Typing after Escape must bring the list back.
        setIsOpen(true);
      }}
      open={isOpen && rows.length > 0}
      onOpenChange={setIsOpen}
      openOnInputClick={false}
      autoHighlight
      itemToStringLabel={tagText}
    >
      <ComboboxChips ref={anchorRef}>
        {tags.map((tag) => (
          <ComboboxChip key={tag} removeLabel={`Remove ${tagText(tag)}`}>
            <TagName tag={tag} />
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          ref={inputRef}
          placeholder="+ Add"
          aria-label="Add a tag"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          onKeyDown={showErrorOnEnter}
          // The close-time clear above is skipped while focused, so leaving the field clears here.
          onBlur={() => {
            setQuery('');
            setError(null);
          }}
        />
      </ComboboxChips>
      {error && (
        <p id={errorId} role="alert" className="t-b-4 text-danger">
          {error}
        </p>
      )}
      <ComboboxContent anchor={anchorRef}>
        <ComboboxList>
          {(tag: string) => (
            <ComboboxItem key={tag} value={tag}>
              {known.has(tag) ? (
                <>
                  <span className="truncate">
                    <TagName tag={tag} />
                  </span>
                  <span className="ml-auto text-muted-fg tabular-nums">
                    {known.get(tag)}
                  </span>
                </>
              ) : (
                <span className="truncate">Create “{tag}”</span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

// *** useLibraryTagCounts ***
function useLibraryTagCounts(): SourceTagCount[] {
  const sourcesQuery = useAllSources();
  return countTags(sourcesQuery.data ?? []);
}

// *** toRows ***
// Tags already on the source are left out: picking one again would remove it.
function toRows(
  counts: SourceTagCount[],
  query: string,
  tags: string[],
): string[] {
  const unused = counts.filter(({ tag }) => !tags.includes(tag));
  const matches = searchTags(unused, query).map(({ tag }) => tag);
  const typed = normalizeTag(query);
  // The typed tag can be new, or an old one that missed the top matches.
  const isMissing =
    typed !== null && !tags.includes(typed) && !matches.includes(typed);

  return isMissing ? [...matches, typed] : matches;
}
