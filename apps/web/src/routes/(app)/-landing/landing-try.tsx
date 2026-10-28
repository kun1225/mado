import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';

import { ActionDockAddSource } from '#/components/action-dock/action-dock-add-source';
import { LibraryView } from '#/components/library-view';
import { Reveal, RevealText } from '#/components/reveal';
import { StorageUnsupportedNotice } from '#/components/storage-unsupported-notice';
import { useCreateCollection } from '#/features/collections/collection-hooks';
import type { LandingSeedCollection } from '#/features/landing/landing.type';
import { LANDING_SEED_COLLECTIONS } from '#/features/landing/landing-content';
import {
  buildLandingSeedInputs,
  claimLandingSeed,
} from '#/features/landing/landing-seed';
import {
  useAllSources,
  useCreateSources,
  useIsSourceStorageSupported,
} from '#/features/sources/hooks/source-hooks';

import { Accent, LANDING_H2 } from './landing-ui';

/** A title, then the real library in a frame you can use. */
export function LandingTry() {
  return (
    <section className="px-edge py-section">
      <div className="flex flex-col items-center text-center">
        <RevealText as="h2" className={LANDING_H2}>
          Try it <Accent>here</Accent>.
        </RevealText>
        <RevealText
          delay={150}
          className="mt-6 max-w-[44ch] t-b-1 text-pretty text-muted-fg"
        >
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
// The body doesn't scroll, so the wheel keeps scrolling the page instead of getting stuck in the frame.
function LibraryFrame() {
  const isStorageSupported = useIsSourceStorageSupported();
  useSeedEmptyLibrary();

  return (
    <div className="relative isolate [transform:translateZ(0)] overflow-hidden rounded-xl border border-border bg-bg shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06),0_32px_80px_rgb(0_0_0/0.06)]">
      <div className="flex h-11 items-center justify-between border-b border-border px-4 t-b-4">
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

      {/* shrink-0: the collections row scrolls sideways, so the column would squash it to nothing. */}
      <div className="flex h-[min(78svh,760px)] flex-col overflow-hidden px-4 *:shrink-0 sm:px-6">
        {isStorageSupported ? <LibraryView /> : <StorageUnsupportedNotice />}
      </div>

      {/* Shows the library goes on below, in the full view. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-bg to-transparent"
      />

      {isStorageSupported && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center">
          <ActionDockAddSource collectionId={null} />
        </div>
      )}
    </div>
  );
}

// *** useSeedEmptyLibrary ***
// An empty frame doesn't show what Mado is, so a first-time visitor gets sample collections and sources they can open, sort and delete.
function useSeedEmptyLibrary() {
  const sourcesQuery = useAllSources();
  const { mutateAsync: createCollection } = useCreateCollection();
  const { mutate: createSources } = useCreateSources();
  const isEmpty = sourcesQuery.isSuccess && sourcesQuery.data.length === 0;

  useEffect(() => {
    if (!isEmpty || !claimLandingSeed()) return;

    async function seed() {
      const collectionIds: Partial<Record<LandingSeedCollection, string>> = {};
      // One at a time, so each gets a later timestamp and the list keeps this order.
      for (const name of LANDING_SEED_COLLECTIONS) {
        collectionIds[name] = (await createCollection({ name })).id;
      }
      const inputs = await buildLandingSeedInputs(
        collectionIds as Record<LandingSeedCollection, string>,
      );
      if (inputs.length > 0) createSources(inputs);
    }

    // Samples are a nice-to-have; the empty state already tells people how to add their own.
    seed().catch(() => {});
  }, [isEmpty, createCollection, createSources]);
}
