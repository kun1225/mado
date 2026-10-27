import { createFileRoute } from '@tanstack/react-router';

import { LandingFinal, LandingFooter } from './-landing/landing-final';
import { LandingHeader, LandingHero } from './-landing/landing-hero';
import { LANDING_INTRO_SCRIPT } from './-landing/landing-intro';
import { LandingRoadmap } from './-landing/landing-roadmap';
import { LandingToday } from './-landing/landing-today';
import { LandingTry } from './-landing/landing-try';

// Under (app), so the "try it" frame uses the same account and local library as /library.
export const Route = createFileRoute('/(app)/')({
  head: () => ({
    meta: [
      { title: 'Mado — Frame what you see' },
      {
        name: 'description',
        content:
          'A quiet library for brand designers. Collect images, videos, sites and notes, sort them, and keep it all on your device. Free, no sign-up.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@1,6..96,600&display=swap',
      },
      {
        // Only the one glyph the intro uses, so the whole Japanese font isn't loaded.
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@600&text=%E7%AA%93&display=swap',
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      {/* Before the hero in the HTML, so it runs before the hero paints. */}
      <script dangerouslySetInnerHTML={{ __html: LANDING_INTRO_SCRIPT }} />
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingToday />
        <LandingTry />
        <LandingRoadmap />
        <LandingFinal />
      </main>
      <LandingFooter />
    </>
  );
}
