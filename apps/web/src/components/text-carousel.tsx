import { useEffect, useRef, useState } from 'react';
import { cn } from 'cn';
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from 'motion/react';
import type { ReactNode } from 'react';

const ROLL_EASE = [0.86, 0, 0.14, 1] as const;

/** Rolls through `items` one at a time, only while it is on screen. */
export function TextCarousel({
  items,
  interval = 2400,
  className,
}: {
  items: ReactNode[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '0px 0px -10% 0px' });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView || prefersReducedMotion || items.length < 2) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % items.length),
      interval,
    );

    return () => clearInterval(timer);
  }, [isInView, prefersReducedMotion, items.length, interval]);

  return (
    <div ref={ref} className={cn('relative grid overflow-hidden', className)}>
      {/* Hidden copies hold the size of the longest item, so nothing jumps. */}
      {items.map((item, itemIndex) => (
        <div
          key={itemIndex}
          aria-hidden
          className="invisible col-start-1 row-start-1"
        >
          {item}
        </div>
      ))}

      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="col-start-1 row-start-1"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{
            duration: 0.9,
            ease: ROLL_EASE,
            opacity: { duration: 0.5, ease: 'easeInOut' },
          }}
        >
          {items[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
