import { getDesktopBridge } from '#/features/desktop/desktop-bridge';

import type { LibraryStore } from './library-store.type';
import { indexedDbLibraryStore } from './library-store-indexeddb';

export function getLibraryStore(): LibraryStore {
  // The desktop app has no IndexedDB library. Its records are files in the library folder.
  return getDesktopBridge()?.library ?? indexedDbLibraryStore;
}
