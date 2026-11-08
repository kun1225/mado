import type { CSSProperties } from 'react';

import { cn } from '@repo/ui/cn';

import type { CollectionColor } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';

import { SourcePreviewMedia } from './collection-card-pocket';

/** The "Book" look: a cover in the collection color that opens on hover to show the first save. */
export function CollectionCardBook({
  previews,
  color,
  name,
}: {
  previews: Source[];
  color: CollectionColor | null;
  name: string;
}) {
  return (
    <div
      aria-hidden
      style={bookColorStyle(color)}
      className="relative h-24 w-20 perspective-normal"
    >
      <BookFirstPage source={previews[0]} />
      <BookCover name={name} />
    </div>
  );
}

// *** bookColorStyle ***
/** The same colors as the folder front, so a collection keeps its color in both looks. */
function bookColorStyle(color: CollectionColor | null): CSSProperties {
  return {
    '--book-cover': color
      ? `var(--poise-color-folder-${color})`
      : 'var(--color-muted)',
  } as CSSProperties;
}

// *** BookFirstPage ***
function BookFirstPage({ source }: { source: Source | undefined }) {
  return (
    <div className="absolute inset-0 flex items-center rounded-l-[1px] rounded-r-[3px] bg-bg p-1.5 shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.12)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
      {source && (
        <div className="aspect-4/3 w-full overflow-hidden rounded-[2px] bg-muted outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
          <SourcePreviewMedia source={source} />
        </div>
      )}
    </div>
  );
}

// *** BookCover ***
function BookCover({ name }: { name: string }) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex origin-left items-end rounded-l-[1px] rounded-r-[3px] bg-(--book-cover) p-1.5 pl-2.5 text-fg backface-hidden',
        'bg-linear-to-b from-white/20 to-black/5 dark:from-white/8',
        // The inset line on the left is the spine.
        'shadow-[inset_3px_0_0_rgb(0_0_0/0.12),0_1px_2px_rgb(0_0_0/0.15),0_6px_12px_-6px_rgb(0_0_0/0.3)]',
        'transition-transform duration-fast ease-out-quart motion-reduce:transition-none',
        'group-hover:transform-[rotateY(-42deg)] group-hover:duration-middle',
        'group-focus-visible:transform-[rotateY(-42deg)]',
      )}
    >
      <span className="line-clamp-3 font-accent text-[12px] leading-[1.1] font-semibold wrap-break-word hyphens-auto italic">
        {name}
      </span>
    </div>
  );
}
