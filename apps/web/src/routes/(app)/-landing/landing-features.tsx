import { Fragment, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react';

import { cn } from '@repo/ui/cn';

import type {
  LandingFeatureDemoProps,
  LandingFeatureStepMobileProps,
  LandingFeatureStepProps,
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
import { Accent, LANDING_H2, StepBar } from './landing-ui';
import { usePauseOffscreen } from './use-pause-offscreen';

const STEP_COUNT = LANDING_FEATURES.length;
const FEATURE_DEMOS = {
  'all-types': DemoAllTypes,
  sort: DemoSort,
  local: DemoLocal,
};
const FADE_TRANSITION = {
  duration: 0.4,
  ease: [0.25, 1, 0.5, 1],
} as const;

const SECTION_SVH = 480;
const PAIN_IN = [30 / SECTION_SVH, 120 / SECTION_SVH];
const PAIN_WORDS = "Saving ideas is easy. Finding them again isn't.".split(' ');
const FEATURES_THRESHOLD = 150 / SECTION_SVH;
const STEPS_START = 230 / SECTION_SVH;
// A click lands late so the demo shows its finished state.
const STEP_CLICK_TARGET = 0.8;

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
            transition={FADE_TRANSITION}
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
          transition={FADE_TRANSITION}
          inert={!isFeaturesShown}
          className="grid h-full content-center items-center gap-8 px-edge motion-reduce:transform-none! max-md:gap-5 max-md:pt-14 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
        >
          <div className="flex flex-col gap-4">
            {/* Smaller on phones, so the title, the step and the demo fit one screen under the header. */}
            <h2
              className={cn(
                LANDING_H2,
                'max-md:text-[2rem] max-md:leading-[1.1]',
              )}
            >
              One <Accent>calm</Accent> place for everything you save.
            </h2>
            {/* Phones show only the active step, so the stage fits one screen. */}
            <FeatureStepMobile
              index={activeIndex}
              progress={stepsProgress}
              prefersReducedMotion={prefersReducedMotion}
            />
            <ol className="mt-4 max-md:hidden">
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
              {isFeaturesShown && isInView && (
                <motion.div
                  key={activeDemo}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={FADE_TRANSITION}
                  className="absolute inset-0"
                >
                  <FeatureDemo
                    demo={activeDemo}
                    index={activeIndex}
                    stepsProgress={stepsProgress}
                  />
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
  const y = useTransform(reveal, (value) => (1 - value) * 12);
  const filter = useTransform(reveal, (value) => `blur(${(1 - value) * 6}px)`);

  return (
    <motion.span
      style={{ opacity: reveal, y, filter }}
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
}: LandingFeatureStepProps) {
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

// *** FeatureStepMobile ***
function FeatureStepMobile({
  index,
  progress,
  prefersReducedMotion,
}: LandingFeatureStepMobileProps) {
  const feature = LANDING_FEATURES[index];
  const blur = prefersReducedMotion ? 'blur(0px)' : 'blur(6px)';

  return (
    <div className="mt-3 md:hidden">
      <div aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0, filter: blur }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: blur }}
            transition={MOBILE_STEP_TRANSITION}
          >
            <p className="flex items-baseline gap-3">
              <span className="w-6 shrink-0 t-l-3 tabular-nums">
                0{index + 1}
              </span>
              <span className="t-h-5 text-xl leading-snug">
                {feature.title}
              </span>
            </p>
            <p className="mt-1 pl-9 t-b-3 text-pretty text-muted-fg">
              {feature.line}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div aria-hidden className="mt-3 flex gap-1.5">
        {LANDING_FEATURES.map((item, barIndex) => (
          <StepBar
            key={item.title}
            index={barIndex}
            count={STEP_COUNT}
            progress={progress}
          />
        ))}
      </div>
    </div>
  );
}

// Waits for the old step to leave, so two lines never overlap. Short, because it plays twice.
const MOBILE_STEP_TRANSITION = {
  duration: 0.25,
  ease: [0.25, 1, 0.5, 1],
} as const;

// *** FeatureDemo ***
/**
 * Each demo follows its own step's progress, clamped to 0 to 1, so they play back when you scroll back.
 * Why not one progress for the active step: a demo takes 0.4s to fade out, and a shared value jumps to the
 * next step's edge (the finished state going back, the start going forward), so the leaving demo flashed it.
 */
function FeatureDemo({ demo, index, stepsProgress }: LandingFeatureDemoProps) {
  const progress = useTransform(stepsProgress, (value) =>
    stepProgress(value, STEP_COUNT, index),
  );

  const Demo = FEATURE_DEMOS[demo];
  return <Demo progress={progress} />;
}
