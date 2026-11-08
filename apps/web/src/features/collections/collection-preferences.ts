import { z } from 'zod';

import { getStorageAccount } from '#/features/storage/storage-account';
import { createLocalPreference } from '#/hooks/use-local-preference';

import { COLLECTION_ICON_STYLES } from './collection-types';

const SHOW_FOLDER_SOURCES_KEY = 'mado:show-folder-sources';
// On by default, so nothing changes until someone turns it off.
export const DEFAULT_SHOW_FOLDER_SOURCES = true;

const showFolderSourcesSchema = z.boolean().catch(DEFAULT_SHOW_FOLDER_SOURCES);

// Storage can be blocked (private mode, site data off); collections still work without it.
export function readShowFolderSources(): boolean {
  try {
    return parseShowFolderSources(localStorage.getItem(getPreferenceKey()));
  } catch {
    return DEFAULT_SHOW_FOLDER_SOURCES;
  }
}

// *** getPreferenceKey ***
function getPreferenceKey() {
  const account = getStorageAccount();
  return account
    ? `${SHOW_FOLDER_SOURCES_KEY}:${account}`
    : SHOW_FOLDER_SOURCES_KEY;
}

// *** parseShowFolderSources ***
function parseShowFolderSources(raw: string | null): boolean {
  if (raw === null) return DEFAULT_SHOW_FOLDER_SOURCES;

  try {
    return showFolderSourcesSchema.parse(JSON.parse(raw));
  } catch {
    return DEFAULT_SHOW_FOLDER_SOURCES;
  }
}

export function storeShowFolderSources(value: boolean) {
  try {
    localStorage.setItem(getPreferenceKey(), JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save the folder sources setting', error);
  }
}

// Per browser, like the theme: it is about how the app looks, not about the account's data.
export const collectionIconPreference = createLocalPreference({
  key: 'mado:collection-icon',
  values: COLLECTION_ICON_STYLES,
  fallback: 'folder',
});

export { parseShowFolderSources };
