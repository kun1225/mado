import { cn } from 'cn';

// Varied heights so the placeholder reads as a masonry wall, not a table.
const TILE_ASPECTS = [
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[4/3]',
  'aspect-[3/4]',
  'aspect-[5/4]',
  'aspect-[4/5]',
  'aspect-[3/4]',
  'aspect-square',
  'aspect-[4/3]',
  'aspect-[4/5]',
  'aspect-[5/4]',
  'aspect-[3/4]',
];

/** Same column widths as `Masonry`, so the real grid lands without a jump. */
export function SourceGridSkeleton() {
  return (
    <div aria-hidden className="columns-2 gap-2.5 md:columns-3 lg:columns-4">
      {TILE_ASPECTS.map((aspect, index) => (
        <div
          key={index}
          className={cn(
            'mb-2.5 w-full animate-pulse break-inside-avoid rounded-md bg-muted motion-reduce:animate-none',
            aspect,
          )}
        />
      ))}
    </div>
  );
}
