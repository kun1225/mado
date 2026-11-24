import { useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import Lenis from 'lenis';
import { MotionConfig } from 'motion/react';

import { LANDING_SITE_ORIGIN } from '#/features/landing/landing-content';

import { LandingFaq } from './-landing/landing-faq';
import { LandingFeatures } from './-landing/landing-features';
import { LandingFinal, LandingNoAccount } from './-landing/landing-final';
import { LandingFooter } from './-landing/landing-footer';
import { LandingHeader } from './-landing/landing-header';
import { LandingHero } from './-landing/landing-hero';
import { LANDING_INTRO_SCRIPT } from './-landing/landing-intro';
import { LandingSearch } from './-landing/landing-search';

const TITLE = 'Mado — Your local design library';
const DESCRIPTION =
  'A quiet library for brand designers. Collect images, videos, sites and notes, sort them, and keep it all on your device. Free, no sign-up.';
const OG_IMAGE = `${LANDING_SITE_ORIGIN}/og.png`;
const OG_VIDEO = `${LANDING_SITE_ORIGIN}/og.mp4`;

export const Route = createFileRoute('/(app)/')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Mado' },
      { property: 'og:url', content: `${LANDING_SITE_ORIGIN}/` },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:image', content: OG_IMAGE },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content: 'Your local design library, with saved sources around it',
      },
      // Most apps show only the image. The video is for the few that play it, and the image stays the fallback.
      { property: 'og:video', content: OG_VIDEO },
      { property: 'og:video:type', content: 'video/mp4' },
      { property: 'og:video:width', content: '1200' },
      { property: 'og:video:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
      { name: 'twitter:image', content: OG_IMAGE },
    ],
    links: [
      // The site may be reached on other hosts, such as a workers.dev preview. Point Google at one.
      { rel: 'canonical', href: `${LANDING_SITE_ORIGIN}/` },
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
        <LandingFinal />
      </main>
      <LandingFooter />
    </MotionConfig>
  );
}
