import { describe, expect, it } from 'vitest';

import type { Collection } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';

import {
  createSearchIndex,
  parseRecentSearches,
  pushRecentSearch,
  removeRecentSearch,
  searchLibrary,
} from './search-action';

function buildCollection(
  id: string,
  name: string,
  parentId: string | null = null,
): Collection {
  return {
    id,
    name,
    parentId,
    saveCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function buildSource(id: string, name: string): Source {
  return {
    id,
    name,
    url: null,
    note: null,
    tags: [],
    collectionIds: [],
    kind: 'image',
    fileName: `${id}.png`,
    mimeType: 'image/png',
    sizeBytes: 1024,
    width: 800,
    height: 600,
    durationSeconds: null,
    storageKey: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

const COLLECTIONS = [
  buildCollection('c1', 'Branding'),
  buildCollection('c2', 'Packaging', 'c1'),
  buildCollection('c3', 'Typography'),
];

const SOURCES = [
  buildSource(
    's1',
    'DORADO | Colombian Coffee | Branding | Product Design :: Behance',
  ),
  buildSource('s2', 'Coffee bag mockup'),
  buildSource('s3', 'Brutalist type specimen'),
];

function search(query: string) {
  return searchLibrary(createSearchIndex(COLLECTIONS, SOURCES), query);
}

function ids(items: { id: string }[]) {
  return items.map(({ id }) => id);
}

describe('searchLibrary', () => {
  it('returns nothing for a blank query', () => {
    expect(search('   ')).toEqual({ collections: [], sources: [] });
  });

  it('matches names regardless of case', () => {
    expect(ids(search('TYPOGRAPHY').collections)).toEqual(['c3']);
  });

  it('forgives a typo', () => {
    expect(ids(search('brnding').collections)).toEqual(['c1']);
  });

  it('matches a word late in a long name', () => {
    expect(ids(search('behance').sources)).toEqual(['s1']);
  });

  it('finds folders as well as top-level collections', () => {
    expect(ids(search('packaging').collections)).toEqual(['c2']);
  });

  it('puts the closest match first', () => {
    expect(ids(search('coffee bag').sources)[0]).toBe('s2');
  });

  it('ignores names that are not close', () => {
    expect(search('zebra')).toEqual({ collections: [], sources: [] });
  });

  it('caps each group', () => {
    const collections = Array.from({ length: 9 }, (_, index) =>
      buildCollection(`c${index}`, `Moodboard ${index}`),
    );
    const sources = Array.from({ length: 9 }, (_, index) =>
      buildSource(`s${index}`, `Moodboard shot ${index}`),
    );

    const results = searchLibrary(
      createSearchIndex(collections, sources),
      'moodboard',
    );

    expect(results.collections).toHaveLength(5);
    expect(results.sources).toHaveLength(6);
  });
});

describe('pushRecentSearch', () => {
  it('puts the newest query first', () => {
    expect(pushRecentSearch(['logos'], 'interface')).toEqual([
      'interface',
      'logos',
    ]);
  });

  it('trims the query', () => {
    expect(pushRecentSearch([], '  logos  ')).toEqual(['logos']);
  });

  it('moves a repeated query to the front, ignoring case', () => {
    expect(pushRecentSearch(['logos', 'Interface'], 'interface')).toEqual([
      'interface',
      'logos',
    ]);
  });

  it('keeps at most five queries', () => {
    expect(pushRecentSearch(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual([
      'f',
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('skips a blank query', () => {
    const list = ['logos'];

    expect(pushRecentSearch(list, '   ')).toBe(list);
  });
});

describe('removeRecentSearch', () => {
  it('removes only the given query', () => {
    expect(removeRecentSearch(['interface', 'logos'], 'logos')).toEqual([
      'interface',
    ]);
  });
});

describe('parseRecentSearches', () => {
  it('reads a stored list', () => {
    expect(parseRecentSearches('["interface","logos"]')).toEqual([
      'interface',
      'logos',
    ]);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(parseRecentSearches(null)).toEqual([]);
  });

  it('returns an empty list for broken JSON', () => {
    expect(parseRecentSearches('{oops')).toEqual([]);
  });

  it('returns an empty list for the wrong shape', () => {
    expect(parseRecentSearches('{"queries":[1,2]}')).toEqual([]);
  });
});
