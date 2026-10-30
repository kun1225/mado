import { useRef, useState } from 'react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { MotionValue } from 'motion/react';
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react';

import { cn } from '@repo/ui/cn';

import { Reveal, RevealText } from '#/components/reveal';
import {
  findLandingTile,
  LANDING_SEARCH_QUERIES,
  LANDING_SEARCH_TILE_IDS,
} from '#/features/landing/landing-content';
import { searchFrame, stepProgress } from '#/features/landing/landing-motion';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

import { Accent, LANDING_H2, TileMedia } from './landing-ui';
import { usePauseOffscreen } from './use-pause-offscreen';

const QUERY_COUNT = LANDING_SEARCH_QUERIES.length;
const QUERY_LENGTHS = LANDING_SEARCH_QUERIES.map((query) => query.text.length);

export function LandingSearch() {
  const sectionRef = useRef<HTMLElement>(null);
  const isSectionInView = usePauseOffscreen(sectionRef);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const { query, typed } = useScrollTyping(scrollYProgress);
  const isDone = typed === query.text;

  return (
    <section
      id="search"
      ref={sectionRef}
      data-offscreen={!isSectionInView || undefined}
      className="relative h-[300svh] scroll-mt-16"
    >
      {/* Padded under the sticky header, so the centered stage clears it. */}
      <div className="sticky top-0 flex h-svh flex-col justify-center px-edge">
        <div className="flex flex-col items-center text-center">
          <RevealText as="h2" className={LANDING_H2}>
            Find anything in <Accent>seconds</Accent>.
          </RevealText>
          <RevealText
            delay={150}
            className="mt-2 max-w-[46ch] t-b-1 text-pretty text-muted-fg"
          >
            Search by a source&apos;s name or its collection,
            <br />
            or just describe what you remember.
          </RevealText>
        </div>

        {/* On wide screens the width follows the screen height, so the pinned stage always fits. */}
        <Reveal className="mx-auto mt-4 w-full max-w-4xl md:max-w-[min(72rem,calc((100svh-120px)))]">
          <div className="rounded-xl bg-muted p-4 sm:p-6">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-bg px-4 py-3">
              <HugeiconsIcon
                icon={Search01Icon}
                size={18}
                strokeWidth={1.5}
                className="shrink-0 text-muted-fg"
              />
              <span className="min-w-0 flex-1 truncate t-b-2">
                {typed}
                <span
                  aria-hidden
                  className="ml-px inline-block h-[1.1em] w-px translate-y-[0.2em] animate-pulse bg-fg in-data-offscreen:paused motion-reduce:animate-none"
                />
              </span>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 t-l-3">
                {query.mode}
                {query.isSoon && <span className="text-muted-fg">· Soon</span>}
              </span>
            </div>

            <div aria-hidden className="mt-3 flex gap-1.5">
              {LANDING_SEARCH_QUERIES.map((item, index) => (
                <QueryBar
                  key={item.text}
                  index={index}
                  progress={scrollYProgress}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:mt-6 sm:grid-cols-4">
              {LANDING_SEARCH_TILE_IDS.map((id) => {
                const isMatch = !isDone || query.tileIds.includes(id);
                return (
                  <div
                    key={id}
                    className={cn(
                      'aspect-[4/3] overflow-hidden rounded-md transition-[opacity,scale] duration-500 ease-out',
                      isMatch ? 'opacity-100' : 'scale-[0.97] opacity-15',
                    )}
                  >
                    <TileMedia tile={findLandingTile(id)} />
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// *** useScrollTyping ***
// Reduced motion skips the typing and shows each query whole.
function useScrollTyping(progress: MotionValue<number>) {
  const prefersReducedMotion = usePrefersReducedMotion();
  // Two numbers, not one object, so frames that change nothing don't re-render.
  const [queryIndex, setQueryIndex] = useState(0);
  const [length, setLength] = useState(0);
  useMotionValueEvent(progress, 'change', (value) => {
    const frame = searchFrame(value, QUERY_LENGTHS);
    setQueryIndex(frame.index);
    setLength(frame.length);
  });
  const query = LANDING_SEARCH_QUERIES[queryIndex];

  return {
    query,
    typed: prefersReducedMotion ? query.text : query.text.slice(0, length),
  };
}

// *** QueryBar ***
function QueryBar({
  index,
  progress,
}: {
  index: number;
  progress: MotionValue<number>;
}) {
  const fill = useTransform(progress, (value) =>
    stepProgress(value, QUERY_COUNT, index),
  );

  return (
    <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-border">
      <motion.span
        style={{ scaleX: fill }}
        className="block size-full origin-left bg-fg"
      />
    </span>
  );
}
