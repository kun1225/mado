import { useRef, useState } from 'react';
import { Settings01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { MotionValue } from 'motion/react';
import {
  AnimatePresence,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'motion/react';

import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/cn';
import { CommandGroup, CommandInput, CommandSeparator } from '@repo/ui/command';
import { Separator } from '@repo/ui/separator';

import {
  ActionDockSearchCollectionRow,
  ActionDockSearchPanel,
  ActionDockSearchSaveRow,
  DOCK_SPRING,
  DOCK_WIDTH,
  MotionCommand,
  REDUCED_DOCK_WIDTH,
} from '#/components/action-dock/action-dock-search-panel';
import { FLOATING_BAR } from '#/components/action-dock/action-dock-surface';
import { Reveal, RevealText } from '#/components/reveal';
import type {
  LandingSearchDockProps,
  LandingSearchResultsProps,
  LandingTileMediaProps,
} from '#/features/landing/landing.type';
import {
  findLandingTile,
  LANDING_SEARCH_QUERIES,
  LANDING_SEARCH_TILE_IDS,
} from '#/features/landing/landing-content';
import { searchFrame } from '#/features/landing/landing-motion';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

import { Accent, LANDING_H2, StepBar, TileMedia } from './landing-ui';
import { usePauseOffscreen } from './use-pause-offscreen';

const QUERY_COUNT = LANDING_SEARCH_QUERIES.length;
const QUERY_LENGTHS = LANDING_SEARCH_QUERIES.map((query) => query.text.length);
const MODE_LABELS = {
  Name: 'By name',
  Collection: 'By collection',
  Describe: 'By description',
};

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
      className="relative h-[360svh] scroll-mt-16"
    >
      {/* Phones pad under the sticky header, so the title never slides beneath it. */}
      <div className="sticky top-0 flex h-svh flex-col justify-center px-edge max-md:pt-16">
        <div className="flex flex-col items-center text-center">
          <RevealText as="h2" className={LANDING_H2}>
            Find anything in <Accent>seconds</Accent>.
          </RevealText>
          <RevealText
            delay={150}
            className="mt-2 max-w-[46ch] t-b-1 text-pretty text-muted-fg max-md:t-b-2 max-md:leading-snug"
          >
            Search by a source&apos;s name or its collection,
            <br className="max-md:hidden" /> or just describe what you remember.
          </RevealText>
        </div>

        {/* On wide screens the width follows the screen height, so the pinned stage always fits. */}
        <Reveal className="mx-auto mt-4 w-full max-w-4xl md:max-w-[min(72rem,calc((100svh-120px)))]">
          <div className="relative rounded-xl bg-muted p-3 sm:p-6">
            <div className="flex items-center gap-3">
              <div aria-hidden className="flex flex-1 gap-1.5">
                {LANDING_SEARCH_QUERIES.map((item, index) => (
                  <StepBar
                    key={item.text}
                    index={index}
                    count={QUERY_COUNT}
                    progress={scrollYProgress}
                  />
                ))}
              </div>
              <span className="flex shrink-0 items-center gap-1.5 t-l-3 text-muted-fg">
                {MODE_LABELS[query.mode]}
                {query.isSoon && (
                  <span className="rounded-full bg-bg px-2 py-0.5 text-fg">
                    Soon
                  </span>
                )}
              </span>
            </div>

            {/* Room at the bottom, so the dock floats over the last row the way it floats over the library. */}
            <div className="mt-3 grid grid-cols-3 gap-1.5 pb-14 sm:mt-4 sm:grid-cols-4 sm:gap-2.5 sm:pb-16">
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

            <div className="absolute inset-x-3 bottom-3 flex justify-center sm:inset-x-6 sm:bottom-6">
              <SearchDock query={query} typed={typed} />
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

// *** SearchDock ***
/**
 * The app's own search bar and results panel, filled by the scroll instead of the keyboard.
 * Inert, because it only shows what searching looks like.
 */
function SearchDock({ query, typed }: LandingSearchDockProps) {
  const reduceMotion = useReducedMotion();
  const isOpen = typed !== '';

  return (
    <MotionCommand
      inert
      shouldFilter={false}
      label="Search demo"
      initial={false}
      animate={{ width: isOpen ? DOCK_WIDTH.open : DOCK_WIDTH.closed }}
      transition={reduceMotion ? REDUCED_DOCK_WIDTH : DOCK_SPRING}
      className="relative max-w-full min-w-0 text-left"
    >
      <AnimatePresence>
        {isOpen && (
          // Keyed by query, so the panel closes and springs open again for each new search, as in the app.
          <ActionDockSearchPanel key={query.text} reduceMotion={reduceMotion}>
            <SearchResults query={query} />
          </ActionDockSearchPanel>
        )}
      </AnimatePresence>

      <div className={cn(FLOATING_BAR, 'relative')}>
        <CommandInput value={typed} readOnly placeholder="Search" />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          className="rounded-full text-muted-fg"
        >
          <HugeiconsIcon icon={Settings01Icon} size={18} strokeWidth={1.5} />
        </Button>
      </div>
    </MotionCommand>
  );
}

// *** SearchResults ***
function SearchResults({ query }: LandingSearchResultsProps) {
  const hasCollections = query.collectionNames.length > 0;

  return (
    <>
      {hasCollections && (
        <CommandGroup heading="Collections">
          {query.collectionNames.map((name) => (
            <ActionDockSearchCollectionRow
              key={name}
              value={`collection-${name}`}
              name={name}
            />
          ))}
        </CommandGroup>
      )}

      {/* cmdk hides separators during a search unless told otherwise. */}
      {hasCollections && <CommandSeparator alwaysRender />}

      <CommandGroup heading="Saves">
        {query.tileIds.map((id) => {
          const tile = findLandingTile(id);
          return (
            <ActionDockSearchSaveRow
              key={id}
              value={`source-${id}`}
              name={tile.name}
              thumb={<ResultThumb tile={tile} />}
            />
          );
        })}
      </CommandGroup>
    </>
  );
}

// *** ResultThumb ***
// A still frame, like the app's results: a moving thumbnail this small only distracts.
function ResultThumb({ tile }: LandingTileMediaProps) {
  if (tile.kind === 'video') {
    return (
      <video
        src={tile.src}
        muted
        playsInline
        preload="metadata"
        aria-hidden
        className="size-full object-cover"
      />
    );
  }

  return (
    <img
      src={tile.src}
      alt=""
      decoding="async"
      className="size-full object-cover"
    />
  );
}
