import { cn } from 'cn';
import type { CSSProperties } from 'react';

import type { CollectionColor } from '#/features/collections/collection-types';
import { useMediaObjectUrl } from '#/features/sources/hooks/source-hooks';
import type { Source } from '#/features/sources/source-types';

// Spread around 0, so one, two, or three saves all stay centered.
const PREVIEW_OFFSETS: Record<number, number[]> = {
  1: [0],
  2: [-0.5, 0.5],
  3: [-1, 0, 1],
};

export function CollectionCardPocket({
  previews,
  color,
}: {
  previews: Source[];
  color: CollectionColor | null;
}) {
  const offsets = PREVIEW_OFFSETS[previews.length] ?? [];

  return (
    <div
      aria-hidden
      style={pocketColorStyle(color)}
      className="relative h-24 w-28 drop-shadow-md perspective-[400px]"
    >
      <div className="absolute inset-x-0 bottom-0 h-18 rounded-md rounded-tl-none bg-[var(--pocket-back,var(--color-border))] transition-colors duration-base" />
      <div className="absolute bottom-18 left-0 h-2 w-10 rounded-t-md bg-[var(--pocket-back,var(--color-border))] transition-colors duration-base" />

      <div className="absolute inset-0 [clip-path:inset(-100%_-100%_0_-100%)]">
        {previews.map((source, index) => (
          <CollectionCardPreview
            key={source.id}
            source={source}
            offset={offsets[index]}
            delayMs={index * 40}
          />
        ))}
      </div>

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 h-16 origin-bottom transform-[rotateX(0deg)] rounded-md bg-[var(--pocket-front,var(--color-muted))]',
          'transition-[transform,background-color] duration-fast ease-out-quart motion-reduce:transition-none',
          'group-hover:transform-[rotateX(-28deg)] group-hover:duration-middle',
          'group-focus-visible:transform-[rotateX(-28deg)]',
        )}
      />
    </div>
  );
}

// *** pocketColorStyle ***
/** The back is a little darker than the front, like the default gray pair. */
function pocketColorStyle(color: CollectionColor | null): CSSProperties {
  if (!color) return {};

  return {
    '--pocket-front': `var(--poise-color-folder-${color})`,
    '--pocket-back': `color-mix(in oklch, var(--poise-color-folder-${color}), black 15%)`,
  } as CSSProperties;
}

// *** CollectionCardPreview ***
function CollectionCardPreview({
  source,
  offset,
  delayMs,
}: {
  source: Source;
  offset: number;
  delayMs: number;
}) {
  const objectUrl = useMediaObjectUrl(
    source.storageKey,
    source.mimeType,
    source.sizeBytes,
  );
  const size = fitPreview(source);

  return (
    <div
      style={
        {
          width: size.width,
          height: size.height,
          marginLeft: -size.width / 2,
          marginBottom: -size.height / 2,
          '--offset': offset,
          '--delay': `${delayMs}ms`,
        } as CSSProperties
      }
      className={cn(
        'absolute bottom-16 left-1/2 overflow-hidden rounded-sm border bg-muted outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
        'origin-bottom [translate:calc(var(--offset)*30px)_0] rotate-[calc(var(--offset)*5deg)]',
        'transition-[translate,rotate] duration-fast ease-out-quart motion-reduce:transition-none',
        'group-hover:[translate:calc(var(--offset)*34px)_-25%] group-hover:rotate-[calc(var(--offset)*9deg)] group-hover:delay-(--delay) group-hover:duration-middle',
        'group-focus-visible:[translate:calc(var(--offset)*34px)_-25%] group-focus-visible:rotate-[calc(var(--offset)*9deg)]',
      )}
    >
      {objectUrl && source.kind === 'video' ? (
        <video
          src={`${objectUrl}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          className="size-full object-cover"
        />
      ) : objectUrl ? (
        <img src={objectUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-end p-1.5 text-[0.5625rem] leading-tight text-muted-fg">
          {source.site?.domain ?? source.name}
        </span>
      )}
    </div>
  );
}

// *** fitPreview ***
const PREVIEW_BOX = { width: 64, height: 56 };
const PREVIEW_RATIO = { min: 0.6, max: 1.8, fallback: 0.75 };

function fitPreview(source: Source): { width: number; height: number } {
  const rawRatio =
    source.width && source.height
      ? source.width / source.height
      : PREVIEW_RATIO.fallback;
  const ratio = Math.min(
    Math.max(rawRatio, PREVIEW_RATIO.min),
    PREVIEW_RATIO.max,
  );
  const height = Math.min(PREVIEW_BOX.width / ratio, PREVIEW_BOX.height);

  return { width: Math.round(height * ratio), height: Math.round(height) };
}
