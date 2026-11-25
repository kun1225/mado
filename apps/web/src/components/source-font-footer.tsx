import { cn } from '@repo/ui/cn';

import type { FontSourceContent } from '#/features/sources/font-source.type';

/**
 * In the app's own font, so a font card never reads as a text card. One bar per
 * weight, thin to thick, shows the range at a glance.
 */
export function SourceFontFooter({
  name,
  font,
  failed,
  className,
}: {
  name: string;
  font: FontSourceContent;
  failed: boolean;
  className?: string;
}) {
  const count = font.faces.length;

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-t border-border px-3 py-2 t-l-4 text-muted-fg',
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate text-fg">{name}</span>
      {failed ? (
        <span role="alert" className="shrink-0 text-danger">
          Can't show this font
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-2">
          {count} {count === 1 ? 'style' : 'styles'}
          <SourceFontWeightBars font={font} />
        </span>
      )}
    </div>
  );
}

// *** SourceFontWeightBars ***
function SourceFontWeightBars({ font }: { font: FontSourceContent }) {
  const weights = [
    ...new Set(
      font.faces.flatMap(({ weight }) =>
        Array.isArray(weight) ? [weight[0], weight[1]] : [weight],
      ),
    ),
  ].sort((first, second) => first - second);

  return (
    <span aria-hidden className="flex h-2.5 items-stretch gap-0.5">
      {weights.map((weight) => (
        <i
          key={weight}
          style={{ width: 1 + Math.round((weight - 100) / 200) }}
          className="rounded-full bg-current"
        />
      ))}
    </span>
  );
}
