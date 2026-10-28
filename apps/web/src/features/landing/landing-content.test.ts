import { describe, expect, it } from 'vitest';

import {
  findLandingTile,
  LANDING_COLLECTIONS,
  LANDING_SEARCH_QUERIES,
  LANDING_SEARCH_TILE_IDS,
} from './landing-content';

describe('landing content', () => {
  it('only points at tiles that exist', () => {
    const ids = [
      ...LANDING_SEARCH_TILE_IDS,
      ...LANDING_COLLECTIONS.flatMap((collection) => collection.previews),
    ];
    ids.forEach((id) => expect(() => findLandingTile(id)).not.toThrow());
  });

  it('only matches tiles the search demo shows', () => {
    LANDING_SEARCH_QUERIES.forEach((query) =>
      query.tileIds.forEach((id) =>
        expect(LANDING_SEARCH_TILE_IDS).toContain(id),
      ),
    );
  });
});
