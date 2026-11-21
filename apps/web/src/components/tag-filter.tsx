import { FilterHorizontalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { cn } from '@repo/ui/cn';
import {
  MorphDropdownMenu,
  MorphDropdownMenuCheckboxItem,
  MorphDropdownMenuContent,
  MorphDropdownMenuGroup,
  MorphDropdownMenuGroupLabel,
  MorphDropdownMenuTrigger,
} from '@repo/ui/morph-dropdown-menu';

import {
  countTags,
  parseTag,
  SOURCE_FACETS,
} from '#/features/sources/source-tags';
import type { SourceTagGroup } from '#/features/sources/source-tags.type';
import type { Source } from '#/features/sources/source-types';

import { SourceDetailChip } from './source-detail/source-detail-chip';

/** Lists the tags of the sources now shown, so a pick always narrows to something. */
export function TagFilter({
  sources,
  selected,
  onChange,
}: {
  sources: Source[];
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const groups = groupCounts(countTags(sources));
  if (groups.length === 0 && selected.length === 0) return null;

  function toggle(tag: string, isOn: boolean) {
    onChange(isOn ? [...selected, tag] : selected.filter((t) => t !== tag));
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <MorphDropdownMenu>
        <MorphDropdownMenuTrigger
          aria-label={
            selected.length > 0 ? `Filter, ${selected.length} on` : 'Filter'
          }
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-full px-3 t-b-4 text-muted-fg hover:text-fg',
            selected.length > 0 && 'text-fg',
          )}
        >
          <HugeiconsIcon
            icon={FilterHorizontalIcon}
            size={14}
            strokeWidth={1.5}
          />
          Filter
        </MorphDropdownMenuTrigger>
        <MorphDropdownMenuContent align="start" className="max-h-96">
          {groups.map(({ label, counts }) => (
            <MorphDropdownMenuGroup key={label}>
              <MorphDropdownMenuGroupLabel>{label}</MorphDropdownMenuGroupLabel>
              {counts.map(({ tag, count }) => (
                <MorphDropdownMenuCheckboxItem
                  key={tag}
                  checked={selected.includes(tag)}
                  onCheckedChange={(isOn) => toggle(tag, isOn)}
                  aria-label={`${parseTag(tag).value}, ${count} ${count === 1 ? 'source' : 'sources'}`}
                >
                  {parseTag(tag).value}
                  <span
                    aria-hidden
                    className="ml-1.5 text-muted-fg tabular-nums"
                  >
                    {count}
                  </span>
                </MorphDropdownMenuCheckboxItem>
              ))}
            </MorphDropdownMenuGroup>
          ))}
        </MorphDropdownMenuContent>
      </MorphDropdownMenu>

      {selected.map((tag) => {
        const { facet, value } = parseTag(tag);
        return (
          <SourceDetailChip
            key={tag}
            label={value}
            prefix={facet ?? undefined}
            onRemove={() => toggle(tag, false)}
          />
        );
      })}
      {selected.length > 1 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="px-1.5 t-b-4 text-muted-fg hover:text-fg"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/** Shown when the picked tags match no source on this page. */
export function TagFilterEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex grow flex-col items-center justify-center gap-2 py-6">
      <p className="t-b-3 text-muted-fg">No sources with these tags.</p>
      <button
        type="button"
        onClick={onClear}
        className="t-l-2 underline underline-offset-4"
      >
        Clear filter
      </button>
    </div>
  );
}

// *** groupCounts ***
function groupCounts(counts: SourceTagGroup['counts']): SourceTagGroup[] {
  const labels = [...SOURCE_FACETS, null].map((facet) => ({
    facet,
    label: facet ? capitalize(facet) : 'Other',
  }));

  return labels
    .map(({ facet, label }) => ({
      label,
      counts: counts.filter(({ tag }) => parseTag(tag).facet === facet),
    }))
    .filter((group) => group.counts.length > 0);
}

// *** capitalize ***
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
