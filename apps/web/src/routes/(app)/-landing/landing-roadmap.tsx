import { cn } from '@repo/ui/cn';

import { Reveal, RevealText } from '#/components/reveal';
import { ScrollFade } from '#/components/scroll-fade';
import { LANDING_ROADMAP } from '#/features/landing/landing-content';

import { Accent, LANDING_H2 } from './landing-ui';

/** The roadmap as a row of cards you scroll sideways. The edges fade where there is more to see. */
export function LandingRoadmap() {
  return (
    <section className="py-32">
      <RevealText as="h2" className={cn(LANDING_H2, 'px-edge')}>
        What comes <Accent>next</Accent>.
      </RevealText>

      <ScrollFade className="mt-14" contentClassName="px-edge">
        <ol className="flex gap-4">
          {LANDING_ROADMAP.map((item, index) => (
            <Reveal
              as="li"
              key={item.name}
              delay={index * 80}
              className={cn(
                'flex h-[min(56svh,460px)] min-h-[320px] w-[min(80vw,400px)] shrink-0 flex-col justify-between rounded-lg p-8',
                item.isLive ? 'bg-fg text-bg' : 'bg-muted',
              )}
            >
              <div className="flex items-start justify-between">
                <span className="t-h-3 tabular-nums">{item.phase}</span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 t-l-3',
                    item.isLive ? 'bg-bg text-fg' : 'bg-bg/70 text-muted-fg',
                  )}
                >
                  {item.isLive ? 'Out now' : 'Coming'}
                </span>
              </div>
              <div>
                <p className="t-h-5">{item.name}</p>
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
        </ol>
      </ScrollFade>
    </section>
  );
}
