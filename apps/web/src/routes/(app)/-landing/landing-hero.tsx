import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { MotionValue } from 'motion/react';
import {
  motion,
  transform,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import type { CSSProperties, RefObject } from 'react';

import { cn } from '@repo/ui/cn';

import { CollectionPocket } from '#/components/collection-card-pocket';
import { CollectionNewCard } from '#/components/collection-new-card';
import { Reveal, RevealText } from '#/components/reveal';
import type {
  LandingFloat,
  LandingNavItem,
  LandingRect,
  LandingTile,
} from '#/features/landing/landing.type';
import {
  findLandingTile,
  LANDING_COLLECTIONS,
  LANDING_NAV,
  LANDING_TILES,
} from '#/features/landing/landing-content';
import {
  introClusterFloat,
  mixFloat,
  pickActiveSection,
  splitIntoColumns,
  tilePose,
} from '#/features/landing/landing-motion';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

import { isLandingIntroPending, useLandingIntro } from './landing-intro';
import { Accent, OpenMado, TileMedia, Wordmark } from './landing-ui';
import { usePauseOffscreen } from './use-pause-offscreen';

// Hidden until the intro brings it in; see landing-intro.ts.
const INTRO_HIDDEN = 'in-data-[landing-intro=pending]:opacity-0';

/**
 * Two floating blocks: the logo with the section links, and "Open Mado".
 * The link for the section you are reading gets a box that slides to the next one as you scroll.
 */
export function LandingHeader({
  heroRef,
}: {
  heroRef: RefObject<HTMLElement | null>;
}) {
  const [isSolid, setIsSolid] = useState(false);
  const activeId = useActiveSection();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end end'],
  });
  // At 1 the hero stops sticking and the library starts to slide under the header.
  useMotionValueEvent(scrollYProgress, 'change', (value) =>
    setIsSolid(value >= 1),
  );

  return (
    // The bar itself takes no clicks, so the page between the two blocks stays usable.
    <header
      data-landing-header
      className={cn(
        'pointer-events-none sticky top-0 z-header flex h-16 items-center justify-between gap-4 px-edge',
        INTRO_HIDDEN,
      )}
    >
      {/* 12px outside and 4px padding, so the links inside take 8px. */}
      <div
        className={cn(
          'pointer-events-auto flex h-10 items-center gap-2 rounded-lg p-1 pl-4 backdrop-blur-md transition-[background-color] duration-200 ease-out',
          isSolid ? 'bg-bg/85' : 'bg-bg/70',
        )}
      >
        <Wordmark />
        <nav aria-label="Sections" className="ml-3 hidden items-center md:flex">
          {LANDING_NAV.map((item) => (
            <HeaderNavLink
              key={item.id}
              item={item}
              isActive={activeId === item.id}
            />
          ))}
        </nav>
      </div>
      <OpenMado className="pointer-events-auto" />
    </header>
  );
}

// *** useActiveSection ***
function useActiveSection() {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const sections = LANDING_NAV.flatMap(({ id }) => {
        const rect = document.getElementById(id)?.getBoundingClientRect();
        return rect ? [{ id, top: rect.top, bottom: rect.bottom }] : [];
      });
      // 40% down the screen, so a section counts once it fills most of the view.
      setActiveId(pickActiveSection(sections, window.innerHeight * 0.4));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return activeId;
}

// *** HeaderNavLink ***
function HeaderNavLink({
  item,
  isActive,
}: {
  item: LandingNavItem;
  isActive: boolean;
}) {
  return (
    <a
      href={`#${item.id}`}
      aria-current={isActive ? 'location' : undefined}
      className={cn(
        'relative inline-flex h-8 items-center rounded-md px-3 text-xs font-medium tracking-[0.08em] text-muted-fg uppercase transition-colors duration-150 ease-out outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/40',
        isActive && 'text-fg',
      )}
    >
      {isActive && (
        // One shared box that slides, so the move reads as going from one section to the next.
        <motion.span
          layoutId="landing-header-active"
          aria-hidden
          className="absolute inset-0 rounded-md border border-fg/20 bg-bg/60"
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
        />
      )}
      <span className="relative">{item.label}</span>
    </a>
  );
}

/**
 * Sources float behind the title. Scrolling pulls each one into its slot in the library, so the hero becomes the gallery.
 * The stage sticks for two screens of scroll, which drive the whole move.
 */
export function LandingHero({
  sectionRef,
}: {
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  // 0 holds the tiles in the intro's cluster, 1 lets them float. The intro animates it.
  const spread = useMotionValue(isLandingIntroPending() ? 0 : 1);
  useLandingIntro(sectionRef, spread);
  const isInView = usePauseOffscreen(sectionRef);
  const pointer = usePointer(isInView && !prefersReducedMotion);

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

  return (
    // Pulled under the sticky header, so the stage fills the first screen.
    <section
      ref={sectionRef}
      data-offscreen={!isInView || undefined}
      className="relative -mt-16 h-[300svh]"
    >
      <div
        data-intro-band
        className="sticky top-0 h-svh overflow-hidden in-data-[landing-intro=pending]:[clip-path:inset(calc(50%-72px)_50%_calc(50%-72px)_50%_round_16px)]"
      >
        <LibraryFrame
          progress={progress}
          spread={spread}
          pointer={pointer}
          chromeOpacity={chromeOpacity}
        />

        <motion.div
          style={{ opacity: copyOpacity, visibility: copyVisibility }}
          className="absolute inset-0 z-10 flex items-center justify-center px-edge"
        >
          <HeroCopy isVeiled={prefersReducedMotion} />
        </motion.div>
      </div>

      <IntroWords />
    </section>
  );
}

// *** usePointer ***
// The mouse as -1 to 1 from the center of the screen, on a soft spring so the floats drift after it instead of snapping.
type Pointer = { x: MotionValue<number>; y: MotionValue<number> };

function usePointer(isEnabled: boolean): Pointer {
  const x = useSpring(0, POINTER_SPRING);
  const y = useSpring(0, POINTER_SPRING);

  useEffect(() => {
    if (!isEnabled) return;
    function onMove(event: PointerEvent) {
      // Touch has no hover, and a finger drag is a scroll.
      if (event.pointerType !== 'mouse') return;
      x.set((event.clientX / window.innerWidth) * 2 - 1);
      y.set((event.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [isEnabled, x, y]);

  return { x, y };
}

// *** LibraryFrame ***
// Looks like the library but is only a picture of it. The real cards need the local store, and this one must move freely.
function LibraryFrame({
  progress,
  spread,
  pointer,
  chromeOpacity,
}: {
  progress: MotionValue<number>;
  spread: MotionValue<number>;
  pointer: Pointer;
  chromeOpacity: MotionValue<number>;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const columnCount = useColumnCount();
  const layout = useSlotLayout(stageRef, columnCount);

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

          <div className="flex items-start gap-2.5 px-4 sm:px-6">
            {splitIntoColumns(LANDING_TILES, columnCount).map((column, i) => (
              <div key={i} className="min-w-0 flex-1">
                {column.map((tile) => {
                  const index = LANDING_TILES.indexOf(tile);
                  return (
                    <HeroTile
                      key={tile.id}
                      tile={tile}
                      float={FLOATS[index % FLOATS.length]}
                      index={index}
                      layout={layout}
                      progress={progress}
                      spread={spread}
                      pointer={pointer}
                    />
                  );
                })}
              </div>
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

function useSlotLayout(
  stageRef: RefObject<HTMLDivElement | null>,
  columnCount: number,
) {
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
    // The column count moves every slot, so it must re-measure.
  }, [stageRef, columnCount]);

  return layout;
}

// *** useColumnCount ***
// Same steps as the library grid's breakpoints: 2, then 3 at sm, 4 at lg, 5 at xl.
function useColumnCount() {
  return useSyncExternalStore(
    subscribeToColumns,
    getColumnCount,
    () => MIN_COLUMNS,
  );
}

// *** subscribeToColumns ***
function subscribeToColumns(onChange: () => void) {
  const queries = COLUMN_QUERIES.map((query) => matchMedia(query));
  queries.forEach((query) => query.addEventListener('change', onChange));

  return () =>
    queries.forEach((query) => query.removeEventListener('change', onChange));
}

// *** getColumnCount ***
function getColumnCount() {
  return (
    MIN_COLUMNS +
    COLUMN_QUERIES.filter((query) => matchMedia(query).matches).length
  );
}

// *** HeroTile ***
function HeroTile({
  tile,
  float,
  index,
  layout,
  progress,
  spread,
  pointer,
}: {
  tile: LandingTile;
  float: LandingFloat;
  index: number;
  layout: SlotLayout | null;
  progress: MotionValue<number>;
  spread: MotionValue<number>;
  pointer: Pointer;
}) {
  const slot = layout?.slots.get(tile.id);
  const tileTransform = useTransform(
    [progress, spread, pointer.x, pointer.y],
    ([value, spreadValue, pointerX, pointerY]: number[]) => {
      if (!layout || !slot) return 'none';
      // Phone slots are wide, so full-size floats would cover the title.
      const scale =
        layout.stage.width < PHONE_WIDTH ? float.scale * 0.85 : float.scale;
      const cluster = introClusterFloat(
        INTRO_CLUSTER_RANKS[index],
        LANDING_TILES.length,
        layout.stage,
        slot.width,
      );
      const start = mixFloat(cluster, { ...float, scale }, spreadValue);
      const pose = tilePose(slot, layout.stage, start, value);
      // Bigger floats sit closer, so they move more. Gone by the time the grid forms, so the library stays still.
      const depth =
        -PARALLAX_PX * float.scale * spreadValue * Math.max(0, 1 - value * 2);
      const x = pose.x + pointerX * depth;
      const y = pose.y + pointerY * depth;
      return `translate(${x}px, ${y}px) scale(${pose.scale}) rotate(${pose.rotate}deg)`;
    },
  );
  // On the bob element itself, so a change restyles only it, not the whole band.
  const bob = useTransform(progress, [0, 0.3], ['10px', '0px']);

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
        <motion.div
          style={
            {
              '--bob': bob,
              animationDelay: `${index * -0.7}s`,
            } as unknown as CSSProperties
          }
          className="size-full animate-bob in-data-offscreen:[animation-play-state:paused] motion-reduce:animate-none"
        >
          {/* Eager: every tile floats on the first screen, even if its grid slot is below it. */}
          <TileMedia tile={tile} loading="eager" className="shadow-sm" />
        </motion.div>
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
  // The real cards, inert: the frame is a picture, so the new-collection button must not take focus.
  return (
    <div
      inert
      className="flex gap-4 overflow-hidden px-4 pt-5 pb-5 *:shrink-0 sm:px-6"
    >
      <CollectionNewCard />
      {LANDING_COLLECTIONS.map((collection) => (
        <div
          key={collection.name}
          className="relative size-48 rounded-md border border-border"
        >
          <div className="absolute inset-x-0 top-0 bottom-14 flex items-center justify-center">
            <CollectionPocket
              color={null}
              previews={collection.previews.map((id) => {
                const tile = findLandingTile(id);
                return {
                  id,
                  width: tile.width,
                  height: tile.height,
                  media: (
                    <img
                      src={tile.src}
                      alt=""
                      className="size-full object-cover"
                    />
                  ),
                };
              })}
            />
          </div>
          <div className="absolute inset-x-4 bottom-3 min-w-0">
            <p className="truncate t-l-2">{collection.name}</p>
            <p className="t-b-3 text-muted-fg">
              {collection.saves} {collection.saves === 1 ? 'save' : 'saves'}
            </p>
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
            : // Off during the intro, so it doesn't wash out the cluster of sources in the middle.
              'absolute -inset-x-24 -inset-y-20 bg-[radial-gradient(closest-side,var(--color-bg)_55%,transparent)] transition-opacity duration-700 in-data-[landing-intro=pending]:opacity-0',
        )}
      />
      <RevealText as="h1" trigger="manual" className="t-h-1 text-balance">
        Your <Accent>local</Accent> design library.
      </RevealText>
      <RevealText
        trigger="manual"
        delay={250}
        className="mt-4 max-w-[42ch] t-b-1 text-pretty text-muted-fg"
      >
        Mado is a quiet place for what inspires you. Collect images, videos,
        sites and notes, and keep them on your device.
      </RevealText>
      <Reveal
        trigger="manual"
        delay={650}
        className="mt-8 flex items-center gap-5"
      >
        <OpenMado label="Try Mado" />
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
const PARALLAX_PX = 40;
const POINTER_SPRING = { stiffness: 60, damping: 20, mass: 0.6 };

const MIN_COLUMNS = 2;
const COLUMN_QUERIES = [
  '(min-width: 640px)',
  '(min-width: 1024px)',
  '(min-width: 1280px)',
];

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

// Stable ranks keep the chosen collage unchanged when the grid changes columns.
const INTRO_CLUSTER_RANKS = (() => {
  const xs = LANDING_TILES.map((_, index) => FLOATS[index % FLOATS.length].x);
  const order = xs.map((_, index) => index).sort((a, b) => xs[a] - xs[b]);
  return xs.map((_, index) => order.indexOf(index));
})();
