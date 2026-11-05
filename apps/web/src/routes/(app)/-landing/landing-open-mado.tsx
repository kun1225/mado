import { useRef } from 'react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link } from '@tanstack/react-router';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';
import type { PointerEvent } from 'react';

import { cn } from '@repo/ui/cn';

import type { LandingOpenMadoProps } from '#/features/landing/landing.type';
import { LANDING_APP_HREF } from '#/features/landing/landing-content';

const SQUARE_SIZE = 28;
// Measured from the arrow's edge. Snapping in is easier than letting go, so the square doesn't flicker at the edge.
const SNAP_IN = 6;
const SNAP_OUT = 26;
// Barely under-damped: the square glides in without a visible bounce.
const SQUARE_SPRING = { stiffness: 420, damping: 30, mass: 0.7 };
const LIGHT =
  'linear-gradient(90deg, transparent, color-mix(in oklch, var(--color-accent-fg) 15%, transparent) 25%, color-mix(in oklch, var(--color-accent-fg) 15%, transparent) 75%, transparent)';

/** Every call to action on the page looks like the header's, so the page has one button. */
export function OpenMado({
  label = 'Open Mado',
  className,
}: LandingOpenMadoProps) {
  const reduceMotion = useReducedMotion();
  const chipRef = useRef<HTMLSpanElement>(null);
  const snapped = useRef(false);
  const squareLeft = useMotionValue(0);
  const squareX = useSpring(squareLeft, SQUARE_SPRING);

  function follow(e: PointerEvent<HTMLAnchorElement>, entering: boolean) {
    const chip = chipRef.current;
    if (e.pointerType !== 'mouse' || !chip) return;

    const link = e.currentTarget;
    const x = e.clientX - link.getBoundingClientRect().left;
    link.style.setProperty(
      '--light-x',
      String(clamp(x / link.offsetWidth, 0, 1)),
    );

    const chipCenter = chip.offsetLeft + chip.offsetWidth / 2;
    const gap = Math.abs(x - chipCenter) - chip.offsetWidth / 2;
    snapped.current = nextSnapped(snapped.current, gap);
    link.toggleAttribute('data-snap', snapped.current);

    const center = snapped.current
      ? chipCenter
      : clamp(x, SQUARE_SIZE / 2, link.offsetWidth - SQUARE_SIZE / 2);
    squareLeft.set(center - SQUARE_SIZE / 2);
    // On entry the square must appear under the cursor, not glide in from where it was last left.
    if (entering || reduceMotion) squareX.jump(center - SQUARE_SIZE / 2);
  }

  function release(e: PointerEvent<HTMLAnchorElement>) {
    snapped.current = false;
    e.currentTarget.removeAttribute('data-snap');
  }

  return (
    <Link
      to={LANDING_APP_HREF}
      onPointerEnter={(e) => follow(e, true)}
      onPointerMove={(e) => follow(e, false)}
      onPointerLeave={release}
      className={cn(
        'group relative isolate flex h-10 touch-manipulation items-center gap-2.5 overflow-hidden rounded-lg bg-accent pr-1.5 pl-4 t-l-2 text-accent-fg transition-[scale] duration-150 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/40 active:scale-[0.97]',
        className,
      )}
    >
      <WindowLight />
      <motion.span
        aria-hidden
        style={{ x: squareX }}
        className="pointer-events-none absolute top-1/2 left-0 -z-10 size-7 -translate-y-1/2 scale-90 rounded-sm border border-accent-fg/30 bg-accent-fg/10 opacity-0 transition-[opacity,scale] duration-[160ms] ease-out group-hover:scale-100 group-hover:opacity-100 group-hover:duration-[240ms] group-hover:ease-(--poise-ease-out-expo) motion-reduce:transition-none"
      />
      {label}
      <span ref={chipRef} className="grid size-7 place-items-center">
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={16}
          strokeWidth={1.5}
          className="transition-[scale] duration-[260ms] ease-(--poise-ease-out-expo) group-data-[snap]:scale-[1.2] motion-reduce:transition-none"
        />
      </span>
    </Link>
  );
}

// *** WindowLight ***
// Two panes of light, like a window on a gallery wall. They rest on the left and slide with the mouse's x position; the long hover transition turns every pointer update into a slow glide.
function WindowLight() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-[6%] -z-10 flex w-3/5 -translate-x-[70%] -skew-x-[18deg] gap-[3px] opacity-0 transition-[translate,opacity] duration-[240ms] ease-out group-hover:translate-x-[calc(var(--light-x,0.5)*60%_-_30%)] group-hover:opacity-100 group-hover:duration-[480ms] group-hover:ease-(--poise-ease-out-expo) motion-reduce:transition-none"
    >
      <span className="w-[62%]" style={{ background: LIGHT }} />
      <span className="w-[26%]" style={{ background: LIGHT }} />
    </span>
  );
}

// *** nextSnapped ***
function nextSnapped(wasSnapped: boolean, gap: number) {
  if (!wasSnapped) return gap < SNAP_IN;
  return gap <= SNAP_OUT;
}

// *** clamp ***
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
