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
  groupTagCounts,
  parseTag,
} from '#/features/sources/source-tags';
import type { Source } from '#/features/sources/source-types';

import { SourceDetailChip } from './source-detail/source-detail-chip';
import { TagName, useTagText } from './tag-name';

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
  const tagText = useTagText();
  const groups = groupTagCounts(countTags(sources));
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
          {groups.map(({ group, counts }) => (
            <MorphDropdownMenuGroup key={group ?? ''}>
              <MorphDropdownMenuGroupLabel>
                {group ?? 'No group'}
              </MorphDropdownMenuGroupLabel>
              {counts.map(({ tag, count }) => (
                <MorphDropdownMenuCheckboxItem
                  key={tag}
                  checked={selected.includes(tag)}
                  onCheckedChange={(isOn) => toggle(tag, isOn)}
                  aria-label={`${tagText(tag)}, ${count} ${count === 1 ? 'source' : 'sources'}`}
                >
                  {/* The group heading already names the group. */}
                  {parseTag(tag).name}
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

      {selected.map((tag) => (
        <SourceDetailChip
          key={tag}
          label={tagText(tag)}
          onRemove={() => toggle(tag, false)}
        >
          <TagName tag={tag} />
        </SourceDetailChip>
      ))}
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
