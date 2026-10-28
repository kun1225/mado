import { useRef } from 'react';
import { cn } from 'cn';

import { Reveal, RevealText } from '#/components/reveal';
import type { LandingGalleryItem } from '#/features/landing/landing.type';
import { LANDING_GALLERY } from '#/features/landing/landing-content';

import { useLandingIntro } from './landing-intro';
import { Accent, OpenMado, Wordmark } from './landing-ui';

// Hidden until the intro brings it in; see landing-intro.ts.
const INTRO_HIDDEN = 'in-data-[landing-intro=pending]:opacity-0';

export function LandingHeader() {
  return (
    <header
      data-landing-header
      className={cn('sticky top-0 z-header bg-bg', INTRO_HIDDEN)}
    >
      <div className="flex h-16 items-center justify-between px-edge">
        <Wordmark />
        <OpenMado size="sm" />
      </div>
    </header>
  );
}

export function LandingHero() {
  const heroRef = useRef<HTMLElement>(null);
  useLandingIntro(heroRef);

  return (
    <section ref={heroRef} className="pt-16 pb-28 sm:pt-24">
      <div className="flex flex-col items-center px-edge text-center">
        <RevealText
          as="h1"
          trigger="manual"
          className="text-5xl/[1.02] font-medium tracking-[-0.04em] text-balance sm:text-8xl/[0.98]"
        >
          Frame what <Accent>you see</Accent>.
        </RevealText>
        <RevealText
          trigger="manual"
          delay={250}
          className="mt-6 max-w-[44ch] text-lg/relaxed text-pretty text-muted-fg"
        >
          Mado is a quiet library for brand designers. Collect what you see,
          sort it, and keep it all on your device.
        </RevealText>
        <Reveal
          trigger="manual"
          delay={650}
          className="mt-10 flex items-center gap-5"
        >
          <OpenMado />
          <span className="text-sm text-muted-fg">Free. No sign-up.</span>
        </Reveal>
      </div>

      <LandingGallery className="mt-16 sm:mt-20" />
    </section>
  );
}

// *** LandingGallery ***
// Each column starts at a different item and runs at its own speed, so the wall never lines up.
const GALLERY_COLUMNS = [
  { offset: 0, duration: '70s', isReversed: false, className: '' },
  { offset: 3, duration: '95s', isReversed: true, className: '' },
  { offset: 5, duration: '80s', isReversed: false, className: 'max-sm:hidden' },
  { offset: 2, duration: '105s', isReversed: true, className: 'max-lg:hidden' },
];

/** A wall of 2, 3 or 4 columns that drift up and down forever. Still with reduced motion. */
function LandingGallery({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div
        data-intro-band
        role="img"
        aria-label="A wall of saved references: architecture photos, a brief and a type specimen"
        className="grid h-[clamp(480px,88svh,900px)] grid-cols-2 gap-3 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_75%,transparent)] px-3 in-data-[landing-intro=pending]:[clip-path:inset(calc(50%-32px)_50%_calc(50%-32px)_50%_round_999px)] sm:grid-cols-3 lg:grid-cols-4"
      >
        {GALLERY_COLUMNS.map((column) => (
          <div
            key={column.offset}
            style={{
              animationDuration: column.duration,
              animationDirection: column.isReversed ? 'reverse' : 'normal',
            }}
            className={cn(
              'flex animate-marquee-y flex-col motion-reduce:animate-none',
              column.className,
            )}
          >
            {[
              ...rotate(LANDING_GALLERY, column.offset),
              ...rotate(LANDING_GALLERY, column.offset),
            ].map((item, index) => (
              <GalleryTile key={`${item.id}-${index}`} item={item} />
            ))}
          </div>
        ))}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden text-3xl font-medium tracking-[-0.03em] in-data-[landing-intro=pending]:block sm:text-5xl"
      >
        <span
          data-intro-word="left"
          className="absolute top-1/2 right-1/2 mr-5 -translate-y-1/2 opacity-0"
        >
          Mado
        </span>
        <span
          data-intro-word="right"
          lang="ja"
          className="absolute top-1/2 left-1/2 ml-5 -translate-y-1/2 font-accent font-semibold opacity-0"
        >
          窓
        </span>
      </div>
    </div>
  );
}

// *** rotate ***
function rotate<T>(items: T[], offset: number): T[] {
  return [...items.slice(offset), ...items.slice(0, offset)];
}

// *** GalleryTile ***
// Padding instead of gap, so half the column is exactly one set and the loop has no jump.
const TILE = 'shrink-0 pb-3';

function GalleryTile({ item }: { item: LandingGalleryItem }) {
  if (item.kind === 'image') {
    return (
      <div className={TILE}>
        <img
          src={item.src}
          alt=""
          draggable={false}
          style={{ aspectRatio: `${item.width} / ${item.height}` }}
          className="w-full rounded-md bg-muted object-cover select-none"
        />
      </div>
    );
  }

  if (item.kind === 'text') {
    return (
      <div className={TILE}>
        <div className="flex aspect-[3/4] w-full items-end rounded-md bg-muted p-4 sm:p-6">
          <p className="font-serif text-lg/snug text-pretty sm:text-2xl/snug">
            {item.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={TILE}>
      <div className="flex aspect-square w-full flex-col justify-between rounded-md border border-border bg-bg p-4 sm:p-6">
        <span className="text-xs text-muted-fg">{item.name}</span>
        <span className="font-accent text-5xl font-semibold italic sm:text-7xl">
          {item.specimen}
        </span>
      </div>
    </div>
  );
}
