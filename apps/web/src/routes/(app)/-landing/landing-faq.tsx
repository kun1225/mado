import { Add01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Reveal, RevealText } from '#/components/reveal';
import { LANDING_FAQ } from '#/features/landing/landing-content';

import { Accent, LANDING_H2 } from './landing-ui';

/** Native `<details>`, so it opens with the keyboard and works before JavaScript loads. */
export function LandingFaq() {
  return (
    <section id="faq" className="scroll-mt-16 px-edge py-section">
      <div className="mx-auto max-w-3xl">
        <RevealText as="h2" className={LANDING_H2}>
          Good <Accent>questions</Accent>.
        </RevealText>

        <Reveal className="mt-12 border-t border-border">
          {LANDING_FAQ.map((item) => (
            <details
              key={item.question}
              className="group border-b border-border"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 t-h-8 [&::-webkit-details-marker]:hidden">
                {item.question}
                <HugeiconsIcon
                  icon={Add01Icon}
                  size={18}
                  strokeWidth={1.5}
                  className="shrink-0 text-muted-fg transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none"
                />
              </summary>
              <p className="max-w-[60ch] pb-6 t-b-2 text-pretty text-muted-fg">
                {item.answer}
              </p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
