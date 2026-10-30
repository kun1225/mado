import { Fragment, useRef, useState } from 'react';
import type { MotionValue } from 'motion/react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react';

import { cn } from '@repo/ui/cn';

import type {
  LandingFeatureDemo,
  LandingPainWordProps,
} from '#/features/landing/landing.type';
import { LANDING_FEATURES } from '#/features/landing/landing-content';
import {
  phaseProgress,
  pickActiveStep,
  stepProgress,
} from '#/features/landing/landing-motion';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

import { DemoAllTypes, DemoLocal, DemoSort } from './landing-feature-demos';
import { Accent, LANDING_H2 } from './landing-ui';
import { usePauseOffscreen } from './use-pause-offscreen';

const STEP_COUNT = LANDING_FEATURES.length;

/** The scroll story in svh, from the section's top entering the screen. The stage pins at 100. */
const SECTION_SVH = 480;
const PAIN_IN = [30, 120].map(toProgress);
const PAIN_WORDS = "Saving ideas is easy. Finding them again isn't.".split(' ');
const FEATURES_THRESHOLD = toProgress(150);
const STEPS_START = toProgress(230);
/** Where in a step a click lands: late, so the scrubbed demo shows its finished state. */
const STEP_CLICK_TARGET = 0.8;

/**
 * The pain line, then the features, on one pinned stage.
 * Why one stage: the problem fades out while the answer fades in at the same spot, so they read as one scene.
 * After the crossfade, each third of the scroll makes the next step active, fills its bar, and plays its demo.
 */
export function LandingFeatures() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = usePauseOffscreen(sectionRef);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end end'],
  });
  const stepsProgress = useTransform(scrollYProgress, (value) =>
    phaseProgress(value, STEPS_START, 1),
  );
  // The active step's own progress. The demos follow it, so they play back when you scroll back.
  const stepLocal = useTransform(stepsProgress, (value) =>
    stepProgress(value, STEP_COUNT, pickActiveStep(value, STEP_COUNT)),
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  // A threshold lets the fade finish even when the reader stops scrolling.
  const [isFeaturesShown, setIsFeaturesShown] = useState(false);
  useMotionValueEvent(scrollYProgress, 'change', (value) =>
    setIsFeaturesShown(value >= FEATURES_THRESHOLD),
  );
  useMotionValueEvent(stepsProgress, 'change', (value) =>
    setActiveIndex(pickActiveStep(value, STEP_COUNT)),
  );
  const activeDemo = LANDING_FEATURES[activeIndex].demo;

  function goToStep(index: number) {
    const section = sectionRef.current;
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const steps = (index + STEP_CLICK_TARGET) / STEP_COUNT;
    const progress = STEPS_START + steps * (1 - STEPS_START);
    window.scrollTo({
      top: top - window.innerHeight + progress * section.offsetHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }

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
            initial={false}
            animate={{
              opacity: isFeaturesShown ? 0 : 1,
              y: isFeaturesShown ? -24 : 0,
            }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
            className="max-w-[18ch] text-center t-h-1 text-balance motion-reduce:transform-none!"
          >
            {PAIN_WORDS.map((word, index) => (
              <Fragment key={word}>
                {index > 0 && ' '}
                <PainWord
                  word={word}
                  index={index}
                  progress={scrollYProgress}
                />
              </Fragment>
            ))}
          </motion.h2>
        </div>

        {/* The title sits above the steps, so the demo gets the stage's full height. */}
        <motion.div
          initial={false}
          animate={{
            opacity: isFeaturesShown ? 1 : 0,
            y: isFeaturesShown ? 0 : 24,
          }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          inert={!isFeaturesShown}
          className="grid h-full content-center items-center gap-8 px-edge motion-reduce:transform-none! md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
        >
          <div className="gap flex flex-col">
            <h2 className={LANDING_H2}>
              One <Accent>calm</Accent> place for everything you save.
            </h2>
            <ol className="mt-4">
              {LANDING_FEATURES.map((feature, index) => (
                <FeatureStep
                  key={feature.title}
                  index={index}
                  title={feature.title}
                  line={feature.line}
                  isActive={index === activeIndex}
                  progress={stepsProgress}
                  onSelect={() => goToStep(index)}
                />
              ))}
            </ol>
          </div>

          <div className="relative h-[min(44svh,380px)] md:h-[min(70svh,680px)]">
            <AnimatePresence mode="popLayout" initial={false}>
              {/* Off screen it unmounts, because the local demo loops forever. */}
              {isFeaturesShown && isInView && (
                <motion.div
                  key={activeDemo}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                  className="absolute inset-0"
                >
                  <FeatureDemo demo={activeDemo} progress={stepLocal} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// *** PainWord ***
function PainWord({ word, index, progress }: LandingPainWordProps) {
  // Overlapping ranges keep the words flowing while the reader controls the pace.
  const start =
    PAIN_IN[0] + (index / (PAIN_WORDS.length + 1)) * (PAIN_IN[1] - PAIN_IN[0]);
  const end = start + (2 / (PAIN_WORDS.length + 1)) * (PAIN_IN[1] - PAIN_IN[0]);
  const reveal = useTransform(progress, (value) =>
    phaseProgress(value, start, end),
  );
  const opacity = useTransform(reveal, (value) => value);
  const y = useTransform(reveal, (value) => (1 - value) * 12);
  const filter = useTransform(reveal, (value) => `blur(${(1 - value) * 6}px)`);

  return (
    <motion.span
      style={{ opacity, y, filter }}
      className="inline-block motion-reduce:transform-none! motion-reduce:filter-none!"
    >
      {word === 'Finding' ? <Accent>{word}</Accent> : word}
    </motion.span>
  );
}

// *** FeatureStep ***
function FeatureStep({
  index,
  title,
  line,
  isActive,
  progress,
  onSelect,
}: {
  index: number;
  title: string;
  line: string;
  isActive: boolean;
  progress: MotionValue<number>;
  onSelect: () => void;
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
      {/* A button, so a reader can jump to a step instead of scrolling to it. */}
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? 'step' : undefined}
        className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-4 rounded-md px-2 text-left transition-colors duration-150 outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/40"
      >
        <span className="w-6 shrink-0 t-l-3 tabular-nums">0{index + 1}</span>
        <span className="t-h-5">{title}</span>
      </button>
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
function FeatureDemo({
  demo,
  progress,
}: {
  demo: LandingFeatureDemo;
  progress: MotionValue<number>;
}) {
  if (demo === 'all-types') return <DemoAllTypes progress={progress} />;
  if (demo === 'sort') return <DemoSort progress={progress} />;
  return <DemoLocal progress={progress} />;
}
