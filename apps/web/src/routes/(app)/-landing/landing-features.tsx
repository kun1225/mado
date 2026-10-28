import { useRef, useState } from 'react';
import {
  ComputerIcon,
  Files01Icon,
  Folder01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { MotionValue } from 'motion/react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react';

import { cn } from '@repo/ui/cn';

import { RevealText } from '#/components/reveal';
import type { LandingFeatureDemo } from '#/features/landing/landing.type';
import { LANDING_FEATURES } from '#/features/landing/landing-content';
import {
  pickActiveStep,
  stepProgress,
} from '#/features/landing/landing-motion';

import { DemoAllTypes, DemoLocal, DemoSort } from './landing-feature-demos';
import { Accent, LANDING_H2 } from './landing-ui';

const STEP_COUNT = LANDING_FEATURES.length;

/** Steps on one side and a demo on the other. Each screen of scroll makes the next step active and fills its bar. */
export function LandingFeatures() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const [activeIndex, setActiveIndex] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (value) =>
    setActiveIndex(pickActiveStep(value, STEP_COUNT)),
  );

  return (
    <section ref={sectionRef} className="relative h-[350svh]">
      <div className="sticky top-0 grid h-svh grid-rows-[auto_1fr] content-center gap-8 px-edge py-20 md:grid-cols-2 md:grid-rows-1 md:items-center md:gap-16">
        <div className="max-md:order-2">
          <RevealText as="h2" className={LANDING_H2}>
            One <Accent>calm</Accent> place for everything you save.
          </RevealText>
          <ol className="mt-8 md:mt-14">
            {LANDING_FEATURES.map((feature, index) => (
              <FeatureStep
                key={feature.title}
                index={index}
                title={feature.title}
                line={feature.line}
                icon={STEP_ICONS[feature.demo]}
                isActive={index === activeIndex}
                progress={scrollYProgress}
              />
            ))}
          </ol>
        </div>

        <div className="relative h-[min(36svh,320px)] max-md:order-1 md:h-[min(64svh,520px)]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={LANDING_FEATURES[activeIndex].demo}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              className="absolute inset-0"
            >
              <FeatureDemo demo={LANDING_FEATURES[activeIndex].demo} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

const STEP_ICONS: Record<LandingFeatureDemo, IconSvgElement> = {
  'all-types': Files01Icon,
  sort: Folder01Icon,
  local: ComputerIcon,
};

// *** FeatureStep ***
function FeatureStep({
  index,
  title,
  line,
  icon,
  isActive,
  progress,
}: {
  index: number;
  title: string;
  line: string;
  icon: IconSvgElement;
  isActive: boolean;
  progress: MotionValue<number>;
}) {
  const fill = useTransform(progress, (value) =>
    stepProgress(value, STEP_COUNT, index),
  );

  return (
    <li
      className={cn(
        'relative border-b border-border py-4 transition-colors duration-500 md:py-6',
        isActive ? 'text-fg' : 'text-muted-fg/60',
      )}
    >
      <div className="flex items-center gap-4">
        <span className="t-l-3 tabular-nums">0{index + 1}</span>
        <HugeiconsIcon icon={icon} size={20} strokeWidth={1.5} />
        <span className="t-h-5">{title}</span>
      </div>
      {/* Phones show only the active line, so the sticky screen fits. */}
      <p
        className={cn(
          'mt-2 max-w-[44ch] pl-[4.25rem] t-b-2 text-pretty',
          !isActive && 'max-md:hidden',
          isActive && 'text-muted-fg',
        )}
      >
        {line}
      </p>
      <motion.span
        aria-hidden
        style={{ scaleX: fill }}
        className="absolute inset-x-0 -bottom-px h-px origin-left bg-fg"
      />
    </li>
  );
}

// *** FeatureDemo ***
function FeatureDemo({ demo }: { demo: LandingFeatureDemo }) {
  if (demo === 'all-types') return <DemoAllTypes />;
  if (demo === 'sort') return <DemoSort />;
  return <DemoLocal />;
}
