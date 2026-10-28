import { useRef } from 'react';
import { motion, transform, useScroll, useTransform } from 'motion/react';

import { Accent } from './landing-ui';

/** One big line that fades in and out as you scroll past, so the features start on a clean screen. */
export function LandingPain() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  // A function transform, because motion's scroll-timeline shortcut for opacity mapped ranges wrong.
  const opacity = useTransform(
    scrollYProgress,
    transform([0.1, 0.3, 0.6, 0.8], [0, 1, 1, 0]),
  );
  const scale = useTransform(scrollYProgress, [0.1, 0.3], [0.96, 1]);

  return (
    <section ref={sectionRef} className="relative h-[200svh]">
      <div className="sticky top-0 flex h-svh items-center justify-center px-edge">
        <motion.h2
          style={{ opacity, scale }}
          className="max-w-[18ch] text-center t-h-1 text-balance motion-reduce:scale-100!"
        >
          Saving ideas is easy. <Accent>Finding</Accent> them again isn&apos;t.
        </motion.h2>
      </div>
    </section>
  );
}
