import { useEffect } from 'react';
import type { AnimationPlaybackControls } from 'motion';
import { animate } from 'motion';
import type { MotionValue } from 'motion/react';
import type { RefObject } from 'react';

import { revealWithin } from '#/components/reveal';

const SEEN_KEY = 'mado:landing-intro-seen';
const OPENING_HEIGHT = 480;
const EASE_OUT = [0.25, 1, 0.5, 1] as const;
const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const;

/**
 * Runs before first paint, so the page starts in the intro's first frame instead of flashing the end state.
 * The intro plays once per visit and never with reduced motion.
 */
export const LANDING_INTRO_SCRIPT = `try{if(!sessionStorage.getItem('${SEEN_KEY}')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.landingIntro='pending'}catch(e){}`;

/**
 * "Mado" splits into "Ma" and "do", and a window opens between them onto a cluster of sources.
 * The window grows into the hero, the sources spread to their float points, then the hero text and header come in.
 * `spread` goes from 0 (the cluster) to 1 (floating).
 */
export function useLandingIntro(
  heroRef: RefObject<HTMLElement | null>,
  spread: MotionValue<number>,
) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const root = document.documentElement;

    if (!shouldPlayIntro()) {
      delete root.dataset.landingIntro;
      spread.set(1);
      revealWithin(hero);
      return;
    }

    // A client-side visit never ran the script, so set the first frame here.
    root.dataset.landingIntro = 'pending';
    spread.set(0);
    const intro = playIntro(hero, spread);

    return () => {
      intro.stop();
      delete root.dataset.landingIntro;
    };
  }, [heroRef, spread]);
}

/** True while the first frame from `LANDING_INTRO_SCRIPT` is up, so the hero can start its tiles in the row. */
export function isLandingIntroPending() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.dataset.landingIntro === 'pending'
  );
}

// *** shouldPlayIntro ***
function shouldPlayIntro() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) === null;
  } catch {
    return false;
  }
}

// *** playIntro ***
function playIntro(hero: HTMLElement, spread: MotionValue<number>) {
  const band = hero.querySelector<HTMLElement>('[data-intro-band]');
  const left = hero.querySelector<HTMLElement>('[data-intro-word="left"]');
  const right = hero.querySelector<HTMLElement>('[data-intro-word="right"]');
  const header = document.querySelector<HTMLElement>('[data-landing-header]');
  const running: AnimationPlaybackControls[] = [];
  let stopped = false;
  // A function, because TypeScript can't see the flag change between awaits.
  const isStopped = () => stopped;

  function run(...animations: AnimationPlaybackControls[]) {
    running.push(...animations);
    return Promise.all(animations);
  }

  async function sequence() {
    if (!band || !left || !right || !header) return finish();
    // A reload can restore a scroll position, and the page is locked during the intro.
    window.scrollTo(0, 0);
    const rect = band.getBoundingClientRect();
    const { width, height } = rect;

    // The opening sits in the middle of the part of the band you can see.
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, window.innerHeight);
    const centerY = (visibleTop + visibleBottom) / 2 - rect.top;
    const top = centerY - OPENING_HEIGHT / 2;
    const bottom = height - centerY - OPENING_HEIGHT / 2;
    left.style.top = `${centerY}px`;
    right.style.top = `${centerY}px`;

    const opening = (openWidth: number) =>
      `inset(${top}px ${(width - openWidth) / 2}px ${bottom}px ${(width - openWidth) / 2}px round 16px)`;
    const openWidth = Math.min(600, width * 0.7);

    // Mado words appear
    await run(
      animate(
        left,
        { opacity: [0, 1], y: [16, 0] },
        { duration: 0.8, ease: EASE_OUT },
      ),
      animate(
        right,
        { opacity: [0, 1], y: [16, 0] },
        { duration: 0.8, ease: EASE_OUT },
      ),
    );
    if (isStopped()) return;

    // The words meet at the center, so each moves half the window's width.
    const shift = openWidth / 2 + 24;
    // Clip-path opens; Mado words split
    await run(
      animate(
        band,
        { clipPath: [opening(0), opening(openWidth)] },
        { duration: 0.8, ease: EASE_IN_OUT },
      ),
      animate(left, { x: -shift }, { duration: 0.8, ease: EASE_IN_OUT }),
      animate(right, { x: shift }, { duration: 0.8, ease: EASE_IN_OUT }),
    );
    if (isStopped()) return;

    await run(
      animate(
        band,
        { clipPath: [opening(openWidth), `inset(0px 0px 0px 0px round 0px)`] },
        { duration: 1, ease: EASE_IN_OUT, delay: 0.35 },
      ),
      animate(
        left,
        { x: -width / 2, opacity: 0 },
        { duration: 0.8, ease: EASE_IN_OUT, delay: 0.35 },
      ),
      animate(
        right,
        { x: width / 2, opacity: 0 },
        { duration: 0.8, ease: EASE_IN_OUT, delay: 0.35 },
      ),
      animate(spread, 1, { duration: 1.1, ease: EASE_IN_OUT, delay: 0.35 }),
    );
    if (isStopped()) return;

    finish();
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Storage is blocked; the intro just plays again next time.
    }
  }

  // Inline styles hold the last frame while the pending attribute is removed, so nothing flashes.
  function finish() {
    spread.set(1);
    if (header) header.style.opacity = '0';
    band?.style.removeProperty('clip-path');
    delete document.documentElement.dataset.landingIntro;
    revealWithin(hero);
    if (header) {
      // Header appears
      run(
        animate(
          header,
          { opacity: [0, 1], y: [-16, 0] },
          { duration: 0.7, ease: EASE_OUT },
        ),
      ).then(() => header.style.removeProperty('opacity'));
    }
  }

  void sequence();

  return {
    stop() {
      stopped = true;
      running.forEach((animation) => animation.stop());
      spread.set(1);
      [band, left, right, header].forEach((element) =>
        element?.removeAttribute('style'),
      );
    },
  };
}
