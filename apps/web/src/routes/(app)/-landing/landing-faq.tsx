import {
  MorphAccordion,
  MorphAccordionItem,
  MorphAccordionPanel,
  MorphAccordionTrigger,
} from '@repo/ui/morph-accordion';

import { Reveal, RevealText } from '#/components/reveal';
import { LANDING_FAQ } from '#/features/landing/landing-content';

import { Accent, LANDING_H2 } from './landing-ui';

export function LandingFaq() {
  return (
    <section id="faq" className="scroll-mt-16 px-edge py-section">
      <div className="mx-auto max-w-3xl">
        <RevealText as="h2" className={LANDING_H2}>
          Good <Accent>questions</Accent>.
        </RevealText>

        <Reveal className="mt-12">
          <MorphAccordion depth>
            {LANDING_FAQ.map((item) => (
              <MorphAccordionItem key={item.question}>
                <MorphAccordionTrigger className="px-6 py-5 t-h-8">
                  {item.question}
                </MorphAccordionTrigger>
                <MorphAccordionPanel>
                  <p className="max-w-[60ch] px-2 pb-2 t-b-2 text-pretty">
                    {item.answer}
                  </p>
                </MorphAccordionPanel>
              </MorphAccordionItem>
            ))}
          </MorphAccordion>
        </Reveal>
      </div>
    </section>
  );
}
