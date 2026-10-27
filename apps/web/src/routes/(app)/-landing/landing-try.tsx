import { Link } from '@tanstack/react-router';

import { ActionDockAddSource } from '#/components/action-dock/action-dock-add-source';
import { LibraryView } from '#/components/library-view';
import { Reveal, RevealText } from '#/components/reveal';
import { StorageUnsupportedNotice } from '#/components/storage-unsupported-notice';
import { TextCarousel } from '#/components/text-carousel';
import { LANDING_STEPS } from '#/features/landing/landing-content';
import { useIsSourceStorageSupported } from '#/features/sources/hooks/source-hooks';

import { LANDING_H2 } from './landing-ui';

/** The steps roll by as a title, then the real library sits in a frame you can use. */
export function LandingTry() {
  return (
    <section className="px-edge py-32">
      <div className="flex flex-col items-center text-center">
        <h2 className="sr-only">
          How it works:{' '}
          {LANDING_STEPS.map((step) => `${step.title} (${step.status})`).join(
            ', ',
          )}
        </h2>
        <div aria-hidden className={LANDING_H2}>
          <TextCarousel
            items={LANDING_STEPS.map((step, index) => (
              <span
                key={step.title}
                className="flex items-baseline justify-center gap-4"
              >
                <span className="font-accent font-semibold text-muted-fg italic tabular-nums">
                  {index + 1}
                </span>
                {step.title}
                <span className="text-base font-normal tracking-normal text-muted-fg">
                  {step.status}
                </span>
              </span>
            ))}
          />
        </div>
        <RevealText className="mt-6 max-w-[44ch] text-lg/relaxed text-pretty text-muted-fg">
          Collecting works today, and the rest is on the way. Try it below. It
          is your real library, so what you add here is waiting when you open
          Mado.
        </RevealText>
      </div>

      <Reveal className="mt-14">
        <LibraryFrame />
      </Reveal>
    </section>
  );
}

// *** LibraryFrame ***
// The transform makes this the containing block, so the library's fixed bars stay inside the frame.
function LibraryFrame() {
  const isStorageSupported = useIsSourceStorageSupported();

  return (
    <div className="relative isolate [transform:translateZ(0)] overflow-hidden rounded-xl border border-border bg-bg shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06),0_32px_80px_rgb(0_0_0/0.06)]">
      <div className="flex h-11 items-center justify-between border-b border-border px-4 text-xs">
        <div aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <span className="text-muted-fg">Your library</span>
        <Link
          to="/library"
          className="font-medium underline-offset-4 hover:underline"
        >
          Open full library
        </Link>
      </div>

      <div className="flex h-[min(78svh,760px)] flex-col overflow-y-auto overscroll-contain px-4 pb-28 sm:px-6">
        {isStorageSupported ? <LibraryView /> : <StorageUnsupportedNotice />}
      </div>

      {isStorageSupported && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center">
          <ActionDockAddSource collectionId={null} />
        </div>
      )}
    </div>
  );
}
