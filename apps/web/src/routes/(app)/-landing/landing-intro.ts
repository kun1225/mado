import { useEffect } from 'react';
import type { AnimationPlaybackControls } from 'motion';
import { animate } from 'motion';
import type { RefObject } from 'react';

import { revealWithin } from '#/components/reveal';

const SEEN_KEY = 'mado:landing-intro-seen';
const PILL_HEIGHT = 64;
const EASE_OUT = [0.25, 1, 0.5, 1] as const;
const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const;

/**
 * Runs before first paint, so the page starts in the intro's first frame instead of flashing the end state.
 * The intro plays once per visit and never with reduced motion.
 */
export const LANDING_INTRO_SCRIPT = `try{if(!sessionStorage.getItem('${SEEN_KEY}')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.landingIntro='pending'}catch(e){}`;

/** "Mado" splits into "Ma" and "do", a window opens between them and grows into the hero, then the hero text and header come in. */
export function useLandingIntro(heroRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const root = document.documentElement;

    if (!shouldPlayIntro()) {
      delete root.dataset.landingIntro;
      revealWithin(hero);
      return;
    }

    // A client-side visit never ran the script, so set the first frame here.
    root.dataset.landingIntro = 'pending';
    const intro = playIntro(hero);

    return () => {
      intro.stop();
      delete root.dataset.landingIntro;
    };
  }, [heroRef]);
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
function playIntro(hero: HTMLElement) {
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
    // The pill opens in the middle of the part of the band you can see.
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, window.innerHeight);
    const centerY = (visibleTop + visibleBottom) / 2 - rect.top;
    const top = centerY - PILL_HEIGHT / 2;
    const bottom = height - centerY - PILL_HEIGHT / 2;
    left.style.top = `${centerY}px`;
    right.style.top = `${centerY}px`;
    const pill = (openWidth: number) =>
      `inset(${top}px ${(width - openWidth) / 2}px ${bottom}px ${(width - openWidth) / 2}px round 999px)`;
    const openWidth = Math.min(280, width * 0.42);

    await run(
      animate(
        left,
        { opacity: [0, 1], y: [16, 0] },
        { duration: 0.6, ease: EASE_OUT },
      ),
      animate(
        right,
        { opacity: [0, 1], y: [16, 0] },
        { duration: 0.6, ease: EASE_OUT },
      ),
    );
    if (isStopped()) return;

    // The words meet at the center, so each moves half the window's width.
    const shift = openWidth / 2;
    await run(
      animate(
        band,
        { clipPath: [pill(0), pill(openWidth)] },
        { duration: 0.8, ease: EASE_IN_OUT },
      ),
      animate(left, { x: -shift }, { duration: 0.8, ease: EASE_IN_OUT }),
      animate(right, { x: shift }, { duration: 0.8, ease: EASE_IN_OUT }),
    );
    if (isStopped()) return;

    await run(
      animate(
        band,
        { clipPath: [pill(openWidth), `inset(0px 0px 0px 0px round 0px)`] },
        { duration: 1.1, ease: EASE_IN_OUT, delay: 0.15 },
      ),
      animate(
        left,
        { x: -width / 2, opacity: 0 },
        { duration: 0.9, ease: EASE_IN_OUT, delay: 0.15 },
      ),
      animate(
        right,
        { x: width / 2, opacity: 0 },
        { duration: 0.9, ease: EASE_IN_OUT, delay: 0.15 },
      ),
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
    if (header) header.style.opacity = '0';
    band?.style.removeProperty('clip-path');
    delete document.documentElement.dataset.landingIntro;
    revealWithin(hero);
    if (header) {
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
      [band, left, right, header].forEach((element) =>
        element?.removeAttribute('style'),
      );
    },
  };
}
