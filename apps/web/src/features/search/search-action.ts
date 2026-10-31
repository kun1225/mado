import type { IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';
import { z } from 'zod';

import type { Collection } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';
import { getStorageAccount } from '#/features/storage/storage-account';

import type {
  SearchIndex,
  SearchResults,
  SearchSourceText,
} from './search-type';

const MAX_COLLECTIONS = 5;
const MAX_SOURCES = 6;
const MAX_RECENT = 5;
const RECENT_STORAGE_KEY = 'mado:recent-searches';

const FUSE_OPTIONS: Omit<IFuseOptions<unknown>, 'keys'> = {
  // Lets a typo or two through without matching unrelated names.
  threshold: 0.35,
  // Save names are long titles, and the matching word often sits near the end.
  ignoreLocation: true,
};

const EMPTY_RESULTS: SearchResults = { collections: [], sources: [] };
const EMPTY_RECENT: string[] = [];

const recentSearchesSchema = z.array(z.string()).catch(EMPTY_RECENT);

/** Build once per data change, because building is slow and searching is cheap. */
export function createSearchIndex(
  collections: Collection[],
  sources: Source[],
): SearchIndex {
  return {
    collections: new Fuse(collections, { ...FUSE_OPTIONS, keys: ['name'] }),
    sources: new Fuse(sources, { ...FUSE_OPTIONS, keys: ['name'] }),
    sourceTexts: sources.map(toSourceText),
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
    sources: searchSources(index, term),
  };
}

// *** searchSources ***
// Name matches come first, so a note that only mentions the word never outranks a save named after it.
function searchSources(index: SearchIndex, term: string): Source[] {
  const byName = index.sources.search(term, { limit: MAX_SOURCES });
  const byText = searchSourceTexts(index.sourceTexts, term);
  const matches = [...byName.map(({ item }) => item), ...byText];
  const uniqueById = new Map(matches.map((source) => [source.id, source]));

  return [...uniqueById.values()].slice(0, MAX_SOURCES);
}

// *** searchSourceTexts ***
// Fuse splits a query longer than 32 characters into pieces and accepts one matching piece, so a pasted URL could match unrelated notes. A plain substring check cannot.
function searchSourceTexts(texts: SearchSourceText[], term: string): Source[] {
  const needle = term.toLowerCase();

  return texts
    .filter(({ text }) => text.includes(needle))
    .slice(0, MAX_SOURCES)
    .map(({ source }) => source);
}

// *** toSourceText ***
// A line break between the two, so a query can never run from the end of a note into the URL.
function toSourceText(source: Source): SearchSourceText {
  return {
    source,
    text: `${source.note ?? ''}\n${source.url ?? ''}`.toLowerCase(),
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
