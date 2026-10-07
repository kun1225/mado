import { useState } from 'react';
import { Delete02Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';

import { Button } from '@repo/ui/button';

import { useMediaObjectUrl } from '#/features/sources/hooks/source-hooks';
import type { ToggleSelectOptions } from '#/features/sources/hooks/source-interaction-hooks';
import type { Source } from '#/features/sources/source-types';

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
  /** The stored file is still being shrunk; the card shows it as busy. */
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
  /** Leave out where a card should not open the detail dialog. */
  onOpen?: () => void;
}) {
  const objectUrl = useMediaObjectUrl(
    source.storageKey,
    source.mimeType,
    source.sizeBytes,
  );

  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const isUnplayable = objectUrl !== null && failedUrl === objectUrl;

  const aspectRatio =
    source.width && source.height ? source.width / source.height : 1;

  // Compression swaps the stored file, which breaks a video that is playing.
  const isWaitingForVideo = isCompressing && source.kind === 'video';

  return (
    <figure
      style={{ aspectRatio }}
      aria-busy={isCompressing}
      className={cn(
        'group relative overflow-hidden rounded-md select-none',
        'transition-shadow duration-base ease-standard',
        selection.isSelected && 'ring-2 ring-fg ring-offset-2 ring-offset-bg',
      )}
    >
      {((objectUrl === null && source.storageKey) || isWaitingForVideo) && (
        <div className="size-full animate-pulse bg-muted" />
      )}

      {objectUrl !== null && source.kind === 'image' && (
        <img
          src={objectUrl}
          alt={source.name}
          className="size-full object-cover"
        />
      )}

      {source.kind === 'website' &&
        (objectUrl ? (
          <img src={objectUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full min-h-40 flex-col justify-end bg-muted p-4">
            {source.site?.domain && (
              <p className="truncate text-xs text-muted-fg">
                {source.site.domain}
              </p>
            )}
            <p className="mt-1 line-clamp-2 text-sm font-medium">
              {source.name}
            </p>
          </div>
        ))}

      {objectUrl !== null &&
        source.kind === 'video' &&
        !isCompressing &&
        !isUnplayable && (
          <video
            src={objectUrl}
            onError={() => setFailedUrl(objectUrl)}
            autoPlay
            muted
            loop
            playsInline
            className="size-full object-cover"
          />
        )}

      {isUnplayable && !isCompressing && (
        <p
          role="alert"
          className="flex size-full items-center justify-center bg-muted p-2 text-center text-xs text-muted-fg"
        >
          This video format can't be played in this browser.
        </p>
      )}

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
 * A progressive blur: each layer blurs harder than the one before it, and its
 * mask only lets it show further down the strip. Stacked, they ramp the blur
 * from sharp at the top to heavy at the bottom, so the label on top stays
 * readable without a hard edge cutting across the media.
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
 * The knobs for the tint. Change these and the gradient below rebuilds itself.
 *
 * - `alpha` is how dark it gets at the very bottom.
 * - `curve` is a cubic-bezier, read exactly like a CSS one. Pulling the first
 *   pair down holds the tint longer before it fades.
 * - `steps` is resolution. Fewer stops band, more stops cost bytes.
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
 * A straight `to top` fade leaves a faint band where it meets the media,
 * because alpha falling at a constant rate does not match how the eye reads
 * brightness. Easing only the alpha — positions stay evenly spaced — gives a
 * tint that holds near the label and then drops away quickly.
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

/**
 * Reads a cubic-bezier at `x` the way CSS does. Newton's method lands within a
 * rounding error in a few passes for curves this gentle.
 */
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
