import type { NewSourceInput } from '#/features/sources/source-types';

import type { LandingSeedCollection, LandingSeedSource } from './landing.type';
import { LANDING_SEED_SOURCES } from './landing-content';

const SEEDED_KEY = 'mado:landing-seeded';

/** True only the first time, so the samples are added once and never come back after the user deletes them. */
export function claimLandingSeed(): boolean {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return false;
    localStorage.setItem(SEEDED_KEY, '1');
    return true;
  } catch {
    // Without storage we can't remember the seed, so we'd add samples on every visit.
    return false;
  }
}

/** The sample images as files for the real library, each in its collection. An image that fails to download is skipped. */
export async function buildLandingSeedInputs(
  collectionIds: Record<LandingSeedCollection, string>,
): Promise<NewSourceInput[]> {
  const results = await Promise.allSettled(
    LANDING_SEED_SOURCES.map((seed) =>
      toSeedInput(seed, collectionIds[seed.collection]),
    ),
  );

  return results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );
}

// *** toSeedInput ***
async function toSeedInput(
  seed: LandingSeedSource,
  collectionId: string,
): Promise<NewSourceInput> {
  const response = await fetch(seed.src);
  if (!response.ok) throw new Error(`Could not download ${seed.name}.`);
  const blob = await response.blob();
  const extension = blob.type === 'image/png' ? 'png' : 'jpg';

  return {
    collectionId,
    file: new File([blob], `${seed.name}.${extension}`, { type: blob.type }),
    name: seed.name,
    url: seed.url,
  };
}
