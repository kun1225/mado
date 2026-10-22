import { useSyncExternalStore } from 'react';

import {
  DEFAULT_SHOW_FOLDER_SOURCES,
  readShowFolderSources,
  storeShowFolderSources,
} from './collection-preferences';

/** The server has no storage, so it uses the default and the client fixes it after hydration. */
export function useShowFolderSources() {
  const showFolderSources = useSyncExternalStore(
    subscribe,
    readShowFolderSources,
    () => DEFAULT_SHOW_FOLDER_SOURCES,
  );

  return { showFolderSources, setShowFolderSources };
}

const listeners = new Set<() => void>();

// *** subscribe ***
function subscribe(listener: () => void) {
  listeners.add(listener);
  // So the setting updates when another tab changes it.
  window.addEventListener('storage', listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

// *** setShowFolderSources ***
function setShowFolderSources(value: boolean) {
  storeShowFolderSources(value);
  listeners.forEach((listener) => listener());
}
