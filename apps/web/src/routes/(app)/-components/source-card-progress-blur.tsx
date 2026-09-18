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

const TINT_GRADIENT = buildEasedTint(TINT);

export function SourceCardProgressBlur() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {BLUR_LAYERS.map((layer) => (
        <div key={layer} className={`${LAYER_BASE} ${layer}`} />
      ))}

      <div className={LAYER_BASE} style={{ backgroundImage: TINT_GRADIENT }} />
    </div>
  );
}
