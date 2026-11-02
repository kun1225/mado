import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLibraryStore } from './library-store';
import { indexedDbLibraryStore } from './library-store-indexeddb';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getLibraryStore', () => {
  it('uses IndexedDB on the web', () => {
    expect(getLibraryStore()).toBe(indexedDbLibraryStore);
  });

  it('uses the library folder inside the desktop app', () => {
    const library = { listSources: vi.fn() };
    vi.stubGlobal('window', { madoDesktop: { library } });

    expect(getLibraryStore()).toBe(library);
  });
});
