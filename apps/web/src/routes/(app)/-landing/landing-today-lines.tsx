import { useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';

import { cn } from '@repo/ui/cn';

import type { LandingTodayArt } from '#/features/landing/landing.type';

const ARTS: LandingTodayArt[] = ['device', 'open', 'sort'];
// Few rings, spaced wide, so the outer one still passes the corners of a wide screen.
const RING_SIZES = Array.from({ length: 5 }, (_, ring) => 150 * 1.55 ** ring);
const EASE_IN_OUT = 'cubic-bezier(0.76, 0, 0.24, 1)';

/** Thin rings of the active item's shape fill the section; each new shape draws from the middle out. */
export function TodayLines({
  activeArt,
}: {
  activeArt: LandingTodayArt | null;
}) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <svg
      aria-hidden
      viewBox="-800 -500 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      strokeLinejoin="round"
      className="pointer-events-none absolute inset-0 size-full fill-none stroke-fg/15"
    >
      {ARTS.map((art) =>
        RING_SIZES.map((size, ring) => (
          <path
            key={`${art}-${ring}`}
            d={SHAPES[art](size)}
            pathLength={1}
            strokeDasharray={1}
            style={ringStyle(art === activeArt, ring, prefersReducedMotion)}
          />
        )),
      )}
    </svg>
  );
}

/** The same shape, small, as the card's icon. */
export function TodayIcon({
  art,
  className,
}: {
  art: LandingTodayArt;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="-60 -60 120 120"
      strokeLinejoin="round"
      strokeWidth={4}
      className={cn('fill-none stroke-current', className)}
    >
      <path d={SHAPES[art](52)} />
    </svg>
  );
}

/** A hairline frame that draws itself around a hovered card, 8px outside it. */
export function TodayFrame({ isActive }: { isActive: boolean }) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -inset-2 size-[calc(100%+1rem)] overflow-visible fill-none stroke-fg"
    >
      <rect
        x="0.5"
        y="0.5"
        // The card's 12px radius plus the 8px gap, so the corners stay concentric.
        rx="20"
        pathLength={1}
        strokeDasharray={1}
        style={{
          width: 'calc(100% - 1px)',
          height: 'calc(100% - 1px)',
          ...frameStyle(isActive, prefersReducedMotion),
        }}
      />
    </svg>
  );
}

// *** ringStyle ***
// Leaving fades out first and resets the stroke after, so the old shape doesn't vanish in one frame.
function ringStyle(
  isActive: boolean,
  ring: number,
  prefersReducedMotion: boolean,
): CSSProperties {
  if (prefersReducedMotion) {
    return {
      strokeDashoffset: 0,
      opacity: isActive ? 1 : 0,
      transition: 'opacity 300ms',
    };
  }

  const delay = ring * 80;
  return isActive
    ? {
        strokeDashoffset: 0,
        opacity: 1,
        transition: `opacity 300ms ${delay}ms, stroke-dashoffset 1400ms ${EASE_IN_OUT} ${delay}ms`,
      }
    : {
        strokeDashoffset: 1,
        opacity: 0,
        transition: 'opacity 400ms, stroke-dashoffset 0s 400ms',
      };
}

// *** frameStyle ***
// Faster than the rings, because it answers the mouse directly.
function frameStyle(
  isActive: boolean,
  prefersReducedMotion: boolean,
): CSSProperties {
  if (prefersReducedMotion) {
    return {
      strokeDashoffset: 0,
      opacity: isActive ? 1 : 0,
      transition: 'opacity 200ms',
    };
  }

  return isActive
    ? {
        strokeDashoffset: 0,
        opacity: 1,
        transition: `opacity 150ms, stroke-dashoffset 900ms ${EASE_IN_OUT}`,
      }
    : {
        strokeDashoffset: 1,
        opacity: 0,
        transition: 'opacity 250ms, stroke-dashoffset 0s 250ms',
      };
}

// *** SHAPES ***
// Each draws around the center at half-size `s`.
const SHAPES: Record<LandingTodayArt, (s: number) => string> = {
  // The logo's rounded frame: your files stay inside.
  device: (s) => roundedRect(-s, -s, s * 2, s * 2, s * 0.25),
  // An arched window, 窓: open it and come in.
  open: (s) => {
    const half = s * 0.72;
    return `M${-half} ${s} V${-s + half} A${half} ${half} 0 0 1 ${half} ${-s + half} V${s} Z`;
  },
  // A folder with a tab: drop things in and sort them.
  sort: (s) => {
    const half = s * 1.15;
    const tabEnd = -half + half * 0.8;
    const tab = s * 0.16;
    return `M${-half} ${s * 0.8} V${-s * 0.8} H${tabEnd} L${tabEnd + tab} ${-s * 0.8 + tab} H${half} V${s * 0.8} Z`;
  },
};

// *** roundedRect ***
function roundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const right = x + width;
  const bottom = y + height;

  return `M${x + radius} ${y} H${right - radius} A${radius} ${radius} 0 0 1 ${right} ${y + radius} V${bottom - radius} A${radius} ${radius} 0 0 1 ${right - radius} ${bottom} H${x + radius} A${radius} ${radius} 0 0 1 ${x} ${bottom - radius} V${y + radius} A${radius} ${radius} 0 0 1 ${x + radius} ${y} Z`;
}
