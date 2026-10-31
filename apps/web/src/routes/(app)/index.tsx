import { useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import Lenis from 'lenis';
import { MotionConfig } from 'motion/react';

import { LandingFaq } from './-landing/landing-faq';
import { LandingFeatures } from './-landing/landing-features';
import {
  LandingFinal,
  LandingFooter,
  LandingNoAccount,
} from './-landing/landing-final';
import { LandingHeader, LandingHero } from './-landing/landing-hero';
import { LANDING_INTRO_SCRIPT } from './-landing/landing-intro';
import { LandingRoadmap } from './-landing/landing-roadmap';
import { LandingSearch } from './-landing/landing-search';

export const Route = createFileRoute('/(app)/')({
  head: () => ({
    meta: [
      { title: 'Mado — Your local design library' },
      {
        name: 'description',
        content:
          'A quiet library for brand designers. Collect images, videos, sites and notes, sort them, and keep it all on your device. Free, no sign-up.',
      },
    ],
    links: [
      // The accent font is on the first title, so connect early to cut the swap.
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&display=swap',
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  // Shared, because the header turns solid when the hero ends.
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      autoToggle: true,
      allowNestedScroll: true,
      respectReducedMotion: true,
      stopInertiaOnNavigate: true,
    });

    return () => lenis.destroy();
  }, []);

  return (
    // "user" turns movement off with reduced motion, but keeps fades.
    <MotionConfig reducedMotion="user">
      {/* Before the hero in the HTML, so it runs before the hero paints. */}
      <script dangerouslySetInnerHTML={{ __html: LANDING_INTRO_SCRIPT }} />
      <LandingHeader heroRef={heroRef} />
      <main>
        <LandingHero sectionRef={heroRef} />
        <LandingFeatures />
        <LandingSearch />
        <LandingNoAccount />
        <LandingFaq />
        <LandingRoadmap />
        <LandingFinal />
      </main>
      <LandingFooter />
    </MotionConfig>
  );
}
