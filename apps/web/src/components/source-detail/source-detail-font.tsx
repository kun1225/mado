import { useState } from 'react';
import type { CSSProperties } from 'react';

import { cn } from '@repo/ui/cn';

import { toCoverFace, toFontFaceStyle } from '#/features/sources/font-source';
import type { FontSourceContent } from '#/features/sources/font-source.type';
import { useFontFaces } from '#/features/sources/hooks/font-hooks';
import type { Source } from '#/features/sources/source-types';

import { SourceFontFooter } from '../source-font-footer';

import type { SourceDetailFontView } from './source-detail-font.type';

const VIEWS: SourceDetailFontView[] = ['Cover', 'Waterfall', 'Glyphs'];

const WATERFALL_SIZES = [12, 16, 24, 36, 48, 72];

const GLYPHS = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789 &@?!%(.,:;)',
];

/**
 * The card itself, grown to fill the viewer, so the dialog flies from the card
 * like an image does. Editing lives in the sidebar.
 */
export function SourceDetailFont({
  source,
  font,
  sentence,
  mediaRef,
}: {
  source: Source;
  font: FontSourceContent;
  /** The sidebar's draft while typing, so the poster follows each key. */
  sentence: string;
  mediaRef: (media: HTMLElement | null) => void;
}) {
  const { family, failed } = useFontFaces(source.id, font.faces, true);
  // Starts on the cover each time, since it is what the card shows.
  const [view, setView] = useState<SourceDetailFontView>('Cover');
  const style = family ? toFontFaceStyle(family, toCoverFace(font)) : undefined;

  return (
    // A size container, so the poster can be the biggest 4:3 that fits above the switch.
    <div className="@container-size pointer-events-none flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3">
      <figure
        ref={mediaRef}
        className="@container pointer-events-auto flex aspect-4/3 w-[min(100cqw,calc((100cqh-3rem)*4/3))] flex-col overflow-hidden rounded-md border border-border bg-white text-fg dark:bg-bg"
      >
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-[6cqw]">
          {view === 'Cover' && (
            <p
              style={{ ...style, fontSize: 'clamp(1.25rem, 7cqw, 6rem)' }}
              className="py-[0.15em] leading-[1.15] text-pretty wrap-break-word"
            >
              {sentence}
            </p>
          )}
          {view === 'Waterfall' && (
            <SourceDetailFontWaterfall sentence={sentence} style={style} />
          )}
          {view === 'Glyphs' && <SourceDetailFontGlyphs style={style} />}
        </div>
        <SourceFontFooter name={source.name} font={font} failed={failed} />
      </figure>

      <SourceDetailFontViewSwitch view={view} onChange={setView} />
    </div>
  );
}

// *** SourceDetailFontWaterfall ***
function SourceDetailFontWaterfall({
  sentence,
  style,
}: {
  sentence: string;
  style: CSSProperties | undefined;
}) {
  return (
    <div className="flex flex-col gap-2 py-4">
      {WATERFALL_SIZES.map((size) => (
        <div key={size} className="flex min-w-0 items-baseline gap-3">
          <span className="w-6 shrink-0 t-l-4 text-muted-fg tabular-nums">
            {size}
          </span>
          <span
            style={{ ...style, fontSize: size }}
            className="min-w-0 truncate leading-[1.2]"
          >
            {sentence}
          </span>
        </div>
      ))}
    </div>
  );
}

// *** SourceDetailFontGlyphs ***
function SourceDetailFontGlyphs({
  style,
}: {
  style: CSSProperties | undefined;
}) {
  return (
    <div
      style={{ ...style, fontSize: 'clamp(1rem, 4.5cqw, 3rem)' }}
      className="flex flex-col gap-[0.3em] py-4 leading-[1.2] tracking-wide wrap-break-word"
    >
      {GLYPHS.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

// *** SourceDetailFontViewSwitch ***
function SourceDetailFontViewSwitch({
  view,
  onChange,
}: {
  view: SourceDetailFontView;
  onChange: (view: SourceDetailFontView) => void;
}) {
  return (
    <div
      data-flip-chrome
      role="group"
      aria-label="Show"
      className="pointer-events-auto flex h-9 shrink-0 gap-0.5 rounded-full bg-bg/10 p-0.5 t-b-4"
    >
      {VIEWS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          onClick={() => onChange(option)}
          className={cn(
            'rounded-full px-3 transition-colors duration-base ease-standard',
            view === option ? 'bg-bg text-fg' : 'text-bg/70 hover:text-bg',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
