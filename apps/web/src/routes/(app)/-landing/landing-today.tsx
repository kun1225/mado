import { useRef, useState } from 'react';
import type { MotionValue } from 'motion/react';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';

import { cn } from '@repo/ui/cn';

import { Reveal, RevealText } from '#/components/reveal';
import type {
  LandingTodayArt,
  LandingTodayItem,
} from '#/features/landing/landing.type';
import {
  LANDING_TODAY,
  LANDING_TODAY_LINE,
} from '#/features/landing/landing-content';

import { TodayFrame, TodayIcon, TodayLines } from './landing-today-lines';
import { Accent, LANDING_H2 } from './landing-ui';

// Staggered heights and parallax speeds, so the row reads as loose cards, not a grid.
const CARD_LAYOUT = [
  { offset: 'mt-24', parallax: 160 },
  { offset: 'mt-60', parallax: 320 },
  { offset: 'mt-0', parallax: 80 },
];

/** Loose drifting cards on wide screens; phones keep the pinned list, because they have no hover. */
export function LandingToday() {
  return (
    <>
      <TodayRow />
      <TodayPinned />
    </>
  );
}

// *** TodayRow ***
// Hovering a card fills the section behind it with rings of the card's shape.
function TodayRow() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hoveredArt, setHoveredArt] = useState<LandingTodayArt | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  return (
    <section
      ref={sectionRef}
      className="relative hidden overflow-hidden px-edge py-32 md:block"
    >
      <TodayLines activeArt={hoveredArt} />
      <div className="relative flex items-end justify-between gap-8">
        <RevealText as="h2" className={LANDING_H2}>
          What works <Accent>today</Accent>.
        </RevealText>
        <RevealText
          delay={150}
          className="max-w-[32ch] text-right text-pretty text-muted-fg"
        >
          {LANDING_TODAY_LINE}
        </RevealText>
      </div>
      <ol className="relative mt-16 grid grid-cols-3 gap-[6vw] px-[6vw]">
        {LANDING_TODAY.map((item, index) => (
          <TodayCard
            key={item.title}
            item={item}
            index={index}
            scrollYProgress={scrollYProgress}
            isHovered={hoveredArt === item.art}
            onHoverChange={(isHovered) =>
              setHoveredArt(isHovered ? item.art : null)
            }
          />
        ))}
      </ol>
    </section>
  );
}

// *** TodayCard ***
function TodayCard({
  item,
  index,
  scrollYProgress,
  isHovered,
  onHoverChange,
}: {
  item: LandingTodayItem;
  index: number;
  scrollYProgress: MotionValue<number>;
  isHovered: boolean;
  onHoverChange: (isHovered: boolean) => void;
}) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { offset, parallax } = CARD_LAYOUT[index];
  const y = useTransform(scrollYProgress, [0, 1], [parallax, -parallax]);

  return (
    <Reveal as="li" delay={index * 80} className={offset}>
      <motion.div
        style={{ y: prefersReducedMotion ? 0 : y }}
        // Mouse only, so a tap on a tablet doesn't leave a card stuck in its hover state.
        onPointerEnter={(event) =>
          event.pointerType === 'mouse' && onHoverChange(true)
        }
        onPointerLeave={() => onHoverChange(false)}
        className="relative mx-auto flex aspect-[4/5] w-full max-w-64 flex-col justify-between rounded-lg bg-muted p-5"
      >
        <TodayFrame isActive={isHovered} />
        <TodayIcon art={item.art} className="size-8" />
        <div>
          <h3 className="t-h-5">{item.title}</h3>
          <p className="mt-1.5 t-b-3 text-pretty text-muted-fg">{item.line}</p>
        </div>
      </motion.div>
    </Reveal>
  );
}

// *** TodayPinned ***
// The section pins while scrolling moves the active item down the list, and the background lines take its shape.
function TodayPinned() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (progress) =>
    setActiveIndex(
      Math.min(
        LANDING_TODAY.length - 1,
        Math.floor(progress * LANDING_TODAY.length),
      ),
    ),
  );

  return (
    <section ref={sectionRef} className="relative h-[300svh] md:hidden">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden px-edge">
        <TodayLines activeArt={LANDING_TODAY[activeIndex].art} />
        <RevealText as="h2" className={cn(LANDING_H2, 'relative text-center')}>
          What works <Accent>today</Accent>.
        </RevealText>
        <Reveal
          as="ol"
          delay={150}
          className="relative mt-12 flex w-full max-w-md flex-col gap-2"
        >
          {LANDING_TODAY.map((item, index) => (
            <TodayItem
              key={item.title}
              item={item}
              isActive={index === activeIndex}
            />
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// *** TodayItem ***
function TodayItem({
  item,
  isActive,
}: {
  item: LandingTodayItem;
  isActive: boolean;
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-4 rounded-lg border p-3 pr-5 transition-colors duration-slow ease-out-quart',
        isActive ? 'border-fg bg-fg text-bg' : 'border-border bg-bg',
      )}
    >
      <span
        className={cn(
          'grid size-14 shrink-0 place-items-center rounded-md transition-colors duration-slow ease-out-quart',
          isActive ? 'bg-bg/10' : 'bg-muted',
        )}
      >
        <TodayIcon art={item.art} className="size-8" />
      </span>
      <div>
        <h3 className="font-medium">{item.title}</h3>
        <p
          className={cn(
            'mt-0.5 t-b-3 text-pretty transition-colors duration-slow ease-out-quart',
            isActive ? 'text-bg/70' : 'text-muted-fg',
          )}
        >
          {item.line}
        </p>
      </div>
    </li>
  );
}
