import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import type { MotionValue } from 'motion/react';
import { motion, transform, useScroll, useTransform } from 'motion/react';

import {
  findLandingTile,
  LANDING_APP_HREF,
  LANDING_NAV,
} from '#/features/landing/landing-content';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

import { TileMedia } from './landing-ui';

// The intro opens "Ma | do" onto the library. The footer closes that window again, so the page ends where it began.
export function LandingFooter() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const motionValues = useFooterMotion(ref, reduced);

  return (
    <footer
      ref={ref}
      // Reduced motion has nothing to scroll through, so the end state is one screen.
      className={`relative [--win-h:96px] [--win-w:150px] sm:[--win-h:144px] sm:[--win-w:280px] ${reduced ? 'h-svh' : 'h-[220svh]'}`}
    >
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden">
        <FooterWindow
          clipPath={motionValues.clipPath}
          clusterScale={motionValues.clusterScale}
        />
        <FooterWordmark
          opacity={motionValues.lettersOpacity}
          maX={motionValues.maX}
          doX={motionValues.doX}
        />

        <motion.div
          style={{ opacity: motionValues.linksOpacity }}
          // Links fade in late, so a keyboard user who tabs to one still has to see it.
          className="relative mt-auto flex flex-wrap items-center justify-between gap-4 px-edge pb-10 t-b-3 focus-within:opacity-100!"
        >
          <FooterLinks />
          <span className="text-muted-fg">
            © 2026 Mado. Made for designers.
          </span>
        </motion.div>
      </div>
    </footer>
  );
}

// *** useFooterMotion ***
function useFooterMotion(
  ref: React.RefObject<HTMLElement | null>,
  reduced: boolean,
) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  // Pinned to the end, so reduced motion shows the finished footer without any scroll.
  const progress = useTransform(scrollYProgress, (v) => (reduced ? 1 : v));

  // Function transforms, because the range shortcut on opacity mapped the range wrong (see the spec).
  const close = useTransform(progress, transform([0.05, 0.75], [0, 1]));

  return {
    clipPath: useTransform(
      close,
      (c) =>
        `inset(calc(${c} * (50% - var(--win-h) / 2)) calc(${c} * (50% - var(--win-w) / 2)) round ${c * 16}px)`,
    ),
    clusterScale: useTransform(close, [0, 1], [1.5, 0.62]),
    lettersOpacity: useTransform(progress, transform([0.35, 0.6], [0, 1])),
    maX: useTransform(close, [0, 1], ['-30vw', '0vw']),
    doX: useTransform(close, [0, 1], ['30vw', '0vw']),
    linksOpacity: useTransform(progress, transform([0.8, 0.95], [0, 1])),
  };
}

// *** FooterWindow ***
function FooterWindow({
  clipPath,
  clusterScale,
}: {
  clipPath: MotionValue<string>;
  clusterScale: MotionValue<number>;
}) {
  return (
    <motion.div
      aria-hidden
      style={{ clipPath }}
      className="absolute inset-0 bg-muted"
    >
      <motion.div
        style={{ scale: clusterScale }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {/* The cluster is wider than a phone, so it shrinks there to keep more than two sources in the window. */}
        <div className="absolute inset-0 flex scale-[0.55] items-center justify-center sm:scale-100">
          {CLUSTER.map(({ tile, width, x, y, rotate }) => (
            <div
              key={tile.id}
              style={{
                width,
                aspectRatio: `${tile.width} / ${tile.height}`,
                translate: `${x}px ${y}px`,
                rotate: `${rotate}deg`,
              }}
              className="absolute shadow-md"
            >
              <TileMedia tile={tile} />
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// *** FooterWordmark ***
function FooterWordmark({
  opacity,
  maX,
  doX,
}: {
  opacity: MotionValue<number>;
  maX: MotionValue<string>;
  doX: MotionValue<string>;
}) {
  return (
    // Three columns around the window, so it sits in the middle even though "Ma" is wider than "do".
    <motion.div
      role="img"
      aria-label="Mado"
      style={{ opacity }}
      className="absolute inset-0 grid grid-cols-[1fr_var(--win-w)_1fr] items-center gap-[0.1em] font-accent text-[clamp(4rem,14vw,11rem)] leading-none"
    >
      <motion.span style={{ x: maX }} className="justify-self-end">
        Ma
      </motion.span>
      <span />
      <motion.span style={{ x: doX }} className="justify-self-start">
        do
      </motion.span>
    </motion.div>
  );
}

// *** FooterLinks ***
function FooterLinks() {
  return (
    <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
      <Link to={LANDING_APP_HREF} className={LINK_CLASS}>
        Library
      </Link>
      {LANDING_NAV.map((item) => (
        <a key={item.id} href={`#${item.id}`} className={LINK_CLASS}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

const LINK_CLASS =
  'rounded-xs text-muted-fg transition-colors duration-150 ease-out outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/40';

// Offsets are from the window's center, in px.
const CLUSTER = [
  { id: 'neuro-pop', width: 220, x: -230, y: -70, rotate: -4 },
  { id: 'petrichor', width: 150, x: -40, y: -40, rotate: 3 },
  { id: 'house-of-honey', width: 240, x: 170, y: -90, rotate: 2 },
  { id: 'sotd', width: 200, x: 220, y: 90, rotate: -3 },
  { id: 'cleo-y-teo', width: 200, x: -200, y: 120, rotate: 3 },
  { id: 'thiings', width: 180, x: 10, y: 140, rotate: -2 },
  { id: 'typography', width: 220, x: 40, y: -150, rotate: -1 },
].map(({ id, ...pose }) => ({ ...pose, tile: findLandingTile(id) }));
