import { useSyncExternalStore } from 'react';

import {
  parseRecentSearches,
  pushRecentSearch,
  readStoredRecentSearches,
  removeRecentSearch,
  storeRecentSearches,
} from '../search-action';

const SERVER_RECENT_SEARCHES: string[] = [];

/**
 * The server has no storage, so it renders an empty list and the client fills
 * it in after hydration instead of mismatching the server HTML.
 */
export function useRecentSearches() {
  const queries = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_RECENT_SEARCHES,
  );

  return {
    queries,
    add: (query: string) => write(pushRecentSearch(getSnapshot(), query)),
    remove: (query: string) => write(removeRecentSearch(getSnapshot(), query)),
    clear: () => write([]),
  };
}

const listeners = new Set<() => void>();

// *** subscribe ***
function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keeps the list in step when another tab searches.
  window.addEventListener('storage', listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

let cachedRaw: string | null = null;
let cachedQueries = parseRecentSearches(null);

// *** getSnapshot ***
// useSyncExternalStore needs the same array back until the stored value changes.
function getSnapshot() {
  const raw = readStoredRecentSearches();

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedQueries = parseRecentSearches(raw);
  }

  return cachedQueries;
}

// *** write ***
function write(queries: string[]) {
  storeRecentSearches(queries);
  listeners.forEach((listener) => listener());
}
