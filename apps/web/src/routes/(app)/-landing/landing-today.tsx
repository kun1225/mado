import { useEffect, useRef, useState } from 'react';
import { cn } from 'cn';

import { RevealText } from '#/components/reveal';
import { LANDING_TODAY } from '#/features/landing/landing-content';

import { TodayArt } from './landing-today-art';
import { Accent, LANDING_H2 } from './landing-ui';

// The item crossing the middle band of the screen is the active one.
const ACTIVE_BAND = '-45% 0px -45% 0px';

/** The text scrolls past a pinned drawing; the drawing changes to match the item in the middle of the screen. */
export function LandingToday() {
  const [activeIndex, setActiveIndex] = useState(0);
  // On phones each drawing sits with its own text, so once drawn it stays drawn.
  const [furthestIndex, setFurthestIndex] = useState(0);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(index);
            setFurthestIndex((furthest) => Math.max(furthest, index));
          }
        }
      },
      { rootMargin: ACTIVE_BAND },
    );
    itemRefs.current.forEach((item) => item && observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return (
    <section className="px-edge py-32">
      <RevealText as="h2" className={LANDING_H2}>
        What works <Accent>today</Accent>.
      </RevealText>

      <div className="mt-8 grid gap-x-24 lg:mt-0 lg:grid-cols-2">
        <ol>
          {LANDING_TODAY.map((item, index) => (
            <li
              key={item.title}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              data-index={index}
              className="flex flex-col justify-center py-12 lg:min-h-[80svh] lg:py-0"
            >
              <div className="mb-8 aspect-square max-w-md rounded-lg bg-muted lg:hidden">
                <TodayArt art={item.art} isActive={index <= furthestIndex} />
              </div>
              <div
                className={cn(
                  'transition-opacity duration-slow ease-out-quart',
                  activeIndex !== index && 'lg:opacity-25',
                )}
              >
                <RevealText
                  as="h3"
                  className="text-3xl/tight font-medium tracking-[-0.02em] sm:text-4xl/tight"
                >
                  {item.title}
                </RevealText>
                <RevealText
                  delay={150}
                  className="mt-4 max-w-[38ch] text-lg/relaxed text-pretty text-muted-fg"
                >
                  {item.line}
                </RevealText>
              </div>
            </li>
          ))}
        </ol>

        <div className="hidden lg:block">
          <div className="sticky top-[calc(50svh-min(20vw,280px)+2rem)] grid aspect-square w-full max-w-[560px] rounded-lg bg-muted">
            {LANDING_TODAY.map((item, index) => (
              <TodayArt
                key={item.art}
                art={item.art}
                isActive={activeIndex === index}
                className="col-start-1 row-start-1 size-full"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
