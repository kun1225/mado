import { useLayoutEffect, useRef, useState } from 'react';
import type { MotionValue } from 'motion/react';
import { motion, transform, useScroll, useTransform } from 'motion/react';
import type { CSSProperties, RefObject } from 'react';

import { cn } from '@repo/ui/cn';

import { Reveal, RevealText } from '#/components/reveal';
import type {
  LandingFloat,
  LandingRect,
  LandingTile,
} from '#/features/landing/landing.type';
import {
  findLandingTile,
  LANDING_COLLECTIONS,
  LANDING_TILES,
} from '#/features/landing/landing-content';
import { tilePose } from '#/features/landing/landing-motion';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

import { useLandingIntro } from './landing-intro';
import { Accent, OpenMado, TileMedia, Wordmark } from './landing-ui';

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

/**
 * Sources float behind the title. Scrolling pulls each one into its slot in the library, so the hero becomes the gallery.
 * The stage sticks for two screens of scroll, which drive the whole move.
 */
export function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  useLandingIntro(sectionRef);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  // With reduced motion the library is already built; only fades follow the scroll.
  const progress = useTransform(
    scrollYProgress,
    [0.08, 0.7],
    prefersReducedMotion ? [1, 1] : [0, 1],
  );
  // Function transforms, because motion's scroll-timeline shortcut for opacity mapped these ranges wrong.
  const copyOpacity = useTransform(
    scrollYProgress,
    transform([0, 0.2], [1, 0]),
  );
  const copyVisibility = useTransform(copyOpacity, (value) =>
    value < 0.02 ? 'hidden' : 'visible',
  );
  const chromeOpacity = useTransform(
    scrollYProgress,
    transform([0.5, 0.8], prefersReducedMotion ? [1, 1] : [0, 1]),
  );
  const bob = useTransform(progress, [0, 0.3], ['10px', '0px']);

  return (
    // Pulled under the sticky header, so the stage fills the first screen.
    <section ref={sectionRef} className="relative -mt-16 h-[300svh]">
      <motion.div
        data-intro-band
        style={{ '--bob': bob } as unknown as CSSProperties}
        className="sticky top-0 h-svh overflow-hidden in-data-[landing-intro=pending]:[clip-path:inset(calc(50%-32px)_50%_calc(50%-32px)_50%_round_999px)]"
      >
        <LibraryFrame progress={progress} chromeOpacity={chromeOpacity} />

        <motion.div
          style={{ opacity: copyOpacity, visibility: copyVisibility }}
          className="absolute inset-0 z-10 flex items-center justify-center px-edge"
        >
          <HeroCopy isVeiled={prefersReducedMotion} />
        </motion.div>
      </motion.div>

      <IntroWords />
    </section>
  );
}

// *** LibraryFrame ***
// Looks like the library but is only a picture of it. The real cards need the local store, and this one must move freely.
function LibraryFrame({
  progress,
  chromeOpacity,
}: {
  progress: MotionValue<number>;
  chromeOpacity: MotionValue<number>;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const layout = useSlotLayout(stageRef);

  return (
    <div ref={stageRef} className="absolute inset-0 px-edge pt-22">
      <div className="relative h-full">
        <motion.div
          aria-hidden
          style={{ opacity: chromeOpacity }}
          className="absolute inset-0 rounded-t-xl border border-b-0 border-border bg-bg shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06),0_32px_80px_rgb(0_0_0/0.06)]"
        />

        <div
          role="img"
          aria-label="The Mado library: collections in a row, then saved images and videos in a grid"
          className="relative flex h-full flex-col overflow-visible"
        >
          <motion.div style={{ opacity: chromeOpacity }}>
            <WindowBar />
            <CollectionsRow />
          </motion.div>

          <div className="columns-2 gap-2.5 px-4 sm:columns-3 sm:px-6 lg:columns-4 xl:columns-5">
            {LANDING_TILES.map((tile, index) => (
              <HeroTile
                key={tile.id}
                tile={tile}
                float={FLOATS[index % FLOATS.length]}
                index={index}
                layout={layout}
                progress={progress}
              />
            ))}
          </div>
        </div>

        <motion.div
          aria-hidden
          style={{ opacity: chromeOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-bg to-transparent"
        />
      </div>
    </div>
  );
}

// *** useSlotLayout ***
// Slots are measured on the untransformed wrapper, so the moving tile never changes its own target.
type SlotLayout = {
  stage: { width: number; height: number };
  slots: Map<string, LandingRect>;
};

function useSlotLayout(stageRef: RefObject<HTMLDivElement | null>) {
  const [layout, setLayout] = useState<SlotLayout | null>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    function measure() {
      if (!stage) return;
      const stageRect = stage.getBoundingClientRect();
      const slots = new Map<string, LandingRect>();
      stage.querySelectorAll<HTMLElement>('[data-slot]').forEach((slot) => {
        const rect = slot.getBoundingClientRect();
        slots.set(slot.dataset.slot ?? '', {
          left: rect.left - stageRect.left,
          top: rect.top - stageRect.top,
          width: rect.width,
          height: rect.height,
        });
      });
      setLayout({
        stage: { width: stageRect.width, height: stageRect.height },
        slots,
      });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stageRef]);

  return layout;
}

// *** HeroTile ***
function HeroTile({
  tile,
  float,
  index,
  layout,
  progress,
}: {
  tile: LandingTile;
  float: LandingFloat;
  index: number;
  layout: SlotLayout | null;
  progress: MotionValue<number>;
}) {
  const slot = layout?.slots.get(tile.id);
  const tileTransform = useTransform(progress, (value) => {
    if (!layout || !slot) return 'none';
    // Phone slots are wide, so full-size floats would cover the title.
    const scale =
      layout.stage.width < PHONE_WIDTH ? float.scale * 0.55 : float.scale;
    const pose = tilePose(slot, layout.stage, { ...float, scale }, value);
    return `translate(${pose.x}px, ${pose.y}px) scale(${pose.scale}) rotate(${pose.rotate}deg)`;
  });

  return (
    <div
      data-slot={tile.id}
      style={{ aspectRatio: `${tile.width} / ${tile.height}` }}
      className="mb-2.5 break-inside-avoid"
    >
      <motion.div
        style={{ transform: tileTransform }}
        // Hidden until measured, so tiles don't flash in the grid before they float.
        className={cn(
          'size-full transition-opacity duration-500',
          layout ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div
          style={{ animationDelay: `${index * -0.7}s` }}
          className="size-full animate-bob motion-reduce:animate-none"
        >
          <TileMedia tile={tile} className="shadow-sm" />
        </div>
      </motion.div>
    </div>
  );
}

// *** WindowBar ***
function WindowBar() {
  return (
    <div className="flex h-11 items-center justify-between border-b border-border px-4 t-b-4">
      <div aria-hidden className="flex gap-1.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
      </div>
      <span className="text-muted-fg">Your library</span>
      <span className="w-10.5" />
    </div>
  );
}

// *** CollectionsRow ***
function CollectionsRow() {
  return (
    <div className="flex gap-3 overflow-hidden px-4 pt-5 pb-5 sm:gap-4 sm:px-6">
      {LANDING_COLLECTIONS.map((collection) => (
        <div
          key={collection.name}
          className="relative size-32 shrink-0 rounded-md border border-border sm:size-40"
        >
          <div className="absolute inset-x-0 top-0 bottom-12 flex items-center justify-center">
            <div className="relative h-14 w-18 rounded-md rounded-tl-none bg-border">
              {collection.previews.map((id, index) => (
                <img
                  key={id}
                  src={findLandingTile(id).src}
                  alt=""
                  style={{
                    rotate: `${(index - (collection.previews.length - 1) / 2) * 10}deg`,
                  }}
                  className="absolute bottom-3 left-1/2 h-12 w-9 -translate-x-1/2 rounded-sm object-cover shadow-sm"
                />
              ))}
            </div>
          </div>
          <div className="absolute inset-x-3 bottom-2.5 min-w-0">
            <p className="truncate t-l-3 sm:t-l-2">{collection.name}</p>
            <p className="t-b-4 text-muted-fg">{collection.saves} saves</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// *** HeroCopy ***
function HeroCopy({ isVeiled }: { isVeiled: boolean }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Keeps the text readable over the floating sources. */}
      <div
        aria-hidden
        className={cn(
          '-z-10',
          isVeiled
            ? 'fixed inset-0 bg-bg/85'
            : 'absolute -inset-x-24 -inset-y-20 bg-[radial-gradient(closest-side,var(--color-bg)_55%,transparent)]',
        )}
      />
      <RevealText as="h1" trigger="manual" className="t-h-1 text-balance">
        Your <Accent>local</Accent> design library.
      </RevealText>
      <RevealText
        trigger="manual"
        delay={250}
        className="mt-6 max-w-[42ch] t-b-1 text-pretty text-muted-fg"
      >
        Mado is a quiet place for what inspires you. Collect images, videos,
        sites and notes, sort them, and keep them on your device.
      </RevealText>
      <Reveal
        trigger="manual"
        delay={650}
        className="mt-10 flex items-center gap-5"
      >
        <OpenMado label="Try Mado" />
        <span className="t-b-3 text-muted-fg">Free. No sign-up.</span>
      </Reveal>
    </div>
  );
}

// *** IntroWords ***
// Outside the band, so its clip doesn't hide them. "Ma" ends and "do" starts at the center, where the window opens.
function IntroWords() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 hidden h-svh t-h-1 in-data-[landing-intro=pending]:block"
    >
      <span
        data-intro-word="left"
        className="absolute top-1/2 right-1/2 -translate-y-1/2 opacity-0"
      >
        Ma
      </span>
      <span
        data-intro-word="right"
        className="absolute top-1/2 left-1/2 -translate-y-1/2 opacity-0"
      >
        do
      </span>
    </div>
  );
}

const PHONE_WIDTH = 640;

// Fractions of the stage. They ring the title and leave its middle clear.
const FLOATS: LandingFloat[] = [
  { x: 0.08, y: 0.2, scale: 0.7, rotate: -6 },
  { x: 0.22, y: 0.12, scale: 0.55, rotate: 4 },
  { x: 0.4, y: 0.14, scale: 0.5, rotate: -3 },
  { x: 0.62, y: 0.12, scale: 0.6, rotate: 5 },
  { x: 0.8, y: 0.16, scale: 0.65, rotate: -4 },
  { x: 0.95, y: 0.3, scale: 0.6, rotate: 6 },
  { x: 0.05, y: 0.44, scale: 0.6, rotate: 3 },
  { x: 0.92, y: 0.52, scale: 0.7, rotate: -5 },
  { x: 0.12, y: 0.68, scale: 0.55, rotate: -4 },
  { x: 0.86, y: 0.78, scale: 0.6, rotate: 4 },
  { x: 0.24, y: 0.88, scale: 0.65, rotate: 6 },
  { x: 0.46, y: 0.9, scale: 0.5, rotate: -2 },
  { x: 0.66, y: 0.88, scale: 0.55, rotate: 3 },
  { x: 0.04, y: 0.9, scale: 0.5, rotate: -6 },
  { x: 0.97, y: 0.94, scale: 0.5, rotate: 5 },
  { x: 0.28, y: 0.3, scale: 0.45, rotate: -8 },
  { x: 0.74, y: 0.32, scale: 0.45, rotate: 7 },
  { x: 0.16, y: 0.5, scale: 0.4, rotate: 5 },
  { x: 0.8, y: 0.64, scale: 0.45, rotate: -6 },
  { x: 0.56, y: 0.76, scale: 0.4, rotate: -3 },
];
