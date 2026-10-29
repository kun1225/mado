import { useRef, useState } from 'react';
import type { MotionValue } from 'motion/react';
import {
  AnimatePresence,
  motion,
  transform,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react';

import { cn } from '@repo/ui/cn';

import type { LandingFeatureDemo } from '#/features/landing/landing.type';
import { LANDING_FEATURES } from '#/features/landing/landing-content';
import {
  phaseProgress,
  pickActiveStep,
  stepProgress,
} from '#/features/landing/landing-motion';

import { DemoAllTypes, DemoLocal, DemoSort } from './landing-feature-demos';
import { Accent, LANDING_H2 } from './landing-ui';
import { usePauseOffscreen } from './use-pause-offscreen';

const STEP_COUNT = LANDING_FEATURES.length;

/** The scroll story in svh, from the section's top entering the screen. The stage pins at 100. */
const SECTION_SVH = 480;
const PAIN_IN = [30, 90].map(toProgress);
const CROSSFADE = [150, 230].map(toProgress);

/**
 * The pain line, then the features, on one pinned stage.
 * Why one stage: the problem fades out while the answer fades in at the same spot, so they read as one scene.
 * After the crossfade, each third of the scroll makes the next step active and fills its bar.
 */
export function LandingFeatures() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = usePauseOffscreen(sectionRef);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end end'],
  });
  // Function transforms, because motion's scroll-timeline shortcut for opacity mapped ranges wrong.
  const painOpacity = useTransform(
    scrollYProgress,
    transform([...PAIN_IN, ...CROSSFADE], [0, 1, 1, 0]),
  );
  const painScale = useTransform(scrollYProgress, PAIN_IN, [0.96, 1]);
  // Leaves upward while the features rise in, so the hand-off reads as one move.
  const painY = useTransform(scrollYProgress, CROSSFADE, [0, -24]);
  const featuresOpacity = useTransform(scrollYProgress, (value) =>
    phaseProgress(value, CROSSFADE[0], CROSSFADE[1]),
  );
  const featuresY = useTransform(featuresOpacity, [0, 1], [24, 0]);
  const stepsProgress = useTransform(scrollYProgress, (value) =>
    phaseProgress(value, CROSSFADE[1], 1),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  // The first demo mounts when the crossfade starts, so it plays while you can see it.
  const [isDemoShown, setIsDemoShown] = useState(false);
  useMotionValueEvent(scrollYProgress, 'change', (value) =>
    setIsDemoShown(value >= CROSSFADE[0]),
  );
  useMotionValueEvent(stepsProgress, 'change', (value) =>
    setActiveIndex(pickActiveStep(value, STEP_COUNT)),
  );
  const activeDemo = LANDING_FEATURES[activeIndex].demo;

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative scroll-mt-16"
      style={{ height: `${SECTION_SVH}svh` }}
    >
      <div className="sticky top-0 h-svh">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-edge">
          <motion.h2
            style={{ opacity: painOpacity, scale: painScale, y: painY }}
            className="max-w-[18ch] text-center t-h-1 text-balance motion-reduce:transform-none!"
          >
            Saving ideas is easy. <Accent>Finding</Accent> them again
            isn&apos;t.
          </motion.h2>
        </div>

        <motion.div
          style={{ opacity: featuresOpacity, y: featuresY }}
          className="grid h-full content-center gap-8 px-edge py-20 motion-reduce:transform-none! md:grid-cols-2 md:gap-x-16 md:gap-y-14"
        >
          <h2
            className={cn(
              LANDING_H2,
              'max-md:order-2 md:col-span-2 md:max-w-1/2',
            )}
          >
            One <Accent>calm</Accent> place for everything you save.
          </h2>
          <ol className="max-md:order-3">
            {LANDING_FEATURES.map((feature, index) => (
              <FeatureStep
                key={feature.title}
                index={index}
                title={feature.title}
                line={feature.line}
                isActive={index === activeIndex}
                progress={stepsProgress}
              />
            ))}
          </ol>

          {/* On wide screens the grid stretches the demo to the steps' height, so the two line up. */}
          <div className="relative h-[min(36svh,320px)] max-md:order-1 md:h-auto">
            <AnimatePresence mode="popLayout" initial={false}>
              {/* Off screen it unmounts, because the local demo loops forever. */}
              {isDemoShown && isInView && (
                <motion.div
                  key={activeDemo}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                  className="absolute inset-0"
                >
                  <FeatureDemo demo={activeDemo} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// *** FeatureStep ***
function FeatureStep({
  index,
  title,
  line,
  isActive,
  progress,
}: {
  index: number;
  title: string;
  line: string;
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
        <span className="w-6 shrink-0 t-l-3 tabular-nums">0{index + 1}</span>
        <span className="t-h-5">{title}</span>
      </div>
      {/* Only the active line shows, so the steps stay short and the eye goes to one. Grid rows animate the height. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-500 ease-out',
          isActive
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <p className="min-h-0 overflow-hidden pl-10 t-b-2 text-pretty text-muted-fg">
          <span className="block max-w-[44ch] pt-2">{line}</span>
        </p>
      </div>
      <motion.span
        aria-hidden
        style={{ scaleX: fill }}
        className="absolute inset-x-0 -bottom-px h-px origin-left bg-fg"
      />
    </li>
  );
}

// *** toProgress ***
function toProgress(svh: number) {
  return svh / SECTION_SVH;
}

// *** FeatureDemo ***
function FeatureDemo({ demo }: { demo: LandingFeatureDemo }) {
  if (demo === 'all-types') return <DemoAllTypes />;
  if (demo === 'sort') return <DemoSort />;
  return <DemoLocal />;
}
