import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import type { CSSProperties } from 'react';

import { useCollectionPreviews } from '#/features/collections/collection-hooks';
import type { Collection } from '#/features/collections/collection-types';
import { useMediaObjectUrl } from '#/features/sources/hooks/source-hooks';
import { useSourceDropzone } from '#/features/sources/hooks/source-interaction-hooks';
import type { Source } from '#/features/sources/source-types';

export function CollectionCard({ collection }: { collection: Collection }) {
  const { getRootProps, isDragActive } = useSourceDropzone(collection.id);
  const previews = useCollectionPreviews(collection.id);

  return (
    // The drop target wraps the link, so the link keeps its own role.
    <div {...getRootProps()}>
      <Link
        to="/collection/$collectionId"
        params={{ collectionId: collection.id }}
        className={cn(
          'group relative block size-48 rounded-md border border-border text-left text-fg transition-[border-color,background-color,scale] hover:border-fg',
          isDragActive && 'scale-[1.02] border-accent bg-accent/10',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-14 flex items-center justify-center">
          <CollectionCardPocket previews={previews} />
        </div>

        <div className="absolute inset-x-4 bottom-3 min-w-0">
          <p className="truncate text-sm font-medium">{collection.name}</p>
          <p className="text-sm text-muted-fg">
            {collection.saveCount}{' '}
            {collection.saveCount === 1 ? 'save' : 'saves'}
          </p>
        </div>
      </Link>
    </div>
  );
}

const SKELETON_COUNT = 3;

/** Same size as `CollectionCard`, so real cards replace it in place. */
export function CollectionCardSkeletons() {
  return Array.from({ length: SKELETON_COUNT }, (_, index) => (
    <div
      key={index}
      aria-hidden
      className="size-48 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
    />
  ));
}

// *** CollectionCardPocket ***
// Spread from -1 to 1, so one, two, or three saves all sit centered.
const PREVIEW_OFFSETS: Record<number, number[]> = {
  1: [0],
  2: [-0.5, 0.5],
  3: [-1, 0, 1],
};

/** A folder drawing; the saves sit in its pocket and slide up on hover. */
function CollectionCardPocket({ previews }: { previews: Source[] }) {
  const offsets = PREVIEW_OFFSETS[previews.length] ?? [];

  return (
    <div aria-hidden className="relative h-24 w-32">
      {/* The tab joins the back panel at its top-left corner, so that corner stays square. */}
      <div className="absolute inset-x-0 bottom-0 h-20 rounded-md rounded-tl-none bg-border" />
      <div className="absolute bottom-20 left-0 h-3 w-12 rounded-t-md bg-border" />

      {previews.map((source, index) => (
        <CollectionCardPreview
          key={source.id}
          source={source}
          offset={offsets[index]}
          delayMs={index * 40}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-14 rounded-md bg-muted shadow-[0_-1px_0_rgb(255_255_255/0.6)_inset,0_-2px_6px_-2px_rgb(0_0_0/0.12)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.09)]" />
    </div>
  );
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
          '--offset': offset,
          '--delay': `${delayMs}ms`,
        } as CSSProperties
      }
      className={cn(
        // Top-aligned, so every save shows the same strip above the flap whatever its shape.
        'absolute top-3 left-1/2 overflow-hidden rounded-sm bg-muted outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
        'origin-bottom [translate:calc(var(--offset)*30px)_0] [rotate:calc(var(--offset)*5deg)]',
        'transition-[translate,rotate] duration-fast ease-out-quart motion-reduce:transition-none',
        'group-hover:[translate:calc(var(--offset)*34px)_-16px] group-hover:[rotate:calc(var(--offset)*9deg)] group-hover:delay-(--delay) group-hover:duration-middle',
        'group-focus-visible:[translate:calc(var(--offset)*34px)_-16px] group-focus-visible:[rotate:calc(var(--offset)*9deg)]',
      )}
    >
      {objectUrl && source.kind === 'video' ? (
        // A still first frame: a row of folders full of playing videos is noise.
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
const PREVIEW_BOX = { width: 72, height: 64 };
// A full-page screenshot is a thin strip at its true ratio, so clamp it.
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
