import { useRef, useState } from 'react';
import { cn } from 'cn';
import { useMotionValueEvent, useScroll } from 'motion/react';

import { Reveal, RevealText } from '#/components/reveal';
import type { LandingTodayItem } from '#/features/landing/landing.type';
import { LANDING_TODAY } from '#/features/landing/landing-content';

import { TodayIcon, TodayLines } from './landing-today-lines';
import { Accent, LANDING_H2 } from './landing-ui';

/** The section pins while scrolling moves the active item down the list, and the background lines take its shape. */
export function LandingToday() {
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
    <section ref={sectionRef} className="relative h-[300svh]">
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
            'mt-0.5 text-sm text-pretty transition-colors duration-slow ease-out-quart',
            isActive ? 'text-bg/70' : 'text-muted-fg',
          )}
        >
          {item.line}
        </p>
      </div>
    </li>
  );
}
