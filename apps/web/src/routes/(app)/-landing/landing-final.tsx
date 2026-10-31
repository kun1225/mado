import { Reveal, RevealText } from '#/components/reveal';

import { Accent, LANDING_H2, Logo, OpenMado } from './landing-ui';

export function LandingNoAccount() {
  return (
    <section className="flex flex-col items-center px-edge py-section text-center">
      <RevealText as="h2" className="t-h-1 text-balance">
        No sign-up. No login.
        <br />
        <Accent>Just start.</Accent>
      </RevealText>
      <RevealText delay={200} className="mt-4 t-b-1 text-muted-fg">
        Open Mado and drop in your first save. It takes a second.
      </RevealText>
      <Reveal delay={400} className="mt-8">
        <OpenMado />
      </Reveal>
    </section>
  );
}

export function LandingFinal() {
  return (
    <section className="flex flex-col items-center px-edge py-section text-center">
      <Reveal className="flex items-center gap-3">
        <Logo className="size-10" />
        <span className="t-h-4 font-accent">Mado</span>
      </Reveal>
      <RevealText as="h2" delay={100} className={`mt-8 ${LANDING_H2}`}>
        Start your library <Accent>today</Accent>.
      </RevealText>
      <RevealText delay={300} className="mt-4 t-b-1 text-muted-fg">
        Free. No account. Your files stay with you.
      </RevealText>
      <Reveal delay={500} className="mt-8">
        <OpenMado />
      </Reveal>
    </section>
  );
}
