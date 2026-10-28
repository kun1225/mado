import { Link } from '@tanstack/react-router';

import { Reveal, RevealText } from '#/components/reveal';

import { Accent, LANDING_H2, Logo, OpenMado, Wordmark } from './landing-ui';

export function LandingNoAccount() {
  return (
    <section className="flex flex-col items-center px-edge py-section text-center">
      <RevealText as="h2" className="t-h-1 text-balance">
        No sign-up. No login. <Accent>Just start.</Accent>
      </RevealText>
      <RevealText delay={200} className="mt-6 t-b-1 text-muted-fg">
        Open Mado and drop in your first save. It takes a second.
      </RevealText>
      <Reveal delay={400} className="mt-10">
        <OpenMado />
      </Reveal>
    </section>
  );
}

export function LandingFinal() {
  return (
    <section className="flex flex-col items-center px-edge py-section text-center">
      <Reveal>
        <Logo className="size-14" />
      </Reveal>
      <RevealText as="h2" delay={100} className={`mt-10 ${LANDING_H2}`}>
        Start your library <Accent>today</Accent>.
      </RevealText>
      <RevealText delay={300} className="mt-5 t-b-1 text-muted-fg">
        Free. No account. Your files stay with you.
      </RevealText>
      <Reveal delay={500} className="mt-10">
        <OpenMado />
      </Reveal>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-edge pt-10 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-6 t-b-3">
        <Wordmark />
        <nav className="flex gap-6 text-muted-fg">
          <Link to="/library" className="hover:text-fg">
            Library
          </Link>
          <a href="#roadmap" className="hover:text-fg">
            Roadmap
          </a>
          <a href="#faq" className="hover:text-fg">
            FAQ
          </a>
        </nav>
        <span className="text-muted-fg">© 2026 Mado. Made for designers.</span>
      </div>
    </footer>
  );
}
