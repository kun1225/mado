/**
 * A progressive blur: each layer blurs harder than the one before it, and its
 * mask only lets it show further down the strip. Stacked, they ramp the blur
 * from sharp at the top to heavy at the bottom, so the label on top stays
 * readable without a hard edge cutting across the media.
 */
const BLUR_LAYERS = [
  'backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_25%)]',
  'backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,transparent_25%,black_50%)]',
  'backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,transparent_50%,black_75%)]',
  'bg-bg/60 backdrop-blur-[6px] [mask-image:linear-gradient(to_bottom,transparent_75%,black_100%)]',
];

export function SourceCardProgressBlur() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {BLUR_LAYERS.map((layer) => (
        <div
          key={layer}
          className={`duration-base ease-standard absolute inset-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${layer}`}
        />
      ))}
    </div>
  );
}
