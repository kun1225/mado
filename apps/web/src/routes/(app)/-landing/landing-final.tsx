import { Reveal, RevealText } from '#/components/reveal';

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
      <div className="flex items-center justify-between t-b-3">
        <Wordmark />
        <span className="text-muted-fg">Made for brand designers.</span>
      </div>
    </footer>
  );
}
