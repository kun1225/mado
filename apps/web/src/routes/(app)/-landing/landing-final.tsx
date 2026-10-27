import { Reveal, RevealText } from '#/components/reveal';
import { LANDING_GALLERY_CREDITS } from '#/features/landing/landing-content';

import { Accent, LANDING_H2, Logo, OpenMado, Wordmark } from './landing-ui';

export function LandingFinal() {
  return (
    <section className="flex flex-col items-center px-edge py-40 text-center">
      <Reveal>
        <Logo className="size-14" />
      </Reveal>
      <RevealText as="h2" delay={100} className={`mt-10 ${LANDING_H2}`}>
        Your library is <Accent>one click</Accent> away.
      </RevealText>
      <RevealText delay={300} className="mt-5 text-lg text-muted-fg">
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
    <footer className="flex flex-col gap-6 border-t border-border px-edge pt-10 pb-16">
      <div className="flex items-center justify-between text-sm">
        <Wordmark />
        <span className="text-muted-fg">Made for brand designers.</span>
      </div>
      <p className="max-w-prose text-xs text-pretty text-muted-fg">
        {LANDING_GALLERY_CREDITS}
      </p>
    </footer>
  );
}
