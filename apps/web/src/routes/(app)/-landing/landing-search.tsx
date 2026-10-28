import { useEffect, useRef, useState } from 'react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useInView } from 'motion/react';

import { cn } from '@repo/ui/cn';

import { Reveal, RevealText } from '#/components/reveal';
import {
  findLandingTile,
  LANDING_SEARCH_QUERIES,
  LANDING_SEARCH_TILE_IDS,
} from '#/features/landing/landing-content';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

import { Accent, LANDING_H2, TileMedia } from './landing-ui';

const TYPE_MS = 70;
const HOLD_MS = 2400;

/** A search box types a few queries, and the sources that match stay bright. */
export function LandingSearch() {
  const demoRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(demoRef, { amount: 0.4 });
  const { query, typed } = useTypingLoop(isInView);
  const isDone = typed === query.text;

  return (
    <section className="px-edge py-section">
      <div className="flex flex-col items-center text-center">
        <RevealText as="h2" className={LANDING_H2}>
          Find anything in <Accent>seconds</Accent>.
        </RevealText>
        <RevealText
          delay={150}
          className="mt-6 max-w-[46ch] t-b-1 text-pretty text-muted-fg"
        >
          Search by a source&apos;s name or its collection. Soon, just describe
          what you remember.
        </RevealText>
      </div>

      <Reveal className="mx-auto mt-14 max-w-4xl">
        <div ref={demoRef} className="rounded-xl bg-muted p-4 sm:p-6">
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
                className="ml-px inline-block h-[1.1em] w-px translate-y-[0.2em] animate-pulse bg-fg motion-reduce:animate-none"
              />
            </span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 t-l-3">
              {query.mode}
              {query.isSoon && <span className="text-muted-fg">· Soon</span>}
            </span>
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
    </section>
  );
}

// *** useTypingLoop ***
// Runs only while the demo is on screen. Reduced motion shows the first query, typed, and stops.
function useTypingLoop(isRunning: boolean) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [queryIndex, setQueryIndex] = useState(0);
  const [length, setLength] = useState(0);
  const query = LANDING_SEARCH_QUERIES[queryIndex];

  useEffect(() => {
    if (!isRunning || prefersReducedMotion) return;
    const isTyped = length >= query.text.length;
    const timer = setTimeout(
      () => {
        if (!isTyped) return setLength(length + 1);
        setLength(0);
        setQueryIndex((queryIndex + 1) % LANDING_SEARCH_QUERIES.length);
      },
      isTyped ? HOLD_MS : TYPE_MS,
    );
    return () => clearTimeout(timer);
  }, [isRunning, prefersReducedMotion, length, query, queryIndex]);

  return {
    query,
    typed: prefersReducedMotion ? query.text : query.text.slice(0, length),
  };
}
