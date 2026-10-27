import { useLayoutEffect, useRef } from 'react';
import { cn } from 'cn';
import { motion, useMotionValue, useScroll, useTransform } from 'motion/react';

import { Reveal, RevealText } from '#/components/reveal';
import { LANDING_ROADMAP } from '#/features/landing/landing-content';

import { Accent, LANDING_H2 } from './landing-ui';

// Below this width the cards stack, so the section scrolls like any other.
const PIN_QUERY = '(min-width: 1024px)';

/** On wide screens the section pins and scrolling down slides the roadmap sideways, 1:1 with the wheel. */
export function LandingRoadmap() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const distance = useMotionValue(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const x = useTransform(() => -scrollYProgress.get() * distance.get());

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const pin = matchMedia(PIN_QUERY);
    const measure = () =>
      distance.set(
        pin.matches ? Math.max(track.scrollWidth - window.innerWidth, 0) : 0,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    pin.addEventListener('change', measure);

    return () => {
      observer.disconnect();
      pin.removeEventListener('change', measure);
    };
  }, [distance]);

  return (
    <section ref={sectionRef} className="relative lg:h-[300svh]">
      <div className="flex flex-col justify-center py-32 lg:sticky lg:top-0 lg:h-svh lg:overflow-hidden lg:py-0">
        <div className="flex items-end justify-between gap-8 px-edge">
          <RevealText as="h2" className={LANDING_H2}>
            What comes <Accent>next</Accent>.
          </RevealText>
          <div className="hidden h-px w-48 bg-border lg:block">
            <motion.div
              style={{ scaleX: scrollYProgress }}
              className="h-full origin-left bg-fg"
            />
          </div>
        </div>

        <motion.ol
          ref={trackRef}
          style={{ x }}
          className="mt-14 flex flex-col gap-4 px-edge lg:w-max lg:flex-row"
        >
          {LANDING_ROADMAP.map((item, index) => (
            <Reveal
              as="li"
              key={item.name}
              delay={index * 80}
              className={cn(
                'flex min-h-[320px] flex-col justify-between rounded-lg p-8 lg:h-[min(56svh,460px)] lg:w-[min(32vw,440px)]',
                item.isLive ? 'bg-fg text-bg' : 'bg-muted',
              )}
            >
              <div className="flex items-start justify-between">
                <span className="font-accent text-7xl/none font-semibold italic tabular-nums">
                  {item.phase}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    item.isLive ? 'bg-bg text-fg' : 'bg-bg/70 text-muted-fg',
                  )}
                >
                  {item.isLive ? 'Out now' : 'Coming'}
                </span>
              </div>
              <div>
                <p className="text-2xl font-medium tracking-[-0.02em]">
                  {item.name}
                </p>
                <p
                  className={cn(
                    'mt-2 max-w-[34ch] text-pretty',
                    item.isLive ? 'text-bg/70' : 'text-muted-fg',
                  )}
                >
                  {item.line}
                </p>
              </div>
            </Reveal>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
