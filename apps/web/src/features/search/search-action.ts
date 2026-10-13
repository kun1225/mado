import type { IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';
import { z } from 'zod';

import type { Collection } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';
import { getStorageAccount } from '#/features/storage/storage-account';

import type { SearchIndex, SearchResults } from './search-type';

const MAX_COLLECTIONS = 5;
const MAX_SOURCES = 6;
const MAX_RECENT = 5;
const RECENT_STORAGE_KEY = 'mado:recent-searches';

const FUSE_OPTIONS: IFuseOptions<{ name: string }> = {
  keys: ['name'],
  // Lets a typo or two through without matching unrelated names.
  threshold: 0.35,
  // Save names are long titles, and the matching word often sits near the end.
  ignoreLocation: true,
};

const EMPTY_RESULTS: SearchResults = { collections: [], sources: [] };
const EMPTY_RECENT: string[] = [];

const recentSearchesSchema = z.array(z.string()).catch(EMPTY_RECENT);

/** Build once per data change; searching the index is the cheap part. */
export function createSearchIndex(
  collections: Collection[],
  sources: Source[],
): SearchIndex {
  return {
    collections: new Fuse(collections, FUSE_OPTIONS),
    sources: new Fuse(sources, FUSE_OPTIONS),
  };
}

export function searchLibrary(
  index: SearchIndex,
  query: string,
): SearchResults {
  const term = query.trim();

  if (term === '') return EMPTY_RESULTS;

  return {
    collections: index.collections
      .search(term, { limit: MAX_COLLECTIONS })
      .map(({ item }) => item),
    sources: index.sources
      .search(term, { limit: MAX_SOURCES })
      .map(({ item }) => item),
  };
}

// Storage can be blocked (private mode, site data off); search still works without it.
export function readStoredRecentSearches() {
  try {
    return localStorage.getItem(getRecentStorageKey());
  } catch {
    return null;
  }
}

// *** getRecentStorageKey ***
function getRecentStorageKey() {
  const account = getStorageAccount();
  return account ? `${RECENT_STORAGE_KEY}:${account}` : RECENT_STORAGE_KEY;
}

export function storeRecentSearches(queries: string[]) {
  try {
    localStorage.setItem(getRecentStorageKey(), JSON.stringify(queries));
  } catch (error) {
    console.error('Failed to save recent searches', error);
  }
}

export function pushRecentSearch(queries: string[], query: string) {
  const trimmed = query.trim();

  if (trimmed === '') return queries;

  const key = trimmed.toLowerCase();

  return [
    trimmed,
    ...queries.filter((existing) => existing.toLowerCase() !== key),
  ].slice(0, MAX_RECENT);
}

export function removeRecentSearch(queries: string[], query: string) {
  return queries.filter((existing) => existing !== query);
}

export function parseRecentSearches(raw: string | null) {
  if (raw === null) return EMPTY_RECENT;

  try {
    return recentSearchesSchema.parse(JSON.parse(raw));
  } catch {
    return EMPTY_RECENT;
  }
}
