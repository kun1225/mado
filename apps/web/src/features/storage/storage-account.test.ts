import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  indexedDB = new IDBFactory();
});
afterEach(() => vi.unstubAllGlobals());

describe('account storage', () => {
  it('keeps old saves and each account in separate databases', async () => {
    const { openDatabase, toCompletion, toPromise } =
      await import('./database');
    const { setStorageAccount } = await import('./storage-account');
    const legacy = await openDatabase();
    const legacyWrite = legacy.transaction('sources', 'readwrite');
    legacyWrite.objectStore('sources').put({ id: 'legacy-save' });
    await toCompletion(legacyWrite);

    setStorageAccount('alice');
    const alice = await openDatabase();
    const aliceWrite = alice.transaction('sources', 'readwrite');
    aliceWrite.objectStore('sources').put({ id: 'alice-save' });
    await toCompletion(aliceWrite);

    setStorageAccount('bob');
    const bob = await openDatabase();
    expect(
      await toPromise(
        bob.transaction('sources').objectStore('sources').getAll(),
      ),
    ).toEqual([]);
    setStorageAccount('alice');
    expect(await openDatabase()).toBe(alice);
    expect(
      await toPromise(
        alice.transaction('sources').objectStore('sources').getAll(),
      ),
    ).toEqual([{ id: 'alice-save' }]);
    expect(
      await toPromise(
        legacy.transaction('sources').objectStore('sources').getAll(),
      ),
    ).toEqual([{ id: 'legacy-save' }]);
    legacy.close();
    alice.close();
    bob.close();
  });

  it('separates recent searches without changing old searches', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const { readStoredRecentSearches, storeRecentSearches } =
      await import('../search/search-action');
    const { setStorageAccount } = await import('./storage-account');
    storeRecentSearches(['old search']);
    setStorageAccount('alice');
    storeRecentSearches(['alice search']);
    setStorageAccount('bob');
    expect(readStoredRecentSearches()).toBeNull();
    setStorageAccount('alice');
    expect(readStoredRecentSearches()).toBe('["alice search"]');
    expect(values.get('mado:recent-searches')).toBe('["old search"]');
  });

  it('reads media from each account’s own directory', async () => {
    const media = {
      getFileHandle: vi.fn(async () => ({
        getFile: async () => new File(['bytes'], 'saved.png'),
      })),
    };
    const account = { getDirectoryHandle: vi.fn(async () => media) };
    const root = { getDirectoryHandle: vi.fn(async () => account) };
    vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } });
    const { setStorageAccount } = await import('./storage-account');
    const { readMediaFile } = await import('../sources/source-media');
    setStorageAccount('alice');
    await readMediaFile('image');
    setStorageAccount('bob');
    await readMediaFile('image');
    expect(root.getDirectoryHandle.mock.calls).toEqual([
      ['account-alice', { create: true }],
      ['account-bob', { create: true }],
    ]);
  });
});
