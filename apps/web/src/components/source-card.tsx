import { useEffect, useRef, useState } from 'react';
import { Delete02Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';

import { Button } from '@repo/ui/button';

import { useMediaObjectUrl } from '#/features/sources/hooks/source-hooks';
import type { ToggleSelectOptions } from '#/features/sources/hooks/source-interaction-hooks';
import type { Source } from '#/features/sources/source-types';
import { useInView } from '#/hooks/use-in-view';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

// One screen above and below, so media is ready before it scrolls in.
// Outside this box a card is "far" and its media unmounts.
const NEAR_VIEWPORT = { rootMargin: '100% 0px', threshold: 0 };

// Half visible, so a sliver at the edge doesn't start playback.
const PLAYING_VIEWPORT = { rootMargin: '0px', threshold: 0.5 };

export function SourceCard({
  source,
  collectionName,
  isCompressing = false,
  deletion,
  selection,
  onOpen,
}: {
  source: Source;
  collectionName?: string;
  isCompressing?: boolean;
  deletion: {
    isPending?: boolean;
    onDelete: () => void;
  };
  selection: {
    isSelected: boolean;
    isActive: boolean;
    onToggle: (options: ToggleSelectOptions) => void;
  };
  onOpen?: () => void;
}) {
  const figureRef = useRef<HTMLElement>(null);
  const isNear = useInView(figureRef, NEAR_VIEWPORT);

  const aspectRatio =
    source.width && source.height ? source.width / source.height : 1;

  return (
    <figure
      ref={figureRef}
      style={{ aspectRatio }}
      aria-busy={isCompressing}
      className={cn(
        'group relative overflow-hidden rounded-md select-none',
        'transition-shadow duration-base ease-standard',
        selection.isSelected && 'ring-2 ring-fg ring-offset-2 ring-offset-bg',
      )}
    >
      <SourceCardBody
        source={source}
        isNear={isNear}
        isCompressing={isCompressing}
      />

      {isCompressing && (
        <div
          role="status"
          aria-label={`Optimizing ${source.name}`}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-fg/30 backdrop-blur-xs"
        >
          <span
            aria-hidden
            className="size-6 animate-spin rounded-full border-2 border-bg border-t-transparent motion-reduce:animate-none"
          />
        </div>
      )}

      {selection.isActive && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={(event) => selection.onToggle({ isRange: event.shiftKey })}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}

      {!selection.isActive && onOpen && (
        <button
          type="button"
          aria-label={`Open ${source.name}`}
          onClick={onOpen}
          className="absolute inset-0 z-10 cursor-zoom-in"
        />
      )}

      <SourceCardCheckbox
        fileName={source.name}
        isSelected={selection.isSelected}
        isSelectionMode={selection.isActive}
        onToggle={selection.onToggle}
      />

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${source.name}`}
        disabled={deletion.isPending}
        onClick={deletion.onDelete}
        className="absolute top-1 right-1 z-20 border-bg/80 bg-fg/40 text-bg/80 opacity-0 backdrop-blur-xs transition-[opacity,background-color] group-hover:opacity-100 hover:bg-bg/70 hover:text-danger focus-visible:opacity-100 pointer-coarse:pointer-events-none"
      >
        <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
      </Button>

      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pt-4">
        <SourceCardProgressBlur />

        <div className="relative px-2 pt-1 pb-1.5 opacity-0 transition-opacity duration-base ease-standard group-focus-within:opacity-100 group-hover:opacity-100">
          <p className="truncate text-xs font-medium text-bg">{source.name}</p>

          {collectionName !== undefined && (
            <p className="truncate text-[0.625rem] leading-tight text-bg/70">
              {collectionName}
            </p>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

// *** SourceCardBody ***
/** Stays mounted while the media comes and goes, so it remembers a failed file. */
function SourceCardBody({
  source,
  isNear,
  isCompressing,
}: {
  source: Source;
  isNear: boolean;
  isCompressing: boolean;
}) {
  // A blob URL changes on every remount, so the file is keyed by what's stored.
  const fileKey = `${source.storageKey}:${source.sizeBytes}`;
  const [failedFileKey, setFailedFileKey] = useState<string | null>(null);

  // Compression swaps the file, which would break a playing video.
  if (isCompressing && source.kind === 'video') {
    return <div className="size-full animate-pulse bg-muted" />;
  }

  if (failedFileKey === fileKey) {
    return (
      <p
        role="alert"
        className="flex size-full items-center justify-center bg-muted p-2 text-center text-xs text-muted-fg"
      >
        This video format can't be played in this browser.
      </p>
    );
  }

  // Without a stored file there is nothing heavy to unload.
  if (!isNear || source.storageKey === null) {
    return <SourceCardBackdrop source={source} isVisible />;
  }

  return (
    <SourceCardMedia
      source={source}
      onUnplayable={() => setFailedFileKey(fileKey)}
    />
  );
}

// *** SourceCardBackdrop ***
/**
 * Absolute, so it keeps the card's size and can sit under fading media.
 * A website shows its name and domain, which costs nothing to render.
 */
function SourceCardBackdrop({
  source,
  isVisible,
}: {
  source: Source;
  isVisible: boolean;
}) {
  return (
    <div
      aria-hidden={source.kind !== 'website'}
      className={cn(
        'pointer-events-none absolute inset-0 transition-opacity duration-slow ease-standard motion-reduce:transition-none',
        source.kind !== 'website' && 'bg-muted/50',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {source.kind === 'website' && <SourceCardWebsiteTile source={source} />}
    </div>
  );
}

// *** SourceCardWebsiteTile ***
function SourceCardWebsiteTile({ source }: { source: Source }) {
  return (
    <div className="flex size-full min-h-40 flex-col justify-end bg-muted p-4">
      {source.site?.domain && (
        <p className="truncate text-xs text-muted-fg">{source.site.domain}</p>
      )}
      <p className="mt-1 line-clamp-2 text-sm font-medium">{source.name}</p>
    </div>
  );
}

// *** SourceCardMedia ***
function SourceCardMedia({
  source,
  onUnplayable,
}: {
  source: Source;
  onUnplayable: () => void;
}) {
  const objectUrl = useMediaObjectUrl(
    source.storageKey,
    source.mimeType,
    source.sizeBytes,
  );

  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const isLoaded = objectUrl !== null && loadedUrl === objectUrl;

  const mediaClass = cn(
    'relative size-full object-cover transition-opacity duration-slow ease-standard motion-reduce:transition-none',
    isLoaded ? 'opacity-100' : 'opacity-0',
  );

  return (
    <>
      <SourceCardBackdrop source={source} isVisible={!isLoaded} />

      {objectUrl !== null && source.kind === 'video' && (
        <SourceCardVideo
          src={objectUrl}
          className={mediaClass}
          onReady={() => setLoadedUrl(objectUrl)}
          onError={onUnplayable}
        />
      )}

      {objectUrl !== null && source.kind !== 'video' && (
        <img
          src={objectUrl}
          alt={source.kind === 'image' ? source.name : ''}
          onLoad={() => setLoadedUrl(objectUrl)}
          className={mediaClass}
        />
      )}
    </>
  );
}

// *** SourceCardVideo ***
function SourceCardVideo({
  src,
  className,
  onReady,
  onError,
}: {
  src: string;
  className: string;
  onReady: () => void;
  onError: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVisible = useInView(videoRef, PLAYING_VIEWPORT);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Set here, not as a prop, so the cleanup can clear it: a removed <video>
  // keeps its decoder until garbage collection, and Chrome caps how many a
  // page may hold. A prop would not come back after StrictMode reruns this.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.src = src;

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  // `src` is a dependency because a new file resets the element to paused.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isVisible || prefersReducedMotion) {
      video.pause();
      return;
    }

    // `play()` rejects when a pause or unmount interrupts it, which is expected while scrolling.
    video.play().catch(() => undefined);
  }, [isVisible, prefersReducedMotion, src]);

  // The ref is null after unmount, so the release above can't count as a failure.
  function handleError() {
    if (videoRef.current) onError();
  }

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      preload="auto"
      onLoadedData={onReady}
      onError={handleError}
      className={className}
    />
  );
}

// *** SourceCardCheckbox ***
function SourceCardCheckbox({
  fileName,
  isSelected,
  isSelectionMode,
  onToggle,
}: {
  fileName: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggle: (options: ToggleSelectOptions) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`Select ${fileName}`}
      onClick={(event) => onToggle({ isRange: event.shiftKey })}
      className={cn(
        'absolute top-1 left-1 z-20 mt-0.5 flex size-7 items-center justify-center rounded-full border outline-none',
        'transition-[opacity,background-color,border-color,color] duration-base ease-standard',
        'focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50',
        isSelected
          ? 'border-fg bg-fg text-bg'
          : 'border-bg/70 bg-fg/40 text-transparent backdrop-blur-xs hover:bg-bg/40',
        isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      )}
    >
      <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} />
    </button>
  );
}

// *** SourceCardProgressBlur ***
/**
 * Each layer blurs more and shows lower down. Together they go from sharp to
 * blurry, so the label stays readable without a hard edge across the media.
 */
const BLUR_LAYERS = [
  'backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_16.7%)]',
  'backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,transparent_16.7%,black_33.3%)]',
  'backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,transparent_33.3%,black_50%)]',
  'backdrop-blur-[6px] [mask-image:linear-gradient(to_bottom,transparent_50%,black_66.7%)]',
  'backdrop-blur-[8px] [mask-image:linear-gradient(to_bottom,transparent_66.7%,black_83.3%)]',
  'backdrop-blur-[12px] [mask-image:linear-gradient(to_bottom,transparent_83.3%,black_100%)]',
];

const LAYER_BASE =
  'duration-base ease-standard absolute inset-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100';

/**
 * Change these and the gradient rebuilds itself.
 * - `alpha`: how dark the very bottom gets.
 * - `curve`: a CSS cubic-bezier. A lower first pair keeps the tint longer.
 * - `steps`: fewer stops show bands, more stops cost bytes.
 */
const TINT = {
  alpha: 0.5,
  curve: [0.07, 0.04, 0.6, 1],
  steps: 25,
} as const;

const TINT_GRADIENT = buildEasedTint(TINT);

function SourceCardProgressBlur() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {BLUR_LAYERS.map((layer) => (
        <div key={layer} className={`${LAYER_BASE} ${layer}`} />
      ))}

      <div className={LAYER_BASE} style={{ backgroundImage: TINT_GRADIENT }} />
    </div>
  );
}

// *** buildEasedTint ***
/**
 * A straight fade shows a faint band, because the eye does not see brightness
 * change evenly. Easing only the alpha keeps the tint near the label, then drops it fast.
 */
function buildEasedTint({ alpha, curve, steps }: typeof TINT): string {
  const stops = Array.from({ length: steps }, (_, index) => {
    const position = index / (steps - 1);
    const opacity = alpha * (1 - sampleCurve(curve, position));

    return `rgb(0 0 0 / ${(opacity * 100).toFixed(2)}%) ${(position * 100).toFixed(1)}%`;
  });

  return `linear-gradient(to top, ${stops.join(', ')})`;
}

// *** sampleCurve ***
type Curve = readonly [number, number, number, number];

/** Newton's method is close enough after a few passes for gentle curves. */
function sampleCurve([p1x, p1y, p2x, p2y]: Curve, x: number): number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  let t = x;
  for (let pass = 0; pass < 8; pass += 1) {
    const error = ((ax * t + bx) * t + cx) * t - x;
    if (Math.abs(error) < 1e-6) break;

    const slope = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(slope) < 1e-6) break;

    t -= error / slope;
  }

  return ((ay * t + by) * t + cy) * t;
}
