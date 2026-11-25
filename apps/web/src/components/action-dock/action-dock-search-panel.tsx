import { useEffect, useRef, useState } from 'react';
import { Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { motion, useIsPresent } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '@repo/ui/cn';
import { Command, CommandItem, CommandList } from '@repo/ui/command';
import { eases, springs } from '@repo/ui/motion';

import { FLOATING_SURFACE } from './action-dock-surface';

// The dock search's look and motion, without its data. Why: the landing page shows this same panel with static saves.

export const MotionCommand = motion.create(Command);

export const DOCK_WIDTH = { closed: '22rem', open: '30rem' };

export const DOCK_SPRING = springs.bouncy;

// Growing in place does not move the bar across the screen, so it is safe with reduced motion.
export const REDUCED_DOCK_WIDTH = eases.inOut;

/** The results panel that springs up out of the search bar. */
export function ActionDockSearchPanel({
  reduceMotion,
  children,
}: {
  reduceMotion: boolean | null;
  children: ReactNode;
}) {
  // An exiting panel must not take clicks, or a row could still navigate.
  const isPresent = useIsPresent();
  const list = (
    <ActionDockSearchAutoHeight reduceMotion={reduceMotion}>
      <CommandList
        onMouseDown={keepInputFocus}
        className="max-h-[min(24rem,60dvh)] p-1.5"
      >
        {children}
      </CommandList>
    </ActionDockSearchAutoHeight>
  );

  if (reduceMotion) {
    return (
      <motion.div
        inert={!isPresent}
        variants={PANEL_FADE_VARIANTS}
        initial="hidden"
        animate="shown"
        exit="hidden"
        className={cn(
          FLOATING_SURFACE,
          'absolute inset-x-0 bottom-full mb-2 rounded-2xl bg-bg',
        )}
      >
        {list}
      </motion.div>
    );
  }

  return (
    <motion.div
      inert={!isPresent}
      variants={PANEL_VARIANTS}
      initial="hidden"
      animate="shown"
      exit="hidden"
      className="absolute inset-x-0 bottom-full mb-2"
    >
      {/* Only the rows are clipped. On a clipped element's child, Chrome blurs a square box. */}
      <motion.div
        variants={PANEL_BOX_VARIANTS}
        className={cn(FLOATING_SURFACE, 'absolute bottom-0 rounded-2xl bg-bg')}
      />
      <motion.div variants={PANEL_ROWS_VARIANTS} className="relative">
        {list}
      </motion.div>
    </motion.div>
  );
}

const PANEL_VARIANTS = {
  hidden: { y: 48, transition: DOCK_SPRING },
  shown: { y: 0, transition: DOCK_SPRING },
};
const PANEL_BOX_VARIANTS = {
  hidden: { left: '25%', right: '25%', height: 32, transition: DOCK_SPRING },
  shown: { left: '0%', right: '0%', height: '100%', transition: DOCK_SPRING },
};
const PANEL_ROWS_VARIANTS = {
  hidden: {
    clipPath: 'inset(calc(100% - 32px) 25% 0% 25% round 16px)',
    transition: DOCK_SPRING,
  },
  shown: {
    clipPath: 'inset(calc(0% - 0px) 0% 0% 0% round 16px)',
    transition: DOCK_SPRING,
  },
};
const PANEL_FADE_VARIANTS = {
  hidden: { opacity: 0 },
  shown: { opacity: 1 },
};
const NO_MOTION = { duration: 0 };

// *** ActionDockSearchAutoHeight ***
// CSS cannot animate to `height: auto`, so the rows are measured and the wrapper springs to that number.
function ActionDockSearchAutoHeight({
  reduceMotion,
  children,
}: {
  reduceMotion: boolean | null;
  children: ReactNode;
}) {
  const [contentRef, height] = useElementHeight<HTMLDivElement>();

  return (
    // Rows sit at the bottom so the top edge, away from the bar, is the one that bounces.
    <motion.div
      initial={false}
      animate={{ height }}
      transition={reduceMotion ? NO_MOTION : DOCK_SPRING}
      className="flex flex-col justify-end overflow-hidden"
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}

// *** useElementHeight ***
function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize[0]?.blockSize ?? 'auto');
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
}

// *** keepInputFocus ***
// Clicking a row would blur the input, and arrow keys and Enter need the input focused.
function keepInputFocus(event: React.MouseEvent) {
  event.preventDefault();
}

// *** ActionDockSearchCollectionRow ***
/** A collection in the results. */
export function ActionDockSearchCollectionRow({
  value,
  name,
  onSelect,
}: {
  value: string;
  name: string;
  onSelect?: () => void;
}) {
  return (
    <CommandItem value={value} onSelect={onSelect}>
      <HugeiconsIcon
        icon={Folder01Icon}
        strokeWidth={1.5}
        className="text-muted-fg"
      />
      <span className="min-w-0 flex-1 truncate">{name}</span>
    </CommandItem>
  );
}

// *** ActionDockSearchSaveRow ***
/** A save in the results: a small square thumbnail and its name. */
export function ActionDockSearchSaveRow({
  value,
  name,
  thumb,
  onSelect,
}: {
  value: string;
  name: string;
  thumb: ReactNode;
  onSelect?: () => void;
}) {
  return (
    <CommandItem value={value} onSelect={onSelect}>
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-fg">
        {thumb}
      </span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
    </CommandItem>
  );
}
